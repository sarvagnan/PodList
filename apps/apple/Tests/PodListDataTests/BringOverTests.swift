import Foundation
import Testing
import PodListDomain
import struct PodListDomain.Operation
@testable import PodListData

private func transferSubscription(_ id: String, removed: Bool = false) -> Subscription {
    Subscription(id: id, feedUrl: "https://publisher.example/\(id)", title: "Podcast \(id)", author: nil, description: nil,
        artwork: nil, subscribedAt: 1, unsubscribedAt: removed ? 2 : nil, playedThreshold: nil, playbackSettings: .init())
}
private func transferEpisode(_ id: String, sub: String) -> Episode {
    Episode(id: id, subscriptionId: sub, guid: "guid-\(id)", title: "Episode \(id)", description: "Vanished from feed",
        published: 1, duration: 300, audioUrl: "https://publisher.example/\(id).mp3", artwork: nil, chapters: [], audioUpdatedAt: nil)
}
private func transferSource(downloads: [BringOverDownload] = []) async throws -> (LocalDatabase, BringOverSnapshot) {
    let db = try LocalDatabase(path: ":memory:", standalone: true); try await db.ensureState()
    try await db.upsertLibrary(subscriptions: [transferSubscription("s1"), transferSubscription("s2", removed: true)],
                               episodes: [transferEpisode("e1", sub: "s1"), transferEpisode("e2", sub: "s2")])
    let device = try await db.installation()
    let changes: [Change] = [
        .createPlaylist(playlistId: "p", name: "Listen", clearOnPlayed: false),
        .addEntry(playlistId: "p", episodeId: "e1", placement: .last),
        .addEntry(playlistId: "p", episodeId: "e2", placement: .last),
        .reportPosition(playlistId: "p", episodeId: "e1", position: 45, listenedAt: 1_000_004),
        .setCursor(playlistId: "p", episodeId: "e1"), .setActivePlaylist(playlistId: "p"),
        .markPlayed(episodeId: "e2", source: .playback(playlistId: "p")), .setStar(episodeId: "e2", starred: true),
        .recordListening(amounts: [.init(day: "2026-11-11", subscriptionId: "s1", seconds: 12), .init(day: "2026-11-11", subscriptionId: "s2", seconds: 8)]),
        .saveView(view: .init(id: "v", name: "Selected", filter: .init(podcasts: .init(mode: .include, subscriptionIds: ["s1", "s2"])), sort: .publishedDesc, limit: nil)),
        .setDownloadRule(rule: .init(subscriptionId: "s1", deviceId: device.id, mode: .allNew, keepAtMost: 3))
    ]
    for (index, change) in changes.enumerated() { try await db.record(change, at: 1_000_000 + Int64(index), id: "source-op-\(index)") }
    return try await (db, db.bringOverSnapshot(downloads: downloads))
}

/// Models the existing identity-only metadata API, State deduplication and independent Library stream.
private actor BringOverServer: SyncTransport {
    var subscriptions: [Subscription] = []
    var episodes: [Episode] = []
    var state = State.initial()
    var seen = Set<String>()
    var cursor: Int64 = 1
    var libraryCursor: Int64 = 1
    var imports: [String] = []
    var pushes: [String] = []
    var registered = Set<String>()
    var failFeeds: Set<String> = []
    var loseImport = false
    var losePush = false
    var oldServer = false
    func configure(failFeeds: Set<String> = [], loseImport: Bool = false, losePush: Bool = false, oldServer: Bool = false) {
        self.failFeeds = failFeeds; self.loseImport = loseImport; self.losePush = losePush; self.oldServer = oldServer
    }
    func seed(collision: Bool = false, removed: Bool = false) {
        var sub = transferSubscription("s1", removed: removed); sub.id = "server-s1"; subscriptions = [sub]
        var ep = transferEpisode("e1", sub: sub.id); ep.id = "server-e1"; ep.title = "Server metadata wins"; episodes = [ep]
        if collision {
            state = StateRules.apply(state, change: .createPlaylist(playlistId: "p", name: "Listen", clearOnPlayed: true), at: 0)
            state = StateRules.apply(state, change: .saveView(view: .init(id: "v", name: "Selected", filter: .init(), sort: .publishedDesc, limit: nil)), at: 0)
        }
    }
    func request(method: String, path: String, body: String?) async throws -> String {
        switch path {
        case "/api/health": return #"{"status":"ok","protocolVersion":4}"#
        case "/api/devices":
            let device: Device = try ProtocolJSON.decode(from: body!); registered.insert(device.id); return body!
        case "/api/subscriptions/bring-over":
            if oldServer { throw HttpFailure(status: 404) }
            let metadata = try JSONSerialization.jsonObject(with: Data(body!.utf8)) as! [String: Any]
            let subs = metadata["subscriptions"] as! [[String: Any]]
            let feed = subs[0]["feedUrl"] as! String
            imports.append(feed)
            if failFeeds.contains(feed) { throw URLError(.networkConnectionLost) }
            for var value in subs {
                if subscriptions.contains(where: { $0.feedUrl == value["feedUrl"] as? String }) { continue }
                value["id"] = "server-" + String(subscriptions.count + 1)
                subscriptions.append(try JSONDecoder().decode(Subscription.self, from: JSONSerialization.data(withJSONObject: value)))
            }
            for var value in metadata["episodes"] as! [[String: Any]] {
                let sub = subscriptions.first { $0.feedUrl == value["feedUrl"] as? String }!
                if episodes.contains(where: { $0.subscriptionId == sub.id && $0.guid == value["guid"] as? String }) { continue }
                value["id"] = "server-episode-" + String(episodes.count + 1); value["subscriptionId"] = sub.id
                episodes.append(try JSONDecoder().decode(Episode.self, from: JSONSerialization.data(withJSONObject: value)))
            }
            libraryCursor += 1
            if loseImport { loseImport = false; throw URLError(.networkConnectionLost) }
            return ""
        case "/api/subscriptions":
            let feed = try ProtocolJSON.decode([String: String].self, from: body!)["feedUrl"]!
            let index = subscriptions.firstIndex { $0.feedUrl == feed }!
            subscriptions[index].unsubscribedAt = nil; libraryCursor += 1
            return try ProtocolJSON.encode(subscriptions[index])
        case "/api/sync/push":
            struct Body: Decodable { let operations: [Operation] }
            let ops = try ProtocolJSON.decode(Body.self, from: body!).operations
            #expect(ops.allSatisfy { registered.contains($0.deviceId) })
            pushes.append(body!)
            let replay = StateRules.replay(state, operations: ops, applied: seen)
            let accepted = replay.applied.count - seen.count
            state = replay.state; seen = replay.applied; cursor += Int64(accepted)
            if losePush { losePush = false; throw URLError(.networkConnectionLost) }
            return "{\"cursor\":\(cursor),\"accepted\":\(accepted)}"
        case let p where p.hasPrefix("/api/sync/pull"):
            return try ProtocolJSON.encode(PullPage(cursor: cursor, snapshot: state, operations: []))
        case let p where p.hasPrefix("/api/library/changes"):
            return try ProtocolJSON.encode(LibraryPage(cursor: libraryCursor, subscriptions: subscriptions, episodes: episodes, more: false))
        default: throw SyncResponseFailure("Unexpected \(method) \(path)")
        }
    }
}

@Test func bringOverPreviewIncludesAddsMergesPositionsFactsAndListening() async throws {
    let (_, source) = try await transferSource()
    let server = BringOverServer(); await server.seed()
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState()
    try await SyncClient(db: db, transport: server).sync()
    let preview = BringOverPreview(source: source, destination: try await db.readLibrary())
    #expect(preview.addedSubscriptions == 1 && preview.mergedSubscriptions == 1)
    #expect(preview.addedEpisodes == 1 && preview.mergedEpisodes == 1)
    #expect(preview.playlists == 1 && preview.entries == 2 && preview.positions == 1)
    #expect(preview.played == 1 && preview.starred == 1 && preview.listeningSeconds == 20 && preview.views == 1)
    #expect(preview.downloads == 0)
    #expect(try await db.bringOverJob() == nil)
    #expect(await server.imports.isEmpty)
    #expect(await server.pushes.isEmpty)
}

@Test func bringOverRestartsAfterLostPushWithoutDuplicatingListeningOrEntries() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let path = directory.appendingPathComponent("server.sqlite").path
    let (sourceDB, snapshot) = try await transferSource()
    let server = BringOverServer(); await server.seed(collision: true, removed: true)
    await server.configure(losePush: true)
    var payload: [Operation] = []
    do {
        let db = try LocalDatabase(path: path); try await db.ensureState()
        try await db.beginBringOver(snapshot)
        let transfer = BringOver(destination: db, transport: server)
        await #expect(throws: (any Error).self) { try await transfer.resume() }
        #expect(try await db.bringOverJob()?.queued == true)
        #expect(try await db.bringOverJob()?.complete == false)
        payload = try await db.outbox()
        #expect(payload.count == snapshot.operations.count)
    }
    let db = try LocalDatabase(path: path)
    let transfer = BringOver(destination: db, transport: server)
    #expect(try await transfer.resume().complete)
    #expect(try await db.outbox().isEmpty)
    let pushes = await server.pushes
    #expect(pushes.count == 2 && pushes[0] == pushes[1])
    #expect(payload.map(\.id) == snapshot.operations.map(\.id))
    #expect(payload.map(\.recordedAt) == snapshot.operations.map(\.recordedAt))
    #expect(payload.map(\.sequence) == snapshot.operations.map(\.sequence))
    let result = try await db.readLibrary(), state = result.state
    #expect(result.subscriptions.count == 2 && result.episodes.count == 2)
    #expect(result.episodes.first { $0.id == "server-e1" }?.title == "Server metadata wins")
    #expect(result.subscriptions.first { $0.id == "server-s1" }?.unsubscribedAt == nil)
    let playlist = try #require(state.playlists.first { $0.id != "p" && !$0.isDefault })
    #expect(playlist.name == "Listen 2" && playlist.entries.count == 2)
    #expect(playlist.entries.first { $0.episodeId == "server-e1" }?.position == 45)
    #expect(playlist.cursor == "server-e1" && state.activePlaylistId == playlist.id)
    #expect(playlist.history.count == 1 && playlist.timeline.count == 1)
    #expect(state.episodeStates.values.filter { $0.played != nil && $0.starred }.count == 1)
    #expect(state.views.count == 2 && state.views.last?.name == "Selected 2")
    #expect(state.views.last?.filter.podcasts?.subscriptionIds.contains("server-s1") == true)
    #expect(state.listeningLog?["2026-11-11"]?.values.reduce(0, +) == 20)
    #expect(state.downloadRules.first?.deviceId == (try await db.installation().id))
    #expect(try await sourceDB.readLibrary().state == snapshot.state)
    let importCount = await server.imports.count
    #expect(try await transfer.resume().complete)
    #expect(await server.imports.count == importCount)
    #expect(await server.pushes.count == 2)
}

@Test func bringOverRetriesOnlyUncheckpointedFeedsAfterLostMetadataResponse() async throws {
    let (_, snapshot) = try await transferSource()
    let server = BringOverServer(); await server.configure(loseImport: true)
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState(); try await db.beginBringOver(snapshot)
    let transfer = BringOver(destination: db, transport: server)
    let partial = try await transfer.resume()
    #expect(!partial.complete && !partial.queued && partial.imported.count == 1 && partial.issues.count == 1)
    #expect(try await db.outbox().isEmpty)
    #expect(await server.pushes.isEmpty)
    #expect(try await BringOver(destination: db, transport: server).resume().complete)
    #expect(await server.imports == [snapshot.subscriptions[0].feedUrl, snapshot.subscriptions[1].feedUrl, snapshot.subscriptions[0].feedUrl])
    #expect(await server.subscriptions.count == 2)
    #expect(await server.episodes.count == 2)
    #expect(try await db.loadState().listeningLog?["2026-11-11"]?.values.reduce(0, +) == 20)
}

@Test func oldServerExplainsMissingExistingAPIAndNeverQueuesPartialState() async throws {
    let (_, snapshot) = try await transferSource()
    let server = BringOverServer(); await server.configure(oldServer: true)
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState(); try await db.beginBringOver(snapshot)
    await #expect(throws: (any Error).self) { try await BringOver(destination: db, transport: server).resume() }
    #expect(try await db.bringOverJob()?.issues.first?.contains("/api/subscriptions/bring-over") == true)
    #expect(try await db.outbox().isEmpty)
    #expect(await server.pushes.isEmpty)
}

@Test func bringOverCopiesDownloadsResumablyAndRetainsOriginalFiles() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: directory) }
    let source = try AudioFiles(directory: directory.appendingPathComponent("source"))
    let partial = source.directory.appendingPathComponent("audio.part")
    try Data([1, 2, 3]).write(to: partial); _ = try source.commit(partial, id: "e1", expected: 3)
    let (_, snapshot) = try await transferSource(downloads: [.init(episodeID: "e1", bytes: 3), .init(episodeID: "e2", bytes: 3)])
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState(); try await db.beginBringOver(snapshot)
    let server = BringOverServer(), downloads = try DownloadStore(directory: directory.appendingPathComponent("destination"), identifier: UUID().uuidString)
    let transfer = BringOver(destination: db, transport: server, sourceFiles: source, destinationDownloads: downloads)
    await #expect(throws: (any Error).self) { try await transfer.resume() }
    #expect(try await db.bringOverJob()?.copied == ["e1"])
    #expect(await server.pushes.count == 1)
    let id = try #require(try await db.readLibrary().episodes.first { $0.guid == "guid-e1" }?.id)
    let first = try #require(await downloads.stored(id))
    let firstDate = try first.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate
    try Data([4, 5, 6]).write(to: partial); _ = try source.commit(partial, id: "e2", expected: 3)
    let reopened = try DownloadStore(directory: directory.appendingPathComponent("destination"), identifier: UUID().uuidString)
    #expect(try await BringOver(destination: db, transport: server, sourceFiles: source, destinationDownloads: reopened).resume().complete)
    #expect(try first.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate == firstDate)
    #expect(await reopened.statuses().values.allSatisfy { $0.phase == .stored && $0.manual })
    #expect(await reopened.statuses().count == 2)
    #expect(await server.pushes.count == 1)
    #expect(source.stored("e1", bytes: 3) != nil && source.stored("e2", bytes: 3) != nil)
}

@Test func unresolvedOperationReferenceRollsBackEntireBringOverQueue() async throws {
    let (source, _) = try await transferSource()
    try await source.record(.setStar(episodeId: "missing-metadata", starred: true), at: 1_000_020)
    let snapshot = try await source.bringOverSnapshot()
    let server = BringOverServer(), db = try LocalDatabase(path: ":memory:")
    try await db.ensureState(); try await db.beginBringOver(snapshot)
    await #expect(throws: (any Error).self) { try await BringOver(destination: db, transport: server).resume() }
    #expect(try await db.outbox().isEmpty)
    #expect(try await db.loadState() == .initial())
    #expect(try await db.bringOverJob()?.queued == false)
    #expect(try await db.bringOverJob()?.issues.first?.contains("missing-metadata") == true)
    #expect(await server.pushes.isEmpty)
}

@Test func bringOverUsesConcreteBulkPlayedOperationsAndKeepsServerOnlyEpisodesUnplayed() async throws {
    let (source, _) = try await transferSource()
    try await source.record(.markSubscriptionPlayed(subscriptionId: "s1"), at: 1_000_020)
    let snapshot = try await source.bringOverSnapshot()
    #expect(snapshot.operations.contains { if case .markSubscriptionPlayed = $0.change { true } else { false } })
    let server = BringOverServer(); await server.seedWithExtraEpisode()
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState(); try await db.beginBringOver(snapshot)
    #expect(try await BringOver(destination: db, transport: server).resume().complete)
    let state = try await db.loadState()
    #expect(state.episodeStates["server-e1"]?.played != nil)
    #expect(state.episodeStates["server-only"]?.played == nil)
    #expect(state.listeningLog?["2026-11-11"]?.values.reduce(0, +) == 20)
}

private extension BringOverServer {
    func seedWithExtraEpisode() {
        seed()
        var episode = transferEpisode("server-only", sub: "server-s1"); episode.id = "server-only"
        episodes.append(episode)
    }
}
