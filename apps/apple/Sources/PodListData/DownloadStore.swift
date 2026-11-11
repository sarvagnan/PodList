import Foundation
import PodListDomain

public enum DownloadPhase: String, Codable, Sendable { case queued, transferring, stored, failed }
public struct DownloadStatus: Codable, Equatable, Sendable {
    public var phase: DownloadPhase
    public var manual: Bool
    public var received: Int64 = 0
    public var total: Int64 = 0
    public var error: String?
    public var progress: DownloadProgress { DownloadProgress(received: received, total: total) }
}
private struct DownloadManifest: Codable {
    var statuses: [String: DownloadStatus] = [:]
    var sources: [String: [URL]] = [:]
    var legacySince: [String: Int64] = [:]
}

/// Persists ownership, failed state and queued requests separately from shared State. At most two
/// transfers run. A cancelled generation cannot commit, even if its transport completes late.
public actor DownloadStore {
    public let files: AudioFiles
    private let transport: any AudioDownloadTransport
    private let manifestURL: URL
    private var manifest: DownloadManifest
    private var running: [String: (UUID, Task<Void, Never>)] = [:]
    private var started = false
    private var suspended = false
    private let changed: @Sendable ([String: DownloadStatus]) -> Void

    public init(directory: URL, identifier: String, transport: (any AudioDownloadTransport)? = nil,
                changed: @escaping @Sendable ([String: DownloadStatus]) -> Void = { _ in }) throws {
        files = try AudioFiles(directory: directory)
        manifestURL = directory.appendingPathComponent("downloads.json")
        if FileManager.default.fileExists(atPath: manifestURL.path) {
            manifest = try JSONDecoder().decode(DownloadManifest.self, from: Data(contentsOf: manifestURL))
        } else { manifest = DownloadManifest() }
        self.transport = transport ?? URLSessionAudioTransport(identifier: identifier, directory: directory)
        self.changed = changed
    }
    public func start() async throws {
        guard !started else { return }; started = true
        await transport.recover()
        for (id, status) in manifest.statuses {
            if status.phase == .stored && files.stored(id, bytes: status.received) == nil { manifest.statuses.removeValue(forKey: id) }
            if status.phase == .transferring { manifest.statuses[id]?.phase = .queued }
        }
        // No transport owns an old partial after recover.
        for file in try FileManager.default.contentsOfDirectory(at: files.directory, includingPropertiesForKeys: nil) where file.pathExtension == "part" {
            try? FileManager.default.removeItem(at: file)
        }
        try publish(); pump()
    }
    func settle() async {
        while !running.isEmpty {
            let tasks = running.values.map { $0.1 }
            for task in tasks { await task.value }
        }
    }
    public func statuses() -> [String: DownloadStatus] { manifest.statuses }
    public func stored(_ id: String) -> URL? {
        guard let status = manifest.statuses[id], status.phase == .stored else { return nil }
        return files.stored(id, bytes: status.received)
    }
    public func bringOverDownloads() -> [BringOverDownload] {
        manifest.statuses.sorted { $0.key < $1.key }.compactMap { id, status in
            guard status.phase == .stored, files.stored(id, bytes: status.received) != nil else { return nil }
            return BringOverDownload(episodeID: id, bytes: status.received)
        }
    }
    /// An explicit bring-over keeps audio as Manual Downloads, independent of merged server rules.
    /// File replacement and the manifest commit happen in one actor turn; retries keep complete files.
    public func importStored(_ source: URL, id: String, bytes: Int64) throws {
        if stored(id) != nil { manifest.statuses[id]?.manual = true; try publish(); return }
        running.removeValue(forKey: id)?.1.cancel()
        let partial = files.directory.appendingPathComponent(UUID().uuidString + ".part")
        defer { try? FileManager.default.removeItem(at: partial) }
        try FileManager.default.copyItem(at: source, to: partial)
        let received = try files.commit(partial, id: id, expected: bytes)
        manifest.statuses[id] = DownloadStatus(phase: .stored, manual: true, received: received, total: received)
        try publish()
    }
    public func request(_ id: String, sources: [URL], manual: Bool = true) throws {
        if let status = manifest.statuses[id], status.phase != .failed {
            if manual { manifest.statuses[id]?.manual = true; try publish() }; return
        }
        manifest.statuses[id] = DownloadStatus(phase: .queued, manual: manual)
        manifest.sources[id] = sources
        try publish(); pump()
    }
    public func remove(_ id: String) throws {
        running.removeValue(forKey: id)?.1.cancel()
        try files.remove(id)
        manifest.statuses.removeValue(forKey: id); manifest.sources.removeValue(forKey: id)
        try publish(); pump()
    }
    public func suspend() async {
        suspended = true; running.values.forEach { $0.1.cancel() }; running = [:]
        await transport.shutdown()
    }
    public func apply(snapshot: LibrarySnapshot, deviceID: String, origin: URL?, now: Int64) throws {
        let entries = Set(snapshot.state.playlists.flatMap(\.entries).map(\.episodeId))
        let facts = snapshot.episodes.map { episode in
            DownloadEpisode(id: episode.id, subscriptionId: episode.subscriptionId, published: episode.published,
                entry: entries.contains(episode.id), played: snapshot.state.episodeStates[episode.id]?.played != nil,
                starred: snapshot.state.episodeStates[episode.id]?.starred == true)
        }
        let plan = DownloadPlanner.plan(deviceId: deviceID, rules: snapshot.state.downloadRules, episodes: facts,
            stored: manifest.statuses.filter { $0.value.phase == .stored }.map { StoredDownload(episodeId: $0.key, manual: $0.value.manual) },
            legacySince: manifest.legacySince, now: now)
        manifest.legacySince = plan.legacySince
        for id in plan.discard { try remove(id) }
        for id in plan.fetch where manifest.statuses[id] == nil {
            let episode = snapshot.episodes.first { $0.id == id }
            try request(id, sources: PlaybackPolicy.sources(stored: nil, host: episode.flatMap { URL(string: $0.audioUrl) }, proxy: origin.map { AudioSource.proxy($0, episodeID: id) }), manual: false)
        }
        try publish()
    }
    private func publish() throws {
        try JSONEncoder().encode(manifest).write(to: manifestURL, options: .atomic)
        changed(manifest.statuses)
    }
    private func pump() {
        guard started, !suspended else { return }
        for id in manifest.statuses.keys.sorted() where running.count < 2 && manifest.statuses[id]?.phase == .queued && running[id] == nil {
            let token = UUID(), sources = manifest.sources[id] ?? []
            manifest.statuses[id]?.phase = .transferring
            let task = Task { await transfer(id, token: token, sources: sources) }
            running[id] = (token, task)
        }
        changed(manifest.statuses)
    }
    private func transfer(_ id: String, token: UUID, sources: [URL]) async {
        var failure: (any Error) = SyncResponseFailure("No audio source")
        for url in sources {
            guard running[id]?.0 == token else { return }
            do {
                let result = try await transport.fetch(url) { [weak self] received, total in
                    Task { await self?.progress(id, token: token, received: received, total: total) }
                }
                defer { try? FileManager.default.removeItem(at: result.file) }
                guard running[id]?.0 == token, !Task.isCancelled else { return }
                let bytes = try files.commit(result.file, id: id, expected: result.expectedBytes)
                manifest.statuses[id]?.phase = .stored; manifest.statuses[id]?.received = bytes; manifest.statuses[id]?.total = bytes
                do { try publish() } catch { try? files.remove(id); throw error }
                running.removeValue(forKey: id); pump(); return
            } catch is CancellationError { return }
            catch { failure = error }
        }
        guard running[id]?.0 == token else { return }
        manifest.statuses[id]?.phase = .failed; manifest.statuses[id]?.error = String(describing: failure)
        running.removeValue(forKey: id)
        try? publish(); changed(manifest.statuses); pump()
    }
    private func progress(_ id: String, token: UUID, received: Int64, total: Int64) {
        guard running[id]?.0 == token else { return }
        manifest.statuses[id]?.received = received; manifest.statuses[id]?.total = total
        changed(manifest.statuses)
    }
}
public enum AudioSource {
    public static func proxy(_ origin: URL, episodeID: String) -> URL {
        var allowed = CharacterSet.urlPathAllowed
        allowed.remove(charactersIn: "/?#%.")
        var components = URLComponents(url: origin, resolvingAgainstBaseURL: false)!
        components.percentEncodedPath = "/api/episodes/" + (episodeID.addingPercentEncoding(withAllowedCharacters: allowed) ?? "") + "/audio"
        return components.url!
    }
}
