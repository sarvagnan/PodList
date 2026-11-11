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
    var healthResponse = #"{"status":"ok","protocolVersion":4}"#
    var snapshot = fixtureState()
    var paths: [String] = []
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
        case let p where p.hasPrefix("/api/sync/pull"):
            if pauseNextPull {
                pauseNextPull = false
                await withCheckedContinuation { continuation in
                    pausedPull = continuation
                    pauseWaiter?.resume(); pauseWaiter = nil
                }
            }
            return try ProtocolJSON.encode(PullPage(cursor: 8, snapshot: snapshot, operations: []))
        case let p where p.hasPrefix("/api/library/changes"):
            return try ProtocolJSON.encode(LibraryPage(cursor: 9, subscriptions: [subscription()], episodes: [episode(), episode("b")], more: false))
        default: throw SyncResponseFailure("Unexpected request \(method) \(path)")
        }
    }
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
