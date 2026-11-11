import Foundation
import PodListDomain
import struct PodListDomain.Operation

public protocol SyncTransport: Sendable {
    func request(method: String, path: String, body: String?) async throws -> String
}
public struct Health: Codable, Equatable, Sendable {
    public let status: String
    public let protocolVersion: Int
    public let release: String?
}
public struct PullPage: Codable, Equatable, Sendable {
    public let cursor: Int64
    public let snapshot: State?
    public let operations: [Operation]
    public init(cursor: Int64, snapshot: State?, operations: [Operation]) {
        self.cursor = cursor; self.snapshot = snapshot; self.operations = operations
    }
    private enum CodingKeys: String, CodingKey { case cursor, snapshot, operations }
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        cursor = try c.decode(Int64.self, forKey: .cursor)
        snapshot = try c.decode(State?.self, forKey: .snapshot)
        operations = try c.decode([Operation].self, forKey: .operations)
    }
    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(cursor, forKey: .cursor)
        try c.encode(snapshot, forKey: .snapshot)
        try c.encode(operations, forKey: .operations)
    }
}
public struct LibraryPage: Codable, Equatable, Sendable {
    public let cursor: Int64
    public let subscriptions: [Subscription]
    public let episodes: [Episode]
    public let more: Bool
    public init(cursor: Int64, subscriptions: [Subscription], episodes: [Episode], more: Bool) {
        self.cursor = cursor; self.subscriptions = subscriptions; self.episodes = episodes; self.more = more
    }
}
private struct PushBody: Encodable { let operations: [Operation] }
private struct PushResult: Decodable { let cursor: Int64; let accepted: Int64 }
public struct SyncResponseFailure: Error, Sendable {
    public let reason: String
    public init(_ reason: String = "Invalid PodList response") { self.reason = reason }
}

/// Coalesces overlapping runs while allowing the database actor to accept edits during network calls.
public actor SyncClient {
    private let db: LocalDatabase
    private let transport: any SyncTransport
    private let onFailure: @Sendable (any Error) async -> Void
    private var onLibraryPage: @Sendable () async -> Void
    private var inFlight: Task<Void, any Error>?

    public init(db: LocalDatabase, transport: any SyncTransport, onFailure: @escaping @Sendable (any Error) async -> Void = { _ in },
                onLibraryPage: @escaping @Sendable () async -> Void = {}) {
        self.db = db; self.transport = transport; self.onFailure = onFailure; self.onLibraryPage = onLibraryPage
    }
    public func observeLibraryPages(_ handler: @escaping @Sendable () async -> Void) {
        onLibraryPage = handler
    }
    public func health() async throws -> Health {
        let health: Health = try ProtocolJSON.decode(from: await transport.request(method: "GET", path: "/api/health", body: nil))
        guard health.status == "ok" else { throw SyncResponseFailure() }
        return health
    }
    public func sync() async throws {
        if let inFlight { return try await inFlight.value }
        let task = Task { try await performSync() }
        inFlight = task
        defer { inFlight = nil }
        try await task.value
    }
    private func performSync() async throws {
        if try await db.getMeta("registered") != "true" {
            let device = try await db.installation()
            let registered: Device = try ProtocolJSON.decode(from: await transport.request(method: "POST", path: "/api/devices", body: ProtocolJSON.encode(device)))
            guard registered.id == device.id else { throw SyncResponseFailure("Registration returned a different Device") }
            try await db.setMeta("registered", "true")
        }
        var failure: (any Error)?
        do { try await syncState() }
        catch { failure = error; await onFailure(error) }
        // State and Library have independent cursors and failures.
        try await syncLibrary()
        if let failure { throw failure }
    }
    private func syncState() async throws {
        let sent = try await db.outbox()
        if !sent.isEmpty {
            let _: PushResult = try ProtocolJSON.decode(from: await transport.request(method: "POST", path: "/api/sync/push", body: ProtocolJSON.encode(PushBody(operations: sent))))
        }
        let since = try await db.getMeta("userCursor").flatMap(Int64.init) ?? 0
        let page: PullPage = try ProtocolJSON.decode(from: await transport.request(method: "GET", path: "/api/sync/pull?since=\(since)", body: nil))
        guard page.cursor >= since else { throw SyncResponseFailure("State cursor moved backwards") }
        try await db.commitPull(page, sent: sent)
    }
    private func syncLibrary() async throws {
        var cursor = try await db.getMeta("catalogueCursor").flatMap(Int64.init) ?? 0
        var waiting: [Episode] = []
        while true {
            try Task.checkCancellation()
            let page: LibraryPage = try ProtocolJSON.decode(from: await transport.request(method: "GET", path: "/api/library/changes?since=\(cursor)", body: nil))
            guard page.cursor >= cursor && (!page.more || page.cursor > cursor) else { throw SyncResponseFailure("Library cursor did not advance") }
            let known = Set(try await db.query("SELECT id FROM subscription").compactMap { $0["id"]?.string } + page.subscriptions.map(\.id))
            let all = waiting + page.episodes
            let ready = all.filter { known.contains($0.subscriptionId) }
            waiting = all.filter { !known.contains($0.subscriptionId) }
            try await db.upsertLibrary(subscriptions: page.subscriptions, episodes: ready, cursor: waiting.isEmpty ? page.cursor : nil)
            await onLibraryPage()
            cursor = page.cursor
            if !page.more { break }
        }
        if !waiting.isEmpty { throw SyncResponseFailure("Episodes still waiting for their Subscription") }
    }
}
