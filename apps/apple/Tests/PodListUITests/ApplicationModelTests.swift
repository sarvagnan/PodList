import Foundation
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

@MainActor final class MemoryConnectionStore: ConnectionStore {
    var currentOrigin: String?
    var ids: [String: String] = [:]
    func databaseID(for origin: String) -> String {
        if let id = ids[origin] { return id }
        let id = UUID().uuidString; ids[origin] = id; return id
    }
}

private struct Offline: Error {}
private actor FakeTransport: SyncTransport {
    var offline = false
    var updateRequired = false
    func setUpdateRequired(_ value: Bool) { updateRequired = value }
    var healthResponse = #"{"status":"ok","protocolVersion":4}"#
    var snapshot: State
    init(snapshot: State = fixtureState()) { self.snapshot = snapshot }
    var paths: [String] = []
    private var podcastRefreshFails = false
    private var otherPodcastRefreshFails = false
    func setRefreshFailures(otherPodcast: Bool = false, podcast: Bool = false) {
        otherPodcastRefreshFails = otherPodcast; podcastRefreshFails = podcast
    }
    private var pauseNextRefresh = false
    private var pausedRefresh: CheckedContinuation<Void, Never>?
    private var refreshWaiter: CheckedContinuation<Void, Never>?
    func holdNextRefresh() { pauseNextRefresh = true }
    func waitForPausedRefresh() async {
        if pausedRefresh != nil { return }
        await withCheckedContinuation { refreshWaiter = $0 }
    }
    func releaseRefresh() { pausedRefresh?.resume(); pausedRefresh = nil }
    var seen = Set<String>()
    private var pauseNextPull = false
    private var pausedPull: CheckedContinuation<Void, Never>?
    private var pauseWaiter: CheckedContinuation<Void, Never>?
    func setOffline(_ value: Bool) { offline = value }
    func setHealth(_ value: String) { healthResponse = value }
    func holdNextPull() { pauseNextPull = true }
    func waitForPausedPull() async {
        if pausedPull != nil { return }
        await withCheckedContinuation { pauseWaiter = $0 }
    }
    func releasePull() { pausedPull?.resume(); pausedPull = nil }
    func request(method: String, path: String, body: String?) async throws -> String {
        paths.append(path)
        if offline { throw Offline() }
        switch path {
        case "/api/health": return healthResponse
        case "/api/devices": return body!
        case "/api/subscriptions/s/refresh":
            if pauseNextRefresh {
                pauseNextRefresh = false
                await withCheckedContinuation { continuation in
                    pausedRefresh = continuation
                    refreshWaiter?.resume(); refreshWaiter = nil
                }
                try Task.checkCancellation()
            }
            if podcastRefreshFails { throw FeedRefreshFailure.publisherFailed }
            return #"{"_tag":"Updated","added":1,"changed":0}"#
        case "/api/subscriptions/t/refresh":
            if otherPodcastRefreshFails { throw FeedRefreshFailure.publisherFailed }
            return #"{"_tag":"NotModified"}"#
        case "/api/subscriptions/bring-over": return ""
        case "/api/sync/push":
            struct Push: Decodable { let operations: [PodListDomain.Operation] }
            let operations = try ProtocolJSON.decode(Push.self, from: body!).operations
            let result = StateRules.replay(snapshot, operations: operations, applied: seen)
            snapshot = result.state; seen = result.applied
            return #"{"accepted":0,"cursor":8}"#
        case let p where p.hasPrefix("/api/sync/pull"):
            if updateRequired { throw SyncCompatibilityFailure("UpdateRequired", minimumProtocolVersion: 6) }
            if pauseNextPull {
                pauseNextPull = false
                await withCheckedContinuation { continuation in
                    pausedPull = continuation
                    pauseWaiter?.resume(); pauseWaiter = nil
                }
            }
            return try ProtocolJSON.encode(PullPage(cursor: 8, snapshot: snapshot, operations: []))
        case let p where p.hasPrefix("/api/library/changes"):
            return try ProtocolJSON.encode(LibraryPage(cursor: 9, subscriptions: [subscription(), subscription("t", title: "Talk")], episodes: [episode(), episode("b")], more: false))
        default: throw SyncResponseFailure("Unexpected request \(method) \(path)")
        }
    }
}

@MainActor @Test func playlistSettingsRenameUndoesAndRedoesAcrossSyncedLibraryDestinations() async throws {
    let id = "settings-commute"
    var initial = fixtureState()
    initial.playlists.append(.init(id: id, name: "Commute", isDefault: false, clearOnPlayed: true,
                                  entries: [], cursor: nil, history: [], timeline: []))
    let db = try LocalDatabase(path: ":memory:")
    let transport = FakeTransport(snapshot: initial)
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false,
                               databaseFactory: { _ in db }, transportFactory: { _ in transport })
    app.serverInput = "https://example.com"
    await app.connect()
    let editing = try #require(app.editing)
    let editor = try #require(app.libraryEditing)
    let playlist = try #require(app.library?.state.playlists.first { $0.id == id })
    let window = WindowModel()
    window.navigate(to: .playlist(id))
    var draft = editing.drafts.playlistSettings(playlist)
    draft.name = "  Commute edited  "
    let saved = await EditOrigin.$current.withValue(.library(window.destination)) {
        await draft.apply(playlistName: playlist.name, using: editing)
    }
    try #require(saved)
    #expect(editing.undoTitle == "Undo Settings for Commute")

    func checkName(_ expected: String) async throws {
        #expect(try await db.loadState().playlists.first { $0.id == id }?.name == expected)
        await app.sync()
        #expect(app.library?.sidebar.flatMap(\.items).first { $0.destination == .playlist(id) }?.name == expected)
        #expect(await transport.snapshot.playlists.first { $0.id == id }?.name == expected)
        #expect(editor.error == nil)
    }

    try await checkName("Commute edited")
    // The pull still contains the pre-Undo server snapshot when it completes.
    await transport.holdNextPull()
    let refreshDuringUndo = Task { await app.sync() }
    await transport.waitForPausedPull()
    await editor.undo { #expect($0.isEmpty) }
    #expect(editing.redoTitle == "Redo Settings for Commute")
    await transport.releasePull()
    await refreshDuringUndo.value
    #expect(app.library?.state.playlists.first { $0.id == id }?.name == "Commute")

    // Now let sync push Undo and hold that snapshot while Search dispatches Redo.
    await transport.holdNextPull()
    let refreshDuringRedo = Task { await app.sync() }
    await transport.waitForPausedPull()
    window.navigate(to: .trash)
    window.navigate(to: .search)
    #expect(editing.historyTitle(at: .library(window.destination), redo: true) == nil)
    await editor.redo { #expect($0.isEmpty) }
    #expect(editing.undoTitle == "Undo Settings for Commute")
    await transport.releasePull()
    await refreshDuringRedo.value
    #expect(app.library?.state.playlists.first { $0.id == id }?.name == "Commute edited")
    try await checkName("Commute edited")
    await editor.undo { #expect($0.isEmpty) }
    #expect(editing.redoTitle == "Redo Settings for Commute")
    try await checkName("Commute")
    app.disconnect()
}

@MainActor @Test func manualFeedRefreshPostsThenSyncsAndDisablesBothCommandsUntilDone() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let transport = FakeTransport()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db }, transportFactory: { _ in transport })
    #expect(app.feedRefreshAction(.all) == nil)
    app.serverInput = "https://example.com"
    await app.connect()
    var announcements: [String] = []
    app.announcements.post = { text, _ in announcements.append(text) }
    #expect(PersistentMenuActions.context(app)[.refresh] != nil)
    #expect(PersistentMenuActions.context(app)[.retryFeedRefresh] == nil)
    #expect(app.feedRefreshAction(.subscription("s")) != nil)
    #expect(app.feedRefreshAction(.subscription("missing")) == nil)
    let initialRequestCount = await transport.paths.count
    await transport.setRefreshFailures(otherPodcast: true)
    await transport.holdNextPull()
    let refresh = Task { await app.refreshFeeds(.all) }
    await transport.waitForPausedPull()
    #expect(app.feedRefreshProgress == "Syncing refreshed feeds…")
    #expect(app.feedRefreshCount == FeedRefreshCount(completed: 2, total: 2))
    #expect(!app.canCancelFeedRefresh)
    #expect(PersistentMenuActions.context(app)[.refresh] == nil)
    #expect(app.feedRefreshAction(.subscription("s")) == nil)
    await app.refreshFeeds(.subscription("s"))
    await transport.releasePull()
    await refresh.value
    let allPaths = await transport.paths.dropFirst(initialRequestCount)
    #expect(Array(allPaths.prefix(2)) == ["/api/subscriptions/s/refresh", "/api/subscriptions/t/refresh"])
    #expect(allPaths.contains { $0.hasPrefix("/api/library/changes?") })
    #expect(app.feedRefreshProgress == nil && app.syncError == nil)
    #expect(app.feedRefreshIssue?.target == .all)
    #expect(announcements == ["Refreshing All Feeds…", "Could not refresh 1 of 2 feeds. Try again."])
    #expect(PersistentMenuActions.context(app)[.retryFeedRefresh] != nil)

    await app.refreshFeeds(.subscription("s"))
    let podcastPaths = await transport.paths.dropFirst(initialRequestCount + allPaths.count)
    #expect(podcastPaths.first == "/api/subscriptions/s/refresh")
    #expect(podcastPaths.contains { $0.hasPrefix("/api/library/changes?") })
    #expect(app.feedRefreshIssue == nil)
    #expect(announcements.suffix(2) == ["Refreshing Science…", "Podcast refreshed."])

    await transport.setRefreshFailures(podcast: true)
    await app.refreshFeeds(.subscription("s"))
    #expect(app.feedRefreshIssue?.target == .subscription("s"))
    #expect(app.feedRefreshIssue?.message == "Could not refresh “Science”. Check your connection and try again.")
    #expect(app.syncError == nil)
    app.disconnect()
    #expect(app.feedRefreshIssue == nil)
}

@MainActor @Test func disconnectIgnoresAnEarlierSessionsDelayedSync() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let store = MemoryConnectionStore(), transport = FakeTransport()
    let app = ApplicationModel(store: store, automaticSync: false, databaseFactory: { _ in db }, transportFactory: { _ in transport })
    app.serverInput = "https://example.com"
    await app.connect()
    await transport.holdNextPull()
    let syncing = Task { await app.sync() }
    await transport.waitForPausedPull()
    #expect(app.syncing)
    app.disconnect()
    await transport.releasePull()
    await syncing.value
    #expect(app.library == nil && app.origin == nil && !app.syncing)
    #expect(app.syncError == nil && app.lastSync == nil && store.currentOrigin == nil)
}

@Test func firstRunAddressValidation() throws {
    #expect(try ConnectionValidation.address(" https://PODLIST.example/ \n").origin.absoluteString == "https://podlist.example")
    #expect(try ConnectionValidation.address("http://127.0.0.1:8080").origin.port == 8080)
    for input in ["", "podlist.example", "http://example.com", "https://x/api", "https://user:secret@x", "https://x?token=1", "file:///tmp/db", "https://x:0"] {
        #expect(throws: (any Error).self) { try ConnectionValidation.address(input) }
    }
}

@MainActor @Test func connectChecksHealthPersistsAndSyncsThenRetriesOffline() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let store = MemoryConnectionStore(), transport = FakeTransport()
    let app = ApplicationModel(store: store, automaticSync: false, databaseFactory: { _ in db }, transportFactory: { _ in transport })
    await app.start()
    #expect(!app.starting && app.library == nil)
    app.serverInput = "http://127.0.0.1:4040"
    await app.connect()
    #expect(app.origin == "http://127.0.0.1:4040")
    #expect(store.currentOrigin == app.origin)
    #expect(app.library?.rows(for: .view("all")).count == 2)
    #expect(app.lastSync != nil && app.syncError == nil)
    #expect(await transport.paths == ["/api/health", "/api/devices", "/api/sync/pull?since=0", "/api/library/changes?since=0"])
    #expect(try await db.outbox().isEmpty)
    await transport.setOffline(true)
    await app.sync()
    #expect(app.syncError != nil)
    #expect(app.library?.snapshot.episodes.count == 2)
    await transport.setOffline(false)
    await app.sync()
    #expect(app.syncError == nil)
    #expect(await transport.paths.contains("/api/sync/pull?since=8"))
    app.disconnect()
    #expect(app.origin == nil && app.library == nil && store.currentOrigin == nil)
    #expect(try await db.readLibrary().episodes.count == 2)
}

@MainActor @Test func connectedPermanentDeletionChecksFreshSupportAndLeavesOldServerSyncUsable() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let transport = FakeTransport()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db }, transportFactory: { _ in transport })
    app.serverInput = "https://example.com"
    await app.connect()
    let editing = try #require(app.editing)
    let id = try #require(await editing.create(name: "To Delete"))
    let playlist = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(await editing.delete(playlist))
    await app.sync()
    let before = try await db.loadState()
    let undo = editing.history.undo?.id
    #expect(await editing.deletePermanently(id) == false)
    #expect(editing.error?.contains("Update the PodList server") == true)
    #expect(editing.history.undo?.id == undo)
    #expect(try await db.loadState() == before)
    #expect(try await db.outbox().isEmpty)
    #expect(await editing.setStar(["a"], starred: true))
    await app.sync()
    #expect(app.syncError == nil)
    #expect(try await db.outbox().isEmpty)
    await transport.setHealth(#"{"status":"ok","protocolVersion":5}"#)
    #expect(await editing.deletePermanently(id))
    await app.sync()
    #expect(app.syncError == nil)
    #expect(try await db.outbox().isEmpty)
    #expect(try await db.loadState().trash?.contains { $0.playlist.id == id } == false)
    app.disconnect()
}

@MainActor @Test func failedHealthNeverPersistsConnectionAndInvalidInputDoesNotCallNetwork() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let store = MemoryConnectionStore(), transport = FakeTransport()
    let app = ApplicationModel(store: store, automaticSync: false, databaseFactory: { _ in db }, transportFactory: { _ in transport })
    app.serverInput = "http://remote.example"
    await app.connect()
    #expect(app.connectionError != nil && !app.connecting)
    #expect(await transport.paths.isEmpty)
    app.serverInput = "https://example.com"
    await transport.setHealth(#"{"status":"broken","protocolVersion":4}"#)
    await app.connect()
    #expect(store.currentOrigin == nil && app.library == nil && app.connectionError != nil)
    await transport.setHealth("not json")
    await app.connect()
    #expect(app.connectionError?.contains("unreadable") == true)
}

@MainActor @Test func launchLoadsCachedLibraryBeforeOfflineSyncAndKeepsDeviceIdentity() async throws {
    let db = try await fixtureDatabase()
    let id = try await db.installation().id
    try await db.setMeta("registered", "true")
    let store = MemoryConnectionStore(), transport = FakeTransport()
    store.currentOrigin = "https://example.com"
    await transport.setOffline(true)
    let app = ApplicationModel(store: store, automaticSync: false, databaseFactory: { _ in db }, transportFactory: { _ in transport })
    await app.start()
    #expect(app.library?.snapshot.state == fixtureState())
    #expect(app.origin == "https://example.com" && app.syncError != nil)
    #expect(app.library?.deviceID == id)
    #expect(try await db.installation().id == id)
    let requestCount = await transport.paths.count
    await app.start()
    #expect(await transport.paths.count == requestCount)
    #expect(await transport.paths.allSatisfy { $0 != "/api/devices" && $0 != "/api/health" })
}

@MainActor @Test func persistentStoreSeparatesServersAndRetainsDatabaseIDsOnDisconnect() throws {
    let suite = "PodListUITests." + UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let first = UserDefaultsConnectionStore(defaults: defaults)
    let a = first.databaseID(for: "https://a.example"), b = first.databaseID(for: "https://b.example")
    #expect(a != b)
    first.currentOrigin = "https://a.example"
    let restarted = UserDefaultsConnectionStore(defaults: defaults)
    #expect(restarted.currentOrigin == "https://a.example")
    restarted.currentOrigin = nil
    #expect(restarted.databaseID(for: "https://a.example") == a)
    #expect(restarted.databaseID(for: "https://b.example") == b)
}


@MainActor @Test func standaloneBringOverDeclineKeepsLibrariesSeparateAndOfferInSettings() async throws {
    let source = try LocalDatabase(path: ":memory:", standalone: true), server = try LocalDatabase(path: ":memory:")
    try await source.ensureState()
    var local = episode(); local.id = "local-a"
    try await source.upsertLibrary(subscriptions: [subscription()], episodes: [local])
    try await source.record(.setStar(episodeId: local.id, starred: true), at: 1)
    let before = try await source.readLibrary()
    let store = MemoryConnectionStore(), transport = FakeTransport()
    let app = ApplicationModel(store: store, automaticSync: false, databaseFactory: { $0 == "standalone" ? source : server }, transportFactory: { _ in transport })
    await app.startStandalone()
    app.serverInput = "https://example.com"
    await app.connect()
    #expect(app.origin == "https://example.com" && app.bringOverPreview?.mergedEpisodes == 1)
    #expect(app.bringOverPreview?.starred == 1)
    app.declineBringOver()
    #expect(app.bringOverPreview == nil && app.bringOverAvailable)
    #expect(try await server.bringOverJob() == nil)
    #expect(try await source.readLibrary() == before)
    #expect(try await server.loadState() == fixtureState())
    #expect(await transport.paths.allSatisfy { !$0.contains("bring-over") && !$0.contains("push") })
    await app.offerBringOver()
    #expect(app.bringOverPreview != nil)
    app.declineBringOver(); app.disconnect()
    await app.startStandalone()
    #expect(app.isStandalone && app.library?.snapshot.episodes.first?.id == "local-a")
    app.disconnect()
}

@MainActor @Test func acceptedBringOverResumesOnServerLaunchAfterOfflineFailure() async throws {
    let source = try LocalDatabase(path: ":memory:", standalone: true), server = try LocalDatabase(path: ":memory:")
    try await source.ensureState()
    var local = episode(); local.id = "local-a"
    try await source.upsertLibrary(subscriptions: [subscription()], episodes: [local])
    try await source.record(.setStar(episodeId: local.id, starred: true), at: 1)
    let store = MemoryConnectionStore(), transport = FakeTransport()
    let app = ApplicationModel(store: store, automaticSync: false, databaseFactory: { $0 == "standalone" ? source : server }, transportFactory: { _ in transport })
    await app.startStandalone(); app.serverInput = "https://example.com"; await app.connect()
    #expect(app.bringOverPreview != nil)
    await transport.setOffline(true)
    await app.acceptBringOver()
    #expect(try await server.bringOverJob()?.complete == false)
    #expect(app.bringOverError != nil && app.bringOverPreview == nil)
    app.disconnect()
    store.currentOrigin = "https://example.com"
    await transport.setOffline(false)
    let restarted = ApplicationModel(store: store, automaticSync: false, databaseFactory: { $0 == "standalone" ? source : server }, transportFactory: { _ in transport })
    await restarted.start()
    #expect(restarted.bringOverJob?.complete == true && restarted.bringOverError == nil)
    #expect(restarted.library?.state.episodeStates["a"]?.starred == true)
    #expect(try await source.loadState().episodeStates["local-a"]?.starred == true)
    #expect(!restarted.bringOverAvailable && restarted.bringOverPreview == nil)
    restarted.disconnect()
}

@MainActor @Test func compatibilityPauseAnnouncesUpdateKeepsLocalEditsAndRequiresManualRetry() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let transport = FakeTransport()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db }, transportFactory: { _ in transport })
    app.serverInput = "https://example.com"
    await app.connect()
    var announcements: [String] = []
    app.announcements.post = { text, _ in announcements.append(text) }
    await transport.setUpdateRequired(true)
    await app.sync()
    #expect(app.syncError == "Update PodList to keep syncing")
    #expect(announcements.contains("Update PodList to keep syncing"))
    let count = await transport.paths.count
    let editing = try #require(app.editing)
    #expect(await editing.setStar(["a"], starred: true))
    await app.sync()
    #expect(app.syncError == "Update PodList to keep syncing")
    #expect(await transport.paths.count == count)
    #expect(try await db.outbox().count == 1)
    await transport.setUpdateRequired(false)
    await app.sync(forceRefresh: true)
    #expect(app.syncError == nil)
    #expect(try await db.outbox().isEmpty)
    #expect(try await db.loadState().episodeStates["a"]?.starred == true)
    app.disconnect()
}

@MainActor @Test func cancelledFeedRefreshStopsBeforeCheckingAnotherPublisher() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let transport = FakeTransport()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false,
                               databaseFactory: { _ in db }, transportFactory: { _ in transport })
    app.serverInput = "https://example.com"
    await app.connect()
    await transport.holdNextRefresh()
    let refresh = Task { await app.refreshFeeds(.all) }
    await transport.waitForPausedRefresh()
    #expect(app.feedRefreshProgress == "Refreshing 1 of 2…")
    #expect(app.canCancelFeedRefresh)
    app.cancelFeedRefresh()
    #expect(app.feedRefreshProgress == "Cancelling Feed Refresh…")
    #expect(!app.canCancelFeedRefresh)
    await transport.releaseRefresh()
    await refresh.value
    #expect(!(await transport.paths.contains("/api/subscriptions/t/refresh")))
    #expect(app.feedRefreshProgress == nil && app.feedRefreshIssue == nil)
    #expect(app.canRefreshFeeds)
    #expect(app.libraryEditing?.notice == "Feed refresh cancelled. The server may finish the current feed.")
}
