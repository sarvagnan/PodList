import Foundation
import CryptoKit
import PodListDomain
import struct PodListDomain.Operation

public struct BringOverDownload: Codable, Equatable, Sendable {
    public let episodeID: String
    public let bytes: Int64
}

/// Immutable source data lives separately from small, frequently saved progress checkpoints.
public struct BringOverSnapshot: Codable, Sendable {
    public let device: Device
    public let subscriptions: [Subscription]
    public let episodes: [Episode]
    public let state: State
    public let operations: [Operation]
    public let downloads: [BringOverDownload]
    public var worthMoving: Bool { !subscriptions.isEmpty || !operations.isEmpty || !downloads.isEmpty }
}

private struct EpisodeIdentity: Hashable { let subscriptionID: String; let guid: String }

public struct BringOverPreview: Sendable, Equatable {
    public let addedSubscriptions: Int
    public let mergedSubscriptions: Int
    public let addedEpisodes: Int
    public let mergedEpisodes: Int
    public let playlists: Int
    public let entries: Int
    public let positions: Int
    public let played: Int
    public let starred: Int
    public let listeningSeconds: Double
    public let downloads: Int
    public let views: Int

    public init(source: BringOverSnapshot, destination: LibrarySnapshot) {
        let feeds = Dictionary(uniqueKeysWithValues: destination.subscriptions.map { ($0.feedUrl, $0.id) })
        mergedSubscriptions = source.subscriptions.filter { feeds[$0.feedUrl] != nil }.count
        addedSubscriptions = source.subscriptions.count - mergedSubscriptions
        let sourceFeeds = Dictionary(uniqueKeysWithValues: source.subscriptions.map { ($0.id, $0.feedUrl) })
        let identities = Set(destination.episodes.map { EpisodeIdentity(subscriptionID: $0.subscriptionId, guid: $0.guid) })
        mergedEpisodes = source.episodes.filter { episode in
            guard let feed = sourceFeeds[episode.subscriptionId], let sub = feeds[feed] else { return false }
            return identities.contains(EpisodeIdentity(subscriptionID: sub, guid: episode.guid))
        }.count
        addedEpisodes = source.episodes.count - mergedEpisodes
        let all = source.state.playlists + (source.state.trash ?? []).map(\.playlist)
        playlists = all.filter { !$0.isDefault }.count
        entries = all.flatMap(\.entries).count
        positions = all.flatMap(\.entries).filter { $0.position > 0 }.count
        played = source.state.episodeStates.values.filter { $0.played != nil }.count
        starred = source.state.episodeStates.values.filter(\.starred).count
        listeningSeconds = (source.state.listeningLog ?? [:]).values.flatMap(\.values).reduce(0, +)
        downloads = source.downloads.count; views = source.state.views.count
    }
}

public struct BringOverJob: Codable, Sendable {
    public var imported: Set<String> = []
    public var subscribed: Set<String> = []
    public var queued = false
    public var copied: Set<String> = []
    public var complete = false
    public var issues: [String] = []
    var ids: BringOverIDs?
}

extension LocalDatabase {
    public func bringOverSnapshot(downloads: [BringOverDownload] = []) throws -> BringOverSnapshot {
        try storage.transaction {
            let library = try readLibrary()
            return BringOverSnapshot(device: try installation(), subscriptions: library.subscriptions, episodes: library.episodes,
                state: library.state, operations: try query("SELECT operation FROM local_operation ORDER BY seq").map {
                    try ProtocolJSON.decode(Operation.self, from: $0["operation"]!.string!)
                }, downloads: downloads)
        }
    }
    public func bringOverJob() throws -> BringOverJob? {
        try getMeta("bringOver").map { try ProtocolJSON.decode(BringOverJob.self, from: $0) }
    }
    public func beginBringOver(_ snapshot: BringOverSnapshot) throws {
        try storage.transaction {
            guard try bringOverJob() == nil else { return }
            try setMeta("bringOverSnapshot", ProtocolJSON.encode(snapshot))
            try saveBringOver(BringOverJob())
        }
    }
    func savedBringOverSnapshot() throws -> BringOverSnapshot {
        guard let text = try getMeta("bringOverSnapshot") else { throw SyncResponseFailure("Bring-over must be accepted first") }
        return try ProtocolJSON.decode(from: text)
    }
    func saveBringOver(_ job: BringOverJob) throws { try setMeta("bringOver", ProtocolJSON.encode(job)) }

    /// Enqueue and checkpoint together. A crash cannot leave a partial replay or enqueue twice.
    func queueBringOver(_ snapshot: BringOverSnapshot, ids: BringOverIDs) throws -> BringOverJob {
        try storage.transaction {
            guard var job = try bringOverJob() else { throw SyncResponseFailure("No bring-over job") }
            if job.queued { return job }
            var state = try loadState()
            let touchedViews = Set(snapshot.operations.compactMap { operation -> String? in
                switch operation.change { case let .saveView(view): view.id; case let .deleteView(id): id; default: nil }
            })
            let seeds = snapshot.state.views.filter { !touchedViews.contains($0.id) }.map {
                Operation(id: "bring-over:\(snapshot.device.id):view:\($0.id)", deviceId: snapshot.device.id, sequence: 0,
                          recordedAt: snapshot.device.registeredAt, change: .saveView(view: $0))
            }
            for original in seeds + snapshot.operations {
                // Local bulk intentions already have concrete MarkPlayed Operations in the log.
                if case .markSubscriptionPlayed = original.change { continue }
                var operation = original
                operation.change = try ids.rewrite(original.change)
                // Keep server names unique without merging unrelated Playlists or Views.
                switch operation.change {
                case let .createPlaylist(id, name, clear):
                    operation.change = .createPlaylist(playlistId: id, name: PlaylistNames.nextFreeName(name, playlists: state.playlists.filter { $0.id != id }), clearOnPlayed: clear)
                case let .renamePlaylist(id, name):
                    operation.change = .renamePlaylist(playlistId: id, name: PlaylistNames.nextFreeName(name, playlists: state.playlists.filter { $0.id != id }))
                case var .saveView(view):
                    var name = view.name, suffix = 2
                    while state.views.contains(where: { $0.id != view.id && PlaylistNames.matches($0.name, name) }) { name = "\(view.name) \(suffix)"; suffix += 1 }
                    view.name = name; operation.change = .saveView(view: view)
                default: break
                }
                try ProtocolValidation.validate(operation)
                try execute("INSERT INTO outbox (id, operation) VALUES (?, ?)", [.text(operation.id), .text(try ProtocolJSON.encode(operation))])
                state = StateRules.apply(state, change: operation.change, at: operation.recordedAt)
                if case let .restorePlaylist(id) = operation.change, let playlist = state.playlists.first(where: { $0.id == id }) {
                    let name = PlaylistNames.nextFreeName(playlist.name, playlists: state.playlists.filter { $0.id != id })
                    if name != playlist.name {
                        var rename = operation; rename.id += ":bring-over-name"; rename.change = .renamePlaylist(playlistId: id, name: name)
                        try execute("INSERT INTO outbox (id, operation) VALUES (?, ?)", [.text(rename.id), .text(try ProtocolJSON.encode(rename))])
                        state = StateRules.apply(state, change: rename.change, at: rename.recordedAt)
                    }
                }
            }
            try saveState(state)
            job.ids = ids; job.queued = true; job.issues = []
            try saveBringOver(job)
            return job
        }
    }
}

/// Every protocol reference is rewritten explicitly. Unmatched references fail before any replay.
struct BringOverIDs: Codable, Sendable {
    var subscriptions: [String: String]
    var episodes: [String: String]
    var playlists: [String: String]
    var views: [String: String]
    var sourceDevice: String
    var destinationDevice: String
    private func mapped(_ id: String, _ map: [String: String]) throws -> String {
        guard let result = map[id] else { throw SyncResponseFailure("Unmatched Library reference: \(id). Retry bring-over after Library sync") }
        return result
    }
    func rewrite(_ change: Change) throws -> Change {
        func e(_ id: String) throws -> String { try mapped(id, episodes) }
        func s(_ id: String) throws -> String { try mapped(id, subscriptions) }
        func p(_ id: String) -> String { playlists[id] ?? id }
        func amounts(_ values: [ListeningAmount]) throws -> [ListeningAmount] {
            try values.map { var value = $0; value.subscriptionId = try s(value.subscriptionId); return value }
        }
        switch change {
        case let .addEntry(id, episode, placement): return try .addEntry(playlistId: p(id), episodeId: e(episode), placement: placement)
        case let .moveEntry(id, episode, after): return try .moveEntry(playlistId: p(id), episodeId: e(episode), after: after.map(e))
        case let .removeEntry(id, episode): return try .removeEntry(playlistId: p(id), episodeId: e(episode))
        case let .setCursor(id, episode): return try .setCursor(playlistId: p(id), episodeId: episode.map(e))
        case let .reportPosition(id, episode, position, at, listening):
            return try .reportPosition(playlistId: p(id), episodeId: e(episode), position: position, listenedAt: at, listening: listening.map(amounts))
        case let .recordListening(values): return try .recordListening(amounts: amounts(values))
        case let .markPlayed(episode, source):
            let mappedSource: PlayedSource = if case let .playback(id) = source { .playback(playlistId: p(id)) } else { .user }
            return try .markPlayed(episodeId: e(episode), source: mappedSource)
        case let .markUnplayed(episode): return try .markUnplayed(episodeId: e(episode))
        case .markSubscriptionPlayed: throw SyncResponseFailure("Bulk Played must be expanded on the Standalone Device")
        case let .setStar(episode, value): return try .setStar(episodeId: e(episode), starred: value)
        case let .createPlaylist(id, name, clear): return .createPlaylist(playlistId: p(id), name: name, clearOnPlayed: clear)
        case let .renamePlaylist(id, name): return .renamePlaylist(playlistId: p(id), name: name)
        case let .setClearOnPlayed(id, clear): return .setClearOnPlayed(playlistId: p(id), clearOnPlayed: clear)
        case let .deletePlaylist(id): return .deletePlaylist(playlistId: p(id))
        case let .restorePlaylist(id): return .restorePlaylist(playlistId: p(id))
        case let .setActivePlaylist(id): return .setActivePlaylist(playlistId: p(id))
        case let .rewind(id, to): return .rewind(playlistId: p(id), to: to)
        case var .saveView(view):
            view.id = views[view.id] ?? view.id
            if var podcasts = view.filter.podcasts { podcasts.subscriptionIds = try podcasts.subscriptionIds.map(s); view.filter.podcasts = podcasts }
            return .saveView(view: view)
        case let .deleteView(id): return .deleteView(viewId: views[id] ?? id)
        case var .setDownloadRule(rule):
            rule.subscriptionId = try s(rule.subscriptionId)
            if rule.deviceId == sourceDevice { rule.deviceId = destinationDevice }
            return .setDownloadRule(rule: rule)
        case let .setSubscriptionOverrides(id, settings, threshold):
            return try .setSubscriptionOverrides(subscriptionId: s(id), playbackSettings: settings, playedThreshold: threshold)
        case .setPlaybackSettings, .setTrashDays: return change
        }
    }
    static func make(_ source: BringOverSnapshot, destination: LibrarySnapshot, device: String) throws -> BringOverIDs {
        func distinct(_ kind: String, _ id: String) -> String {
            "bring-over-" + SHA256.hash(data: Data("\(source.device.id)/\(kind)/\(id)".utf8)).map { String(format: "%02x", $0) }.joined()
        }
        let feeds = Dictionary(uniqueKeysWithValues: destination.subscriptions.map { ($0.feedUrl, $0.id) })
        let identities = Dictionary(uniqueKeysWithValues: destination.episodes.map { (EpisodeIdentity(subscriptionID: $0.subscriptionId, guid: $0.guid), $0.id) })
        var subscriptions: [String: String] = [:], episodes: [String: String] = [:]
        for sub in source.subscriptions {
            guard let target = feeds[sub.feedUrl] else { throw SyncResponseFailure("Subscription is still missing: \(sub.title)") }
            subscriptions[sub.id] = target
        }
        for episode in source.episodes {
            guard let sub = subscriptions[episode.subscriptionId], let target = identities[EpisodeIdentity(subscriptionID: sub, guid: episode.guid)] else { throw SyncResponseFailure("Episode is still missing: \(episode.title)") }
            episodes[episode.id] = target
        }
        var playlists = [defaultPlaylistId: defaultPlaylistId], views: [String: String] = [:]
        let occupied = Set((destination.state.playlists + (destination.state.trash ?? []).map(\.playlist)).map(\.id))
        for operation in source.operations {
            if case let .createPlaylist(id, _, _) = operation.change { playlists[id] = occupied.contains(id) ? distinct("playlist", id) : id }
            switch operation.change {
            case let .saveView(view): views[view.id] = destination.state.views.contains { $0.id == view.id } ? distinct("view", view.id) : view.id
            case let .deleteView(id): views[id] = destination.state.views.contains { $0.id == id } ? distinct("view", id) : id
            default: break
            }
        }
        for view in source.state.views where views[view.id] == nil { views[view.id] = destination.state.views.contains { $0.id == view.id } ? distinct("view", view.id) : view.id }
        return BringOverIDs(subscriptions: subscriptions, episodes: episodes, playlists: playlists, views: views, sourceDevice: source.device.id, destinationDevice: device)
    }
}

/// Owns one resumable transfer. No network call holds a SQLite transaction.
public actor BringOver {
    private let destination: LocalDatabase
    private let transport: any SyncTransport
    private let sync: SyncClient
    private let sourceFiles: AudioFiles?
    private let destinationDownloads: DownloadStore?
    private var inFlight: Task<BringOverJob, any Error>?
    public init(destination: LocalDatabase, transport: any SyncTransport, sync: SyncClient? = nil,
                sourceFiles: AudioFiles? = nil, destinationDownloads: DownloadStore? = nil) {
        self.destination = destination; self.transport = transport
        self.sync = sync ?? SyncClient(db: destination, transport: transport)
        self.sourceFiles = sourceFiles; self.destinationDownloads = destinationDownloads
    }
    public func resume() async throws -> BringOverJob {
        if let inFlight { return try await inFlight.value }
        let task = Task { try await perform() }; inFlight = task
        defer { inFlight = nil }
        return try await task.value
    }
    public func suspend() async {
        let task = inFlight
        task?.cancel()
        _ = try? await task?.value
    }
    private func perform() async throws -> BringOverJob {
        guard var job = try await destination.bringOverJob() else { throw SyncResponseFailure("Accept bring-over before retrying") }
        if job.complete { return job }
        let snapshot = try await destination.savedBringOverSnapshot()
        do {
            if !job.queued {
                // Import metadata, including vanished Back Catalogue, via the existing identity-only API.
                // Each feed is its own checkpoint. Lost responses are safe: the API inserts missing identities only.
                var failures: [String] = []
                for sub in snapshot.subscriptions where !job.imported.contains(sub.id) {
                    try Task.checkCancellation()
                    do {
                        let body = try metadata(snapshot, subscription: sub)
                        _ = try await transport.request(method: "POST", path: "/api/subscriptions/bring-over", body: body)
                        job.imported.insert(sub.id); try await destination.saveBringOver(job)
                    } catch let error as HttpFailure where error.status == 404 {
                        throw SyncResponseFailure("This server needs the existing /api/subscriptions/bring-over API to preserve Episodes no longer in feeds. Update the server, then retry")
                    } catch is CancellationError { throw CancellationError() }
                    catch { failures.append("\(sub.title): \(error)") }
                }
                job.issues = failures; try await destination.saveBringOver(job)
                try await sync.sync()
                // Metadata import never changes existing server rows. Follow active local Subscriptions explicitly.
                let library = try await destination.readLibrary()
                for sub in snapshot.subscriptions where sub.unsubscribedAt == nil && !job.subscribed.contains(sub.id) {
                    guard job.imported.contains(sub.id) else { continue }
                    do {
                        if library.subscriptions.first(where: { $0.feedUrl == sub.feedUrl })?.unsubscribedAt != nil {
                            _ = try await transport.request(method: "POST", path: "/api/subscriptions", body: ProtocolJSON.encode(["feedUrl": sub.feedUrl]))
                        }
                        job.subscribed.insert(sub.id); try await destination.saveBringOver(job)
                    } catch is CancellationError { throw CancellationError() }
                    catch { failures.append("\(sub.title): \(error)") }
                }
                if !failures.isEmpty { job.issues = failures; try await destination.saveBringOver(job); return job }
                try await sync.sync()
                try Task.checkCancellation()
                let ids = try await BringOverIDs.make(snapshot, destination: destination.readLibrary(), device: destination.installation().id)
                // Register the source Device before pushing its original stable Operation ids and sequences.
                _ = try await transport.request(method: "POST", path: "/api/devices", body: ProtocolJSON.encode(snapshot.device))
                job = try await destination.queueBringOver(snapshot, ids: ids)
            }
            try await sync.sync()
            guard let ids = job.ids else { throw SyncResponseFailure("Missing bring-over mapping") }
            for download in snapshot.downloads where !job.copied.contains(download.episodeID) {
                try Task.checkCancellation()
                guard let sourceFiles, let destinationDownloads, let id = ids.episodes[download.episodeID],
                      let file = sourceFiles.stored(download.episodeID, bytes: download.bytes) else { throw SyncResponseFailure("A stored download is missing. The original Library is retained; restore the file and retry") }
                try await destinationDownloads.importStored(file, id: id, bytes: download.bytes)
                job.copied.insert(download.episodeID); try await destination.saveBringOver(job)
            }
            try Task.checkCancellation()
            job.complete = true; job.issues = []; try await destination.saveBringOver(job)
            return job
        } catch {
            job.issues = [String(describing: error)]; try await destination.saveBringOver(job)
            throw error
        }
    }
    private func metadata(_ snapshot: BringOverSnapshot, subscription: Subscription) throws -> String {
        var sub = try JSONSerialization.jsonObject(with: Data(ProtocolJSON.encode(subscription).utf8)) as! [String: Any]
        sub.removeValue(forKey: "id")
        let episodes = try snapshot.episodes.filter { $0.subscriptionId == subscription.id }.map { episode in
            var value = try JSONSerialization.jsonObject(with: Data(ProtocolJSON.encode(episode).utf8)) as! [String: Any]
            value.removeValue(forKey: "id"); value.removeValue(forKey: "subscriptionId"); value["feedUrl"] = subscription.feedUrl
            return value
        }
        return String(decoding: try JSONSerialization.data(withJSONObject: ["subscriptions": [sub], "episodes": episodes]), as: UTF8.self)
    }
}
