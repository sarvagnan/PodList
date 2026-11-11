import Foundation
import Testing
import PodListDomain
import struct PodListDomain.Operation
import PodListData

private struct Offline: Error {}
private struct Request: Equatable, Sendable { let method: String; let path: String; let body: String? }
private struct Step: Sendable {
    enum Reply: Sendable { case text(String), echo, offline }
    let path: String
    let reply: Reply
    let before: (@Sendable () async throws -> Void)?
    init(_ path: String, _ reply: Reply, before: (@Sendable () async throws -> Void)? = nil) { self.path = path; self.reply = reply; self.before = before }
}
private actor ScriptedTransport: SyncTransport {
    private var steps: [Step]
    private(set) var requests: [Request] = []
    init(_ steps: [Step]) { self.steps = steps }
    func request(method: String, path: String, body: String?) async throws -> String {
        requests.append(Request(method: method, path: path, body: body))
        let step = try #require(steps.first, "Unexpected request \(path)")
        steps.removeFirst()
        #expect(path == step.path)
        if let before = step.before { try await before() }
        switch step.reply {
        case let .text(text): return text
        case .echo: return try #require(body)
        case .offline: throw Offline()
        }
    }
    func assertFinished() { #expect(steps.isEmpty) }
}
private actor Flag {
    private(set) var value = false
    func set() { value = true }
}
private func library(_ cursor: Int64 = 0, subscriptions: [Subscription] = [], episodes: [Episode] = [], more: Bool = false) throws -> Step.Reply {
    .text(try ProtocolJSON.encode(LibraryPage(cursor: cursor, subscriptions: subscriptions, episodes: episodes, more: more)))
}
private func pull(_ cursor: Int64, snapshot: State? = nil, operations: [Operation] = []) throws -> Step.Reply {
    .text(try ProtocolJSON.encode(PullPage(cursor: cursor, snapshot: snapshot, operations: operations)))
}
private func subscription() -> Subscription {
    Subscription(id: "s", feedUrl: "https://test/feed", title: "Podcast", author: nil, description: nil, artwork: nil,
                 subscribedAt: 0, unsubscribedAt: 5, playedThreshold: nil, playbackSettings: .init())
}
private func episode() -> Episode {
    Episode(id: "e", subscriptionId: "s", guid: "guid", title: "Episode", description: "", published: 1,
            duration: 60, audioUrl: "https://test/audio", artwork: nil, chapters: [], audioUpdatedAt: nil)
}

@Test func registrationRetriesDurableDevice() async throws {
    let db = try LocalDatabase(path: ":memory:")
    try await db.ensureState()
    let transport = try ScriptedTransport([
        Step("/api/devices", .offline), Step("/api/devices", .echo),
        Step("/api/sync/pull?since=0", pull(2, snapshot: .initial())), Step("/api/library/changes?since=0", library(9))
    ])
    let sync = SyncClient(db: db, transport: transport)
    await #expect(throws: Offline.self) { try await sync.sync() }
    #expect(try await db.getMeta("registered") == nil)
    #expect(await transport.requests.count == 1)
    try await sync.sync()
    let requests = await transport.requests
    #expect(requests[0] == requests[1])
    let device = try ProtocolJSON.decode(Device.self, from: #require(requests[1].body))
    #expect(device.kind == .desktop)
    #expect(try await db.getMeta("userCursor") == "2")
    #expect(try await db.getMeta("catalogueCursor") == "9")
    await transport.assertFinished()
}

@Test func stateFailureReportedBeforeIndependentLibrarySync() async throws {
    let db = try LocalDatabase(path: ":memory:")
    try await db.ensureState(); try await db.setMeta("registered", "true")
    let flag = Flag()
    let transport = try ScriptedTransport([
        Step("/api/sync/pull?since=0", .offline),
        Step("/api/library/changes?since=0", library(18), before: { #expect(await flag.value) })
    ])
    let sync = SyncClient(db: db, transport: transport, onFailure: { _ in await flag.set() })
    await #expect(throws: Offline.self) { try await sync.sync() }
    #expect(try await db.getMeta("catalogueCursor") == "18")
    #expect(try await db.getMeta("userCursor") == nil)
    await transport.assertFinished()
}

@Test func lostPushRetriesExactSnapshotAndRetainsConcurrentEdit() async throws {
    let db = try LocalDatabase(path: ":memory:")
    try await db.ensureState()
    let first = try await db.record(.setStar(episodeId: "a", starred: true), at: 1, id: "first")
    let confirmed = StateRules.apply(.initial(), change: first.change, at: 1)
    let transport = try ScriptedTransport([
        Step("/api/devices", .echo), Step("/api/sync/push", .offline), Step("/api/library/changes?since=0", library()),
        Step("/api/sync/push", .text(#"{"cursor":999,"accepted":0}"#)),
        Step("/api/sync/pull?since=0", pull(8, snapshot: confirmed), before: {
            try await db.record(.setStar(episodeId: "b", starred: true), at: 2, id: "second")
        }),
        Step("/api/library/changes?since=0", library())
    ])
    let sync = SyncClient(db: db, transport: transport)
    await #expect(throws: Offline.self) { try await sync.sync() }
    #expect(try await db.outbox() == [first])
    #expect(try await db.getMeta("userCursor") == nil)
    try await sync.sync()
    let pushes = await transport.requests.filter { $0.path == "/api/sync/push" }
    #expect(pushes.count == 2)
    #expect(pushes[0] == pushes[1])
    #expect(try await db.outbox().map(\.id) == ["second"])
    #expect(try await db.getMeta("userCursor") == "8")
    #expect(try await db.loadState().episodeStates["b"]?.starred == true)
    #expect(try await db.confirmedState()?.episodeStates["b"] == nil)
    await transport.assertFinished()
}

@Test func episodesWaitForLaterSubscriptionAndRefetchAfterFailure() async throws {
    let db = try LocalDatabase(path: ":memory:")
    try await db.ensureState()
    let transport = try ScriptedTransport([
        Step("/api/devices", .echo), Step("/api/sync/pull?since=0", pull(5, snapshot: .initial())),
        Step("/api/library/changes?since=0", library(17, episodes: [episode()], more: true)), Step("/api/library/changes?since=17", .offline),
        Step("/api/sync/pull?since=5", pull(5)), Step("/api/library/changes?since=0", library(17, episodes: [episode()], more: true)),
        Step("/api/library/changes?since=17", library(18, subscriptions: [subscription()]))
    ])
    await #expect(throws: Offline.self) { try await SyncClient(db: db, transport: transport).sync() }
    #expect(try await db.getMeta("catalogueCursor") == nil)
    #expect(try await db.query("SELECT id FROM episode").isEmpty)
    try await SyncClient(db: db, transport: transport).sync()
    #expect(try await db.getMeta("catalogueCursor") == "18")
    #expect(try await db.query("SELECT id FROM episode").count == 1)
    #expect(await transport.requests.filter { $0.path == "/api/library/changes?since=0" }.count == 2)
    await transport.assertFinished()
}

@Test func restartResumesCommittedLibraryPageAndState() async throws {
    let path = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".sqlite")
    defer { try? FileManager.default.removeItem(at: path) }
    var followed = subscription(); followed.unsubscribedAt = nil
    let transport = try ScriptedTransport([
        Step("/api/devices", .echo), Step("/api/sync/pull?since=0", pull(5, snapshot: .initial())),
        Step("/api/library/changes?since=0", library(17, subscriptions: [followed], more: true)), Step("/api/library/changes?since=17", .offline),
        Step("/api/sync/pull?since=5", pull(5)), Step("/api/library/changes?since=17", library(44, episodes: [episode()]))
    ])
    func firstRun() async throws -> String {
        let db = try LocalDatabase(path: path.path)
        try await db.ensureState()
        await #expect(throws: Offline.self) { try await SyncClient(db: db, transport: transport).sync() }
        #expect(try await db.getMeta("userCursor") == "5")
        #expect(try await db.getMeta("catalogueCursor") == "17")
        return try await db.installation().id
    }
    let id = try await firstRun()
    let db = try LocalDatabase(path: path.path)
    try await SyncClient(db: db, transport: transport).sync()
    #expect(try await db.installation().id == id)
    #expect(try await db.getMeta("catalogueCursor") == "44")
    let view = View(id: "v", name: "All", filter: .init(), sort: .publishedDesc, limit: nil)
    #expect(try await db.evaluate(view, now: 10).compactMap { $0["id"]?.string } == ["e"])
    await transport.assertFinished()
}

@Test func duplicateListeningDeliveryDeduplicatesAcrossRestarts() async throws {
    let path = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".sqlite")
    defer { try? FileManager.default.removeItem(at: path) }
    let operation = Operation(id: "listen", deviceId: "other", sequence: 0, recordedAt: 1,
                              change: .recordListening(amounts: [.init(day: "2026-11-09", subscriptionId: "s", seconds: 12)]))
    for run in 0..<2 {
        let db = try LocalDatabase(path: path.path)
        try await db.ensureState(); try await db.setMeta("registered", "true")
        let transport = try ScriptedTransport([
            Step("/api/sync/pull?since=\(run)", pull(Int64(run + 1), operations: [operation, operation])),
            Step("/api/library/changes?since=0", library())
        ])
        try await SyncClient(db: db, transport: transport).sync()
        #expect(try await db.loadState().listeningLog?["2026-11-09"]?["s"] == 12)
        await transport.assertFinished()
    }
}

@Test func failedPullDoesNotAcknowledgeAcceptedOutbox() async throws {
    let db = try LocalDatabase(path: ":memory:")
    try await db.ensureState()
    let edit = try await db.record(.setStar(episodeId: "e", starred: true), at: 1, id: "edit")
    let transport = try ScriptedTransport([
        Step("/api/devices", .echo), Step("/api/sync/push", .text(#"{"cursor":9,"accepted":1}"#)),
        Step("/api/sync/pull?since=0", .offline), Step("/api/library/changes?since=0", library())
    ])
    await #expect(throws: Offline.self) { try await SyncClient(db: db, transport: transport).sync() }
    #expect(try await db.outbox() == [edit])
    #expect(try await db.getMeta("userCursor") == nil)
    #expect(try await db.loadState().episodeStates["e"]?.starred == true)
    await transport.assertFinished()
}

@Test func rejectsStalledLibraryCursorAndUnresolvedEpisodes() async throws {
    for stalled in [false, true] {
        let db = try LocalDatabase(path: ":memory:")
        try await db.ensureState(); try await db.setMeta("registered", "true")
        let transport = try ScriptedTransport([
            Step("/api/sync/pull?since=0", pull(0, snapshot: .initial())),
            Step("/api/library/changes?since=0", library(stalled ? 0 : 1, episodes: [episode()], more: stalled))
        ])
        await #expect(throws: SyncResponseFailure.self) { try await SyncClient(db: db, transport: transport).sync() }
        #expect(try await db.getMeta("catalogueCursor") == nil)
        await transport.assertFinished()
    }
}
