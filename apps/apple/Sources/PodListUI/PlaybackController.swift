import Foundation
import Observation
import PodListDomain
import PodListData

public struct PlaybackDisplay: Sendable {
    public var episodeID: String, playlistID: String, title: String, podcast: String
    public var position: Double, duration: Double?, speed: Double
    public var playing: Bool, buffering: Bool
    public var chapters: [Chapter]
    public var artwork: URL?
    public var sleep: SleepTimer?
    public var chapterIndex: Int? { PlaybackPolicy.chapterIndex(chapters, position: position) }
    public var chapter: Chapter? { chapterIndex.map { chapters[$0] } }
}

/// One serialized event stream covers audio, State refreshes, commands and lifecycle flushes.
/// Accounting advances only after recordAll commits, so failed writes retain the listening tail.
@MainActor @Observable
public final class PlaybackController {
    public private(set) var display: PlaybackDisplay?
    public private(set) var error: String?
    public private(set) var wantsPlayback = false
    @ObservationIgnored private let db: LocalDatabase
    @ObservationIgnored private let audio: any PlayerAudio
    @ObservationIgnored private let clock: PlayerClock
    @ObservationIgnored private let origin: URL
    @ObservationIgnored private let downloads: DownloadStore?
    @ObservationIgnored private let changed: @MainActor () async -> Void
    @ObservationIgnored private var queuedSequence = 0
    @ObservationIgnored private var tail: Task<Void, Never>?
    @ObservationIgnored private var timerTask: Task<Void, Never>?
    @ObservationIgnored private var chaptersTask: Task<Void, Never>?
    private struct PendingReport {
        let session: ListeningSession
        let changes: [Change]
        let ids: [String]
        let at: Int64
    }
    @ObservationIgnored private var pendingReport: PendingReport?
    @ObservationIgnored private var session: ListeningSession?
    @ObservationIgnored private var snapshot: LibrarySnapshot?
    @ObservationIgnored private var episode: Episode?
    @ObservationIgnored private var subscription: Subscription?
    @ObservationIgnored private var playlistID: String?
    @ObservationIgnored private var episodeID: String?
    @ObservationIgnored private var observedPlayed: Played?
    @ObservationIgnored private var position = 0.0
    @ObservationIgnored private var duration: Double?
    @ObservationIgnored private var settings = PlaybackSettings(speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: false)
    @ObservationIgnored private var sleep: SleepTimer?
    @ObservationIgnored private var ended = false
    @ObservationIgnored private var sources: [URL] = []
    @ObservationIgnored private var sourceIndex = 0
    @ObservationIgnored private var prepared = false
    @ObservationIgnored private var loadingAt: Double?
    @ObservationIgnored private var reportAt: Int64 = 0
    @ObservationIgnored private var closed = false
    @ObservationIgnored private var system: SystemPlayback?

    public init(database: LocalDatabase, origin: URL, downloads: DownloadStore? = nil,
                audio: any PlayerAudio = AVPlayerAudio(), clock: PlayerClock = PlayerClock(),
                systemIntegration: Bool = true, changed: @escaping @MainActor () async -> Void = {}) {
        db = database; self.origin = origin; self.downloads = downloads; self.audio = audio; self.clock = clock; self.changed = changed
        audio.event = { [weak self] event in self?.enqueue { try await $0.audioEvent(event) } }
        if systemIntegration { system = SystemPlayback(controller: self) }
        timerTask = Task { [weak self] in
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(0.5)) } catch { return }
                self?.enqueue { try await $0.checkBoundary(audioEnded: false); try await $0.checkLoading(); $0.publish() }
            }
        }
    }
    private func enqueue(_ action: @escaping @MainActor (PlaybackController) async throws -> Void) {
        queuedSequence += 1
        let previous = tail
        tail = Task { [weak self] in
            await previous?.value
            guard let self, !self.closed else { return }
            do { try await action(self) }
            catch { self.audio.pause(); self.wantsPlayback = false; self.error = "Playback could not continue: \(error)"; self.publish() }
        }
    }
    public func settle() async {
        var observed: Int
        repeat { observed = queuedSequence; await tail?.value } while observed != queuedSequence
    }
    public func refresh() { enqueue { try await $0.refreshState() } }
    public func toggle() { enqueue { if $0.wantsPlayback { try await $0.pauseAudio() } else { try await $0.start() } } }
    public func play() { enqueue { try await $0.start() } }
    public func pause() { enqueue { try await $0.pauseAudio() } }
    public func stop() { enqueue { try await $0.pauseAudio(); $0.audio.stop(); $0.prepared = false; $0.publish() } }
    public func seek(_ seconds: Double) { enqueue { try await $0.seekAudio(seconds) } }
    public func skip(_ delta: Double) { enqueue { try await $0.seekAudio($0.position + delta) } }
    public func setSpeed(_ speed: Double) {
        guard speed.isFinite, (0.25...4).contains(speed) else { return }
        enqueue {
            try await $0.sample(); try await $0.event(.speed(speed)); $0.settings.speed = speed
            if $0.wantsPlayback { $0.audio.play(speed: speed) }; $0.publish()
        }
    }
    public func setSleep(_ timer: SleepTimer?) { enqueue { $0.sleep = timer; $0.publish() } }
    public func sleepAfter(minutes: Double) { setSleep(.until(uptime: clock.uptime() + max(1, minutes) * 60)) }
    public func sleepAtChapterEnd() { if let display { setSleep(PlaybackPolicy.chapterSleep(display.chapters, position: display.position)) } }
    public func chapter(_ delta: Int) {
        guard let display, !display.chapters.isEmpty else { return }
        let index = min(display.chapters.count - 1, max(0, (display.chapterIndex ?? -1) + delta))
        seek(display.chapters[index].start)
    }
    public func playEntry(playlist: String, episode: String) {
        enqueue {
            try await $0.sample(); try await $0.event(.flush)
            try await $0.edit([.setActivePlaylist(playlistId: playlist), .setCursor(playlistId: playlist, episodeId: episode)])
            try await $0.follow(force: true, play: true)
        }
    }
    public func playNow(_ id: String) {
        enqueue {
            try await $0.sample(); try await $0.event(.flush)
            let state = try await $0.db.loadState()
            try await $0.edit([.addEntry(playlistId: state.activePlaylistId, episodeId: id, placement: .now)])
            if $0.episodeID == id && $0.playlistID == state.activePlaylistId && !$0.ended && $0.error == nil { try await $0.start() }
            else { try await $0.follow(force: true, play: true) }
        }
    }
    /// Serialize user edits with reporting and track loads. Flush before capturing an inverse,
    /// then reload only for edits that deliberately change the current playback context.
    public func performUserEdit(reload: Bool, start: Bool = false,
                                action: @escaping @MainActor () async throws -> Void) async throws {
        guard !closed else { throw CancellationError() }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
            enqueue { controller in
                let before: State
                do {
                    try await controller.sample(); try await controller.event(.flush)
                    before = try await controller.db.loadState()
                    try await action()
                } catch { continuation.resume(throwing: error); return }
                // Audio failure after a successful durable edit must not make the form retry it.
                do {
                    let after = try await controller.db.loadState()
                    let previous = PlaybackPolicy.target(before), next = PlaybackPolicy.target(after)
                    let targetChanged = previous?.playlist.id != next?.playlist.id || previous?.entry != next?.entry
                    let playedChanged = controller.episodeID.map { before.episodeStates[$0]?.played != after.episodeStates[$0]?.played } ?? false
                    if start && !targetChanged && !controller.ended && controller.error == nil && controller.session?.finished == false {
                        try await controller.start()
                    } else if start || (reload && (targetChanged || playedChanged)) {
                        try await controller.follow(force: true, play: start || controller.wantsPlayback)
                    } else { try await controller.refreshState() }
                } catch {
                    controller.audio.pause(); controller.wantsPlayback = false
                    controller.error = "Playback could not continue: \(error)"; controller.publish()
                }
                continuation.resume()
            }
        }
    }

    public func flush() { enqueue { try await $0.sample(); try await $0.event(.flush) } }
    public func shutdown() async {
        enqueue { try await $0.sample(); try await $0.event(.pause) }
        await settle()
        closed = true; timerTask?.cancel(); chaptersTask?.cancel(); audio.stop(); audio.event = nil
        system?.close(); system = nil
    }
    private func edit(_ changes: [Change]) async throws {
        guard !changes.isEmpty else { return }
        try await db.recordAll(changes, at: clock.now())
        await changed()
    }
    private func commitPendingReport() async throws {
        guard let pending = pendingReport else { return }
        try await db.recordAll(pending.changes, at: pending.at, ids: pending.ids)
        session = pending.session; pendingReport = nil
        for change in pending.changes {
            if case let .reportPosition(_, _, _, listenedAt, _) = change { reportAt = listenedAt }
        }
        await changed()
    }
    private func event(_ event: ListeningSession.Event) async throws {
        try await commitPendingReport()
        guard var candidate = session else { return }
        let at = clock.now()
        let changes = candidate.accept(event, at: at, offsetMinutes: clock.offset(at))
        if changes.isEmpty { session = candidate; return }
        pendingReport = PendingReport(session: candidate, changes: changes, ids: changes.map { _ in UUID().uuidString }, at: at)
        try await commitPendingReport()
    }
    private func sample() async throws {
        guard prepared, audio.isPlaying else { return }
        position = audio.position; duration = audio.duration ?? duration
        try await event(.position(seconds: position, duration: duration))
    }
    private func refreshState() async throws {
        snapshot = try await db.readLibrary()
        if let id = episodeID {
            let played = snapshot?.state.episodeStates[id]?.played
            if played != nil, played != observedPlayed, session?.finished != true { try await event(.externalPlayed) }
            observedPlayed = played
            let fresh = snapshot?.episodes.first { $0.id == id }
            if let fresh {
                let oldURL = episode?.audioUrl
                episode = fresh; subscription = snapshot?.subscriptions.first { $0.id == fresh.subscriptionId }
                try await event(.metadata(subscriptionId: fresh.subscriptionId, threshold: subscription?.playedThreshold))
                duration = audio.duration ?? fresh.duration
                if prepared, oldURL != fresh.audioUrl {
                    try await sample(); try await event(.flush); try await event(.discontinuity)
                    await chooseSources(); loadSource(play: wantsPlayback)
                }
            }
        }
        try await follow(); publish()
    }
    private func follow(force: Bool = false, play: Bool = false) async throws {
        if !force && PlaybackPolicy.holdLoaded(playing: wantsPlayback, finished: session?.finished == true, ended: ended) { return }
        let fresh = try await db.readLibrary(); snapshot = fresh
        guard let target = PlaybackPolicy.target(fresh.state) else {
            try await event(.flush); audio.stop(); prepared = false; wantsPlayback = false
            display = nil; episodeID = nil; playlistID = nil; session = nil; system?.update(nil); return
        }
        if !force, target.entry.episodeId == episodeID, target.playlist.id == playlistID, session?.finished == false {
            if !wantsPlayback, target.entry.positionAt > reportAt, abs(position - target.entry.position) >= 1 {
                position = target.entry.position; if prepared { await audio.seek(position) }
                try await event(.remotePosition(seconds: position, listenedAt: target.entry.positionAt)); reportAt = target.entry.positionAt
            }
            return
        }
        try await event(.flush)
        audio.stop(); prepared = false
        playlistID = target.playlist.id; episodeID = target.entry.episodeId
        episode = fresh.episodes.first { $0.id == episodeID }
        subscription = fresh.subscriptions.first { $0.id == episode?.subscriptionId }
        settings = PlaybackPolicy.settings(fresh.state.playbackSettings, override: subscription?.playbackSettings ?? .init())
        position = target.entry.position; duration = episode?.duration
        session = ListeningSession(playlistId: target.playlist.id, episodeId: target.entry.episodeId, subscriptionId: episode?.subscriptionId,
            initialPosition: position, initialSpeed: settings.speed, initialDuration: duration, threshold: subscription?.playedThreshold, initialAt: clock.now())
        reportAt = target.entry.positionAt; observedPlayed = fresh.state.episodeStates[target.entry.episodeId]?.played
        ended = false; error = nil
        if case .until = sleep {} else { sleep = nil }
        await chooseSources(); wantsPlayback = play
        // Intro skipping is applied on Play, so merely opening the app creates no Operation.
        if play { try await prepareAndPlay() }
        resolveChapters(); publish()
    }
    private func chooseSources() async {
        let stored = if let episodeID { await downloads?.stored(episodeID) } else { nil as URL? }
        sources = PlaybackPolicy.sources(stored: stored, host: episode.flatMap { URL(string: $0.audioUrl) },
            proxy: episodeID.map { AudioSource.proxy(origin, episodeID: $0) })
        sourceIndex = 0
    }
    private func loadSource(play: Bool) {
        guard sources.indices.contains(sourceIndex) else { error = "Audio is unavailable. Retry playback."; wantsPlayback = false; return }
        prepared = true; wantsPlayback = play; loadingAt = play ? clock.uptime() : nil
        audio.load(sources[sourceIndex], position: position, speed: settings.speed, boost: settings.volumeBoost, play: play)
    }
    private func prepareAndPlay() async throws {
        let start = PlaybackPolicy.startPosition(position, duration: duration, skipIntro: settings.skipIntro)
        if start != position { try await event(.seek(seconds: start)); position = start }
        // A completed download may have arrived since this paused Entry was restored.
        await chooseSources(); loadSource(play: true)
    }
    private func start() async throws {
        if error != nil { try await follow(force: true, play: true); return }
        if episodeID == nil || ended {
            let state = try await db.loadState()
            if let playlist = state.playlists.first(where: { $0.id == state.activePlaylistId }), playlist.cursor == nil,
               let first = playlist.entries.first { try await edit([.setCursor(playlistId: playlist.id, episodeId: first.episodeId)]) }
            try await follow(force: true)
        } else { try await follow() }
        guard episodeID != nil else { return }
        wantsPlayback = true
        if prepared { audio.play(speed: settings.speed) } else { try await prepareAndPlay() }
        publish()
    }
    private func pauseAudio() async throws {
        try await sample(); try await event(.pause)
        wantsPlayback = false; audio.pause(); loadingAt = nil
        try await follow(); publish()
    }
    private func seekAudio(_ seconds: Double) async throws {
        guard seconds.isFinite, episodeID != nil else { return }
        try await sample()
        let target = max(0, min(seconds, duration ?? max(0, seconds)))
        try await event(.seek(seconds: target)); position = target
        if prepared { await audio.seek(target) }
        try await event(.discontinuity); publish()
    }
    private func audioEvent(_ value: PlayerAudioEvent) async throws {
        guard prepared else { return }
        switch value {
        case .tick: try await sample(); try await checkBoundary(audioEnded: false)
        case .playing:
            guard wantsPlayback else { audio.pause(); return }
            position = audio.position; duration = audio.duration ?? duration; loadingAt = nil
            try await event(.discontinuity); try await event(.position(seconds: position, duration: duration)); try await event(.play)
        case .waiting: try await event(.flush); try await event(.discontinuity); loadingAt = clock.uptime()
        case .paused: try await event(.flush); try await event(.discontinuity)
        case .discontinuity: try await event(.flush); try await event(.discontinuity)
        case .ended:
            position = audio.position; duration = audio.duration ?? duration
            try await event(.position(seconds: position, duration: duration)); try await checkBoundary(audioEnded: true)
        case .failure: try await fallback()
        }
        publish()
    }
    private func fallback() async throws {
        let wanted = wantsPlayback
        // Failed AVPlayerItems can return invalid/zero currentTime; keep the last accepted Position.
        if audio.position > 0 { position = audio.position }
        try await event(.failure); sourceIndex += 1
        if sourceIndex < sources.count { loadSource(play: wanted) }
        else { error = "Could not play the downloaded file, publisher or server audio. Retry playback."; wantsPlayback = false; loadingAt = nil; audio.pause() }
    }
    private func checkLoading() async throws {
        if wantsPlayback, let loadingAt, clock.uptime() - loadingAt >= 10 { try await fallback() }
    }
    private func checkBoundary(audioEnded: Bool) async throws {
        let timedSleep: Bool = if case .until = sleep { true } else { false }
        guard episodeID != nil, !ended, wantsPlayback || audioEnded || timedSleep else { return }
        let decision = PlaybackPolicy.boundary(position: position, duration: duration, skipOutro: wantsPlayback ? settings.skipOutro : 0, ended: audioEnded, sleep: sleep, uptime: clock.uptime())
        guard decision != .continue else { return }
        let episodeEnd = audioEnded || (wantsPlayback && settings.skipOutro > 0 && duration.map { position >= $0 - settings.skipOutro } == true)
        if episodeEnd { try await event(.ended); ended = true }
        wantsPlayback = false; audio.pause(); loadingAt = nil
        try await event(.pause)
        if decision == .sleep { sleep = nil; if episodeEnd { try await follow(force: true) } }
        else { try await follow(force: true, play: true) }
    }
    private func resolveChapters() {
        chaptersTask?.cancel()
        guard let id = episodeID, episode?.chapters.isEmpty != false else { return }
        let db = db, origin = origin, downloads = downloads
        chaptersTask = Task { [weak self] in
            let stored = await downloads?.stored(id)
            guard let chapters = try? await ChapterResolver.resolve(episodeID: id, origin: origin, database: db, stored: stored), !chapters.isEmpty, !Task.isCancelled else { return }
            self?.refresh()
        }
    }
    private func publish() {
        guard let episodeID, let playlistID else { return }
        let chapters = episode?.chapters ?? []
        display = PlaybackDisplay(episodeID: episodeID, playlistID: playlistID, title: episode?.title ?? "Episode details pending sync",
            podcast: subscription?.title ?? "Podcast details pending sync", position: position, duration: duration, speed: settings.speed,
            playing: wantsPlayback, buffering: wantsPlayback && loadingAt != nil, chapters: chapters,
            artwork: PlaybackPolicy.artwork(chapters, position: position, episode: episode?.artwork, podcast: subscription?.artwork).flatMap { URL(string: $0.url) }, sleep: sleep)
        system?.update(display)
    }
}
