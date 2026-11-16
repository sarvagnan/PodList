import Foundation
import Observation
import Synchronization
import Testing
import MediaPlayer
import PodListDomain
import PodListData
@testable import PodListUI
#if os(macOS)
import SwiftUI
#endif

private final class FakePlayerClock: Sendable {
    private let value = Mutex<Int64>(0)
    func advance(_ seconds: Double) { value.withLock { $0 += Int64(seconds * 1000) } }
    var clock: PlayerClock {
        PlayerClock(now: { self.value.withLock { $0 } }, uptime: { self.value.withLock { Double($0) / 1000 } }, offset: { _ in 0 })
    }
}
@MainActor private final class FakeAudio: PlayerAudio {
    var position = 0.0
    var duration: Double? = 100
    var isPlaying = false
    var event: (@MainActor (PlayerAudioEvent) -> Void)?
    var loads: [(URL, Double, Double, Bool)] = []
    func load(_ url: URL, position: Double, speed: Double, boost: Bool, play: Bool) {
        self.position = position; loads.append((url, position, speed, boost)); isPlaying = play
        if play { event?(.playing) }
    }
    func play(speed: Double) { isPlaying = true; event?(.playing) }
    func pause() { isPlaying = false }
    func seek(_ position: Double) async { self.position = position }
    func stop() { isPlaying = false }
    func tick(_ position: Double) { self.position = position; event?(.tick) }
}
@MainActor private func playbackFixture(clear: Bool = true, intro: Double = 0, outro: Double = 0) async throws -> (LocalDatabase, PlaybackController, FakeAudio, FakePlayerClock) {
    let db = try LocalDatabase(path: ":memory:")
    var state = State.initial()
    state.playlists[0].clearOnPlayed = clear
    state.playlists[0].entries = [.init(episodeId: "a", position: 0, positionAt: 0), .init(episodeId: "b", position: 10, positionAt: 0)]
    state.playlists[0].cursor = "a"
    state.playbackSettings = .init(speed: 1, skipIntro: intro, skipOutro: outro, volumeBoost: true)
    var sub = subscription(); sub.playedThreshold = nil; sub.playbackSettings = .init()
    try await db.saveState(state)
    try await db.upsertLibrary(subscriptions: [sub], episodes: [episode(duration: 100), episode("b", duration: 100)])
    let audio = FakeAudio(), clock = FakePlayerClock()
    let player = PlaybackController(database: db, origin: URL(string: "https://server")!, audio: audio, clock: clock.clock, systemIntegration: false)
    player.refresh(); await player.settle()
    return (db, player, audio, clock)
}
#if os(macOS)
@MainActor @Test func nowPlayingControlsFitTypicalWindowAndGrowWithTextSizeWithoutAScreen() async throws {
    let (db, player, _, _) = try await playbackFixture()
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    let display = try #require(player.display)
    for appearance in [ColorScheme.light, .dark] {
        var heights: [CGFloat] = []
        for scale: CGFloat in [1, 2] {
            let playerView = NowPlayingView(controller: player, library: library, app: app,
                openPlaylist: {}, addToPlaylist: { _, _ in }, done: {})
            // Measure the content that determines the window height, independently
            // of the screen-dependent scroll viewport supplied by ContentSizedPanel.
            let host = NSHostingView(rootView: playerView.playbackControls(display)
                .macContentFont(.body).environment(\.macTextScale, scale)
                .environment(\.colorScheme, appearance).frame(width: 560))
            let size = host.fittingSize
            #expect(size.width == 560)
            #expect(size.height > 400)
            if scale == 1 { #expect(size.height < 760, "Ordinary playback controls must fit the typical screen") }
            heights.append(size.height)
        }
        #expect(heights[1] > heights[0], "Enlarged text must grow content for the bounded scrolling surface")
    }
}

@MainActor @Test func playbackMenuToggleKeepsTheCurrentEpisodeAndPlaylistOrder() async throws {
    let (db, player, audio, clock) = try await playbackFixture()
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    let command = PlaybackToggleCommand(controller: player, library: library)
    #expect(command.isEnabled && command.title == "Play")
    command.perform(); await player.settle()
    #expect(command.title == "Pause" && audio.isPlaying)

    // Clear on Played advances the Playlist cursor to b while a is still playing.
    // Even here, the transport must pause/resume a, without Play Now/Play from Here.
    clock.advance(1); audio.tick(70); await player.settle()
    let before = try await db.loadState()
    #expect(before.playlists[0].cursor == "b")
    #expect(player.display?.episodeID == "a")
    command.perform(); await player.settle()
    #expect(command.title == "Play" && !audio.isPlaying && !player.wantsPlayback)
    #expect(player.display?.episodeID == "a")
    command.perform(); await player.settle()
    #expect(command.title == "Pause" && audio.isPlaying && player.wantsPlayback)
    #expect(player.display?.episodeID == "a")
    let after = try await db.loadState()
    #expect(after.playlists[0].cursor == before.playlists[0].cursor)
    #expect(after.playlists[0].entries.map(\.episodeId) == before.playlists[0].entries.map(\.episodeId))
    #expect(audio.loads.count == 1)
    await player.shutdown()
}

@MainActor @Test func playbackMenuStartsTheActivePlaylistWithoutALoadedEpisode() async throws {
    let db = try await fixtureDatabase()
    var state = try await db.loadState()
    state.playlists[0].cursor = nil
    try await db.saveState(state)
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    let audio = FakeAudio()
    let player = PlaybackController(database: db, origin: nil, audio: audio, systemIntegration: false)
    let command = PlaybackToggleCommand(controller: player, library: library)
    #expect(player.display == nil && command.isEnabled && command.title == "Play")
    command.perform(); await player.settle()
    #expect(player.display?.episodeID == state.playlists[0].entries.first?.episodeId)
    #expect(player.wantsPlayback && command.title == "Pause")
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == state.playlists[0].entries.map(\.episodeId))
    await player.shutdown()

    state.playlists[0].entries = []
    try await db.saveState(state)
    let empty = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    let idle = PlaybackController(database: db, origin: nil, audio: FakeAudio(), systemIntegration: false)
    let unavailable = PlaybackToggleCommand(controller: idle, library: empty)
    #expect(!unavailable.isEnabled && unavailable.title == "Play")
    unavailable.perform(); await idle.settle()
    #expect(!idle.wantsPlayback && idle.display == nil)
    #expect(!PlaybackToggleCommand(controller: nil, library: library).isEnabled)
    #expect(!PlaybackToggleCommand(controller: idle, library: nil).isEnabled)
    await idle.shutdown()
}

@MainActor @Test func glassPlayerBarReflowsAtEnlargedTextSizesWithoutAScreen() async throws {
    let (db, player, _, _) = try await playbackFixture()
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    #expect(player.metadata != nil)
    for width in [CGFloat(760), 1180] {
        func height(scale: CGFloat) throws -> Int {
            let renderer = ImageRenderer(content: PlayerBar(controller: player, library: library, openPlaylist: {}, openNowPlaying: {})
                .environment(\.macTextScale, scale)
                .frame(width: width))
            let image = try #require(renderer.cgImage)
            #expect(image.width == Int(width))
            return image.height
        }
        let actual = try height(scale: 1)
        #expect(actual > 0)
        #expect(try height(scale: 2) > actual)
    }
    await player.shutdown()
}
#endif
@MainActor @Test func playerThresholdKeepsTailThenAdvancesFromReducedCursor() async throws {
    for clear in [true, false] {
        let (db, player, audio, clock) = try await playbackFixture(clear: clear)
        #expect(audio.loads.isEmpty && player.display?.position == 0)
        player.play(); await player.settle()
        clock.advance(1); audio.tick(70); await player.settle()
        #expect(try await db.loadState().playlists[0].cursor == "b")
        #expect(player.display?.episodeID == "a" && player.wantsPlayback)
        player.refresh(); await player.settle()
        #expect(player.display?.episodeID == "a")
        clock.advance(5); audio.tick(75); await player.settle()
        player.pause(); await player.settle()
        #expect(player.display?.episodeID == "a")
        #expect(try await db.outbox().last?.change == .recordListening(amounts: [.init(day: "1970-01-01", subscriptionId: "s", seconds: 5)]))
        player.play(); await player.settle()
        clock.advance(25); audio.position = 100; audio.event?(.ended); await player.settle()
        #expect(player.display?.episodeID == "b" && player.display?.position == 10)
        #expect(audio.loads.count == 2)
        await player.shutdown()
    }
}
@MainActor @Test func playerSeekFlushesBothSidesAndSpeedIsTransient() async throws {
    let (db, player, audio, clock) = try await playbackFixture()
    player.play(); await player.settle()
    clock.advance(5); audio.tick(5); await player.settle()
    player.seek(50); await player.settle()
    let reports = try await db.outbox().map(\.change)
    #expect(reports.count == 2)
    if case let .reportPosition(_, _, position, _, amounts) = reports[0] { #expect(position == 5 && amounts?.reduce(0) { $0 + $1.seconds } == 5) }
    if case let .reportPosition(_, _, position, _, amounts) = reports[1] { #expect(position == 50 && amounts == nil) }
    player.setSpeed(2); await player.settle()
    #expect(player.display?.speed == 2)
    #expect(try await db.loadState().playbackSettings.speed == 1)
    player.seek(-20); await player.settle(); #expect(audio.position == 0)
    await player.shutdown()
}
@MainActor @Test func playerFallbackKeepsPositionAndSpeedThenOffersFreshRetry() async throws {
    let (_, player, audio, clock) = try await playbackFixture()
    player.play(); await player.settle()
    player.setSpeed(1.5); await player.settle()
    clock.advance(5); audio.tick(5); await player.settle()
    audio.event?(.failure); await player.settle()
    #expect(audio.loads.count == 2)
    #expect(audio.loads[0].0.host == "example.com" && audio.loads[1].0.host == "server")
    #expect(audio.loads[1].1 == 5 && audio.loads[1].2 == 1.5 && audio.loads[1].3)
    audio.event?(.failure); await player.settle()
    #expect(player.error != nil && !player.wantsPlayback)
    player.play(); await player.settle()
    #expect(audio.loads.count == 3 && audio.loads[2].0.host == "example.com")
    await player.shutdown()
}
@MainActor @Test func playerSleepOutroAndIntroApplyWithoutCountingSkippedTime() async throws {
    let (db, player, audio, clock) = try await playbackFixture(intro: 10, outro: 10)
    player.play(); await player.settle()
    #expect(audio.loads.first?.1 == 10)
    player.setSleep(.episodeEnd); await player.settle()
    clock.advance(1); audio.tick(90); await player.settle()
    #expect(!player.wantsPlayback && player.display?.episodeID == "b")
    #expect(try await db.loadState().playlists[0].history.first?.episodeId == "a")
    #expect(player.display?.sleep == nil)
    await player.shutdown()
}
@MainActor @Test func pausedPlayerFollowsNewerStateWithoutPositionOperations() async throws {
    let (db, player, audio, _) = try await playbackFixture()
    try await db.record(.reportPosition(playlistId: "default", episodeId: "a", position: 45, listenedAt: 1000, listening: nil), at: 1000)
    player.refresh(); await player.settle()
    #expect(player.display?.position == 45 && audio.loads.isEmpty)
    player.flush(); await player.settle()
    #expect(try await db.outbox().count == 1)
    await player.shutdown()
}
@MainActor @Test func pausedPlayerDoesNotRepublishIdenticalDisplay() async throws {
    let (_, player, audio, _) = try await playbackFixture()
    player.play(); await player.settle()
    player.pause(); await player.settle()
    let before = try #require(player.display)
    #expect(!before.playing)
    let changed = Mutex(false)
    withObservationTracking {
        _ = player.display
    } onChange: {
        changed.withLock { $0 = true }
    }
    // Exercise identical publications from refresh, audio callbacks and the real 0.5 s timer.
    player.refresh(); audio.event?(.tick); await player.settle()
    try await Task.sleep(for: .seconds(1.1))
    await player.settle()
    #expect(player.display == before)
    #expect(!changed.withLock { $0 })
    // Prove the observer still sees an actual display change.
    player.seek(5); await player.settle()
    #expect(changed.withLock { $0 })
    #expect(player.display?.position == 5)
    await player.shutdown()
}
@MainActor @Test func playbackPresenceAndMetadataIgnorePositionChanges() async throws {
    let (db, player, _, _) = try await playbackFixture()
    #expect(player.hasDisplay && player.metadata == player.display?.metadata)
    let presenceChanged = Mutex(false), metadataChanged = Mutex(false)
    withObservationTracking {
        _ = player.hasDisplay
    } onChange: {
        presenceChanged.withLock { $0 = true }
    }
    withObservationTracking {
        _ = player.metadata
    } onChange: {
        metadataChanged.withLock { $0 = true }
    }
    player.seek(5); await player.settle()
    #expect(player.display?.position == 5)
    #expect(!presenceChanged.withLock { $0 } && !metadataChanged.withLock { $0 })
    var updated = episode(duration: 100); updated.title = "Updated title"
    try await db.upsertLibrary(subscriptions: [], episodes: [updated])
    player.refresh(); await player.settle()
    #expect(player.metadata?.title == updated.title && metadataChanged.withLock { $0 })
    #expect(!presenceChanged.withLock { $0 })
    var state = try await db.loadState()
    state.playlists[0].entries = []; state.playlists[0].cursor = nil
    try await db.saveState(state)
    player.refresh(); await player.settle()
    #expect(!player.hasDisplay && player.metadata == nil && player.display == nil)
    #expect(presenceChanged.withLock { $0 })
    await player.shutdown()
}
@Test func nowPlayingMapsRateDurationChapterAndUnknownDuration() {
    var value = PlaybackDisplay(episodeID: "e", playlistID: "p", title: "Episode", podcast: "Podcast", position: 65, duration: 100, speed: 1.5,
        playing: true, buffering: false, chapters: [.init(start: 0, title: "One", artwork: nil, url: nil), .init(start: 60, title: "Two", artwork: nil, url: nil)], artwork: nil, sleep: nil)
    let info = NowPlayingMapping.info(value)
    #expect(info[MPNowPlayingInfoPropertyExcludeFromSuggestions] as? Bool == !ActionDonations.isEnabled(
        bundleIdentifier: Bundle.main.bundleIdentifier, environment: ProcessInfo.processInfo.environment))
    for enabled in [false, true] {
        let mapped = NowPlayingMapping.info(value, suggestionsEnabled: enabled)
        #expect(mapped[MPNowPlayingInfoPropertyExcludeFromSuggestions] as? Bool == !enabled)
        #expect(mapped[MPMediaItemPropertyTitle] as? String == "Episode")
        #expect(mapped[MPNowPlayingInfoPropertyPlaybackRate] as? Double == 1.5)
    }
    #expect(info[MPMediaItemPropertyTitle] as? String == "Episode")
    #expect(info[MPMediaItemPropertyArtist] as? String == "Podcast")
    #expect(info[MPNowPlayingInfoPropertyElapsedPlaybackTime] as? Double == 65)
    #expect(info[MPNowPlayingInfoPropertyPlaybackRate] as? Double == 1.5)
    #expect(info[MPNowPlayingInfoPropertyChapterNumber] as? Int == 1)
    #expect(info[MPNowPlayingInfoPropertyChapterCount] as? Int == 2)
    #expect(info[MPMediaItemPropertyComments] as? String == "Two")
    value.buffering = true; value.duration = nil
    #expect(NowPlayingMapping.info(value)[MPNowPlayingInfoPropertyPlaybackRate] as? Double == 0)
    #expect(NowPlayingMapping.info(value)[MPMediaItemPropertyPlaybackDuration] == nil)
}

@MainActor @Test func failedPositionCommitRetainsAmountsAndStableReportForRetry() async throws {
    let (db, player, audio, clock) = try await playbackFixture()
    player.play(); await player.settle()
    clock.advance(5); audio.tick(5); await player.settle()
    try await db.execute("CREATE TRIGGER fail_reports BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'disk unavailable'); END")
    var spoken: [String] = []
    player.announcements.post = { message, _ in spoken.append(message) }
    clock.advance(10); audio.tick(15); await player.settle()
    #expect(player.error == FailureOperation.playback.message && !player.wantsPlayback)
    #expect(spoken == [FailureOperation.playback.message])
    #expect(try await db.outbox().isEmpty)
    try await db.execute("DROP TRIGGER fail_reports")
    player.flush(); await player.settle()
    let operations = try await db.outbox()
    #expect(operations.count == 1)
    if case let .reportPosition(_, _, position, at, amounts) = operations[0].change {
        #expect(position == 15 && at == 15_000 && amounts?.reduce(0) { $0 + $1.seconds } == 15)
    } else { Issue.record("Failed report was lost") }
    player.flush(); await player.settle()
    #expect(try await db.outbox() == operations)
    await player.shutdown()
}
@MainActor @Test func shutdownFlushesUnreportedListeningAndExternalPlayedUsesListeningOnly() async throws {
    let (db, player, audio, clock) = try await playbackFixture()
    player.play(); await player.settle()
    clock.advance(5); audio.tick(5); await player.settle()
    try await db.record(.markPlayed(episodeId: "a", source: .user), at: 5000)
    player.refresh(); await player.settle()
    clock.advance(5); audio.tick(10); await player.settle()
    await player.shutdown()
    let changes = try await db.outbox().map(\.change)
    #expect(changes.count == 3)
    #expect(changes.last == .recordListening(amounts: [.init(day: "1970-01-01", subscriptionId: "s", seconds: 5)]))
    #expect(player.display?.episodeID == "a")
}
@MainActor @Test func chapterSleepPausesWithoutPlayingMarkAndDurationSleepWorksWhilePaused() async throws {
    let (db, player, audio, clock) = try await playbackFixture()
    player.play(); await player.settle()
    player.setSleep(.chapterEnd(position: 20)); await player.settle()
    clock.advance(20); audio.tick(20); await player.settle()
    #expect(!player.wantsPlayback && player.display?.sleep == nil)
    #expect(try await db.loadState().episodeStates["a"]?.played == nil)
    player.sleepAfter(minutes: 1); await player.settle()
    clock.advance(60); audio.event?(.tick); await player.settle()
    #expect(player.display?.sleep == nil && !player.wantsPlayback)
    await player.shutdown()
}

@MainActor @Test func playingDeviceHoldsLoadedEntryWhilePausedDeviceAdoptsActiveCursor() async throws {
    let (db, player, audio, _) = try await playbackFixture()
    player.play(); await player.settle()
    try await db.recordAll([
        .createPlaylist(playlistId: "other", name: "Other", clearOnPlayed: false),
        .addEntry(playlistId: "other", episodeId: "b", placement: .last),
        .setCursor(playlistId: "other", episodeId: "b"),
        .reportPosition(playlistId: "other", episodeId: "b", position: 40, listenedAt: 1000, listening: nil),
        .setActivePlaylist(playlistId: "other")
    ], at: 1000)
    player.refresh(); await player.settle()
    #expect(player.display?.episodeID == "a" && player.display?.playlistID == "default")
    player.pause(); await player.settle()
    #expect(player.display?.episodeID == "b" && player.display?.playlistID == "other" && player.display?.position == 40)
    #expect(!player.wantsPlayback && audio.loads.count == 1)
    player.play(); await player.settle()
    #expect(audio.loads.last?.1 == 40)
    await player.shutdown()
}

@MainActor @Test func userEditsFlushPositionBeforeUndoAndKeepUnrelatedAudioLoaded() async throws {
    let (db, player, audio, clock) = try await playbackFixture()
    let defaults = UserDefaults(suiteName: "PodListPlaybackEdits-" + UUID().uuidString)!
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "test", defaults: defaults), player: { player })
    player.play(); await player.settle()
    clock.advance(5); audio.tick(5); await player.settle()
    await editing.setStar(["b"], starred: true)
    #expect(audio.loads.count == 1 && player.wantsPlayback)
    #expect(try await db.loadState().playlists[0].entries[0].position == 5)
    _ = await editing.add(["c"], placement: .next)
    #expect(audio.loads.count == 1 && player.display?.episodeID == "a")
    await editing.remove(["a"], playlistID: "default")
    #expect(player.display?.episodeID == "c" && player.wantsPlayback)
    await editing.reverse()
    #expect(player.display?.episodeID == "a" && player.display?.position == 5 && player.wantsPlayback)
    #expect(try await db.loadState().listeningLog?["1970-01-01"]?["s"] == 5)
    await player.shutdown()
}

@MainActor @Test func inactivePlaylistEditsKeepSpeedAndAudioAndPlayThisCanActivateEmptyPlaylist() async throws {
    let (db, player, audio, _) = try await playbackFixture()
    let defaults = UserDefaults(suiteName: "PodListInactiveEdits-" + UUID().uuidString)!
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "test", defaults: defaults), player: { player })
    player.play(); await player.settle()
    player.setSpeed(1.75); await player.settle()
    let id = try #require(await editing.create(name: "Other"))
    _ = await editing.add(["b"], to: id, placement: .last)
    await editing.remove(["b"], playlistID: id)
    #expect(audio.loads.count == 1 && player.display?.speed == 1.75 && player.wantsPlayback)
    _ = await editing.add(["a"], placement: .now)
    #expect(audio.loads.count == 1 && player.display?.speed == 1.75)
    await editing.playFromHere(playlistID: id, episodeID: nil)
    #expect(try await db.loadState().activePlaylistId == id)
    #expect(player.display == nil && !player.wantsPlayback)
    await editing.reverse()
    #expect(try await db.loadState().activePlaylistId == "default")
    #expect(player.display?.episodeID == "a" && !player.wantsPlayback)
    await player.shutdown()
}

@MainActor @Test func pendingOverridesImmediatelyReachPlaybackAndReopenedSettings() async throws {
    let (db, player, audio, _) = try await playbackFixture()
    player.play(); await player.settle()
    try await db.record(.setSubscriptionOverrides(subscriptionId: "s", playbackSettings: .init(speed: 1.75, skipIntro: 20, skipOutro: 10, volumeBoost: false), playedThreshold: 5), at: 100)
    player.refresh(); await player.settle()
    #expect(player.display?.speed == 1.75)
    #expect(audio.loads.last?.2 == 1.75 && audio.loads.last?.3 == false)
    let reopened = try #require(try await db.readLibrary().subscriptions.first)
    #expect(reopened.playedThreshold == 5 && reopened.playbackSettings.skipIntro == 20 && reopened.playbackSettings.skipOutro == 10)
    // A fresh catalogue page must not hide the later pending replacement document.
    try await db.upsertLibrary(subscriptions: [subscription()], episodes: [])
    #expect(try await db.readLibrary().subscriptions.first?.playbackSettings == reopened.playbackSettings)
    try await db.record(.setSubscriptionOverrides(subscriptionId: "s", playbackSettings: .init(), playedThreshold: nil), at: 101)
    player.refresh(); await player.settle()
    #expect(player.display?.speed == 1)
    #expect(try await db.readLibrary().subscriptions.first?.playedThreshold == nil)
    let sent = try await db.outbox(), state = try await db.loadState()
    try await db.commitPull(PullPage(cursor: 1, snapshot: state, operations: []), sent: sent)
    #expect(try await db.outbox().isEmpty)
    #expect(try await db.readLibrary().subscriptions.first?.playbackSettings == .init())
    await player.shutdown()
}

@MainActor @Test func inspectorMembershipResumeUsesThatEntryPositionAndMakesPlaylistActive() async throws {
    let (db, player, audio, _) = try await playbackFixture()
    var state = try await db.loadState()
    var other = state.playlists[0]; other.id = "other"; other.name = "Commute"; other.isDefault = false
    other.entries[0].position = 45; state.playlists.append(other)
    try await db.saveState(state)
    let model = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString), player: { player })
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "d")
    let membership = try #require(library.memberships("a").first { $0.id == "other" })
    #expect(membership.position == 45)
    await model.playFromHere(playlistID: membership.id, episodeID: "a")
    await player.settle()
    #expect(try await db.loadState().activePlaylistId == "other")
    #expect(player.display?.playlistID == "other" && player.display?.position == 45)
    #expect(audio.loads.last?.1 == 45 && player.wantsPlayback)
    await player.shutdown()
}

@MainActor @Test func delayedAudioEndAfterPauseCannotStartPlayback() async throws {
    let (db, player, audio, _) = try await playbackFixture()
    player.play(); await player.settle()
    player.pause(); await player.settle()
    let before = try await db.loadState(), loads = audio.loads.count
    // An AVFoundation notification can already be queued when Pause is requested.
    audio.event?(.ended); await player.settle()
    #expect(!player.wantsPlayback && !audio.isPlaying)
    #expect(audio.loads.count == loads)
    #expect(try await db.loadState() == before)
    player.play(); await player.settle()
    #expect(player.wantsPlayback && audio.isPlaying)
    await player.shutdown()
}

@MainActor @Test(arguments: [false, true]) func unexpectedAudioPlayingRequiresPlayIntent(previouslyPrepared: Bool) async throws {
    let (_, player, audio, _) = try await playbackFixture()
    if previouslyPrepared {
        player.play(); await player.settle()
        player.pause(); await player.settle()
    }
    audio.isPlaying = true; audio.event?(.playing); await player.settle()
    #expect(!audio.isPlaying && !player.wantsPlayback && player.display?.playing == false)
    await player.shutdown()
}

@MainActor @Test func moveUndoSelectionAndRewindPreviewNeverRequestPlayback() async throws {
    let (db, player, audio, _) = try await playbackFixture()
    var state = try await db.loadState()
    var commute = state.playlists[0]; commute.id = "commute"; commute.name = "Commute"; commute.isDefault = false
    commute.entries.append(.init(episodeId: "c", position: 0, positionAt: 0))
    commute.timeline = [.init(at: Int64(Date().timeIntervalSince1970 * 1000) - 60_000, episodeId: "a", position: 0)]
    state.playlists.append(commute); try await db.saveState(state)
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString), player: { player })
    await editing.move(["c"], playlistID: "commute", to: 1)
    await editing.reverse()
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "d")
    let window = WindowModel(); window.navigate(to: .playlist("commute")); window.selection = ["b"]
    #expect(window.rows(in: library).contains { $0.id == "b" })
    window.selection = [] // Switching to Listening Timeline clears the row selection.
    let current = try #require(library.state.playlists.first { $0.id == "commute" })
    let moment = try #require(TimelinePresentation.events(current).first?.moment)
    #expect(TimelinePresentation.preview(library.state, playlistID: "commute", to: moment, at: moment) != nil)
    // Opening and cancelling the sheet have no durable or playback action.
    player.refresh(); player.flush(); await player.settle()
    #expect(!player.wantsPlayback && !audio.isPlaying && audio.loads.isEmpty)
    #expect(player.display?.playlistID == "default")
    await player.shutdown()
}

@MainActor @Test func selectedSleepDurationSurvivesCountdownAndClearsWithOtherChoices() async throws {
    let (_, player, audio, clock) = try await playbackFixture()
    player.play(); await player.settle()
    player.pause(); await player.settle()
    player.sleepAfter(minutes: 15); await player.settle()
    #expect(player.sleepMinutes == 15)
    #expect(player.display?.sleep == .until(uptime: 900))
    clock.advance(60); audio.event?(.tick); await player.settle()
    #expect(player.sleepMinutes == 15) // The menu checks the chosen duration, not remaining minutes.
    player.setSleep(.episodeEnd); await player.settle()
    #expect(player.sleepMinutes == nil && player.display?.sleep == .episodeEnd)
    player.sleepAfter(minutes: 5); await player.settle()
    player.setSleep(nil); await player.settle()
    #expect(player.sleepMinutes == nil && player.display?.sleep == nil)
    player.sleepAfter(minutes: 5); await player.settle()
    clock.advance(300); audio.event?(.tick); await player.settle()
    #expect(player.sleepMinutes == nil && player.display?.sleep == nil)
    await player.shutdown()
}

@MainActor @Test func userTransportDonatesPlayOnceButAutomaticPlaybackDoesNot() async throws {
    let db = try await fixtureDatabase(), audio = FakeAudio()
    var received: [ActionDonation] = []
    let player = PlaybackController(database: db, origin: nil, audio: audio, systemIntegration: false, donate: { received.append($0) })
    player.refresh(); await player.settle()
    #expect(received.isEmpty)
    player.play(); await player.settle()
    #expect(received == [.play])
    player.toggle(); await player.settle()
    player.seek(10); player.refresh(); await player.settle()
    #expect(received == [.play])
    player.toggle(); await player.settle()
    #expect(received == [.play, .play])
    // A shared editing action starts audio internally; its editor donates the Episode action.
    try await player.performUserEdit(reload: true, start: true) {}
    #expect(received == [.play, .play])
    await player.shutdown()
}
