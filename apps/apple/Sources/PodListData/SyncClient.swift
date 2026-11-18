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

public struct SyncCompatibilityFailure: Error, Codable, Sendable, Equatable {
    public let _tag: String
    public let minimumProtocolVersion: Int?
    public let serverProtocolVersion: Int?
    public var isCompatibilityError: Bool { _tag == "UpdateRequired" || _tag == "UnsupportedOperation" }
    public var message: String { _tag == "UpdateRequired" ? "Update PodList to keep syncing" : "Update the PodList server to keep syncing" }
    public init(_ tag: String, minimumProtocolVersion: Int? = nil, serverProtocolVersion: Int? = nil) {
        _tag = tag; self.minimumProtocolVersion = minimumProtocolVersion; self.serverProtocolVersion = serverProtocolVersion
    }
}

/// Coalesces overlapping runs while allowing the database actor to accept edits during network calls.
public actor SyncClient {
    private let db: LocalDatabase
    private let transport: any SyncTransport
    private let onFailure: @Sendable (any Error) async -> Void
    private var onLibraryPage: @Sendable () async -> Void
    private var inFlight: Task<Void, any Error>?
    private var blocked: SyncCompatibilityFailure?

    public init(db: LocalDatabase, transport: any SyncTransport, onFailure: @escaping @Sendable (any Error) async -> Void = { _ in },
                onLibraryPage: @escaping @Sendable () async -> Void = {}) {
        self.db = db; self.transport = transport; self.onFailure = onFailure; self.onLibraryPage = onLibraryPage
    }
    public func observeLibraryPages(_ handler: @escaping @Sendable () async -> Void) {
        onLibraryPage = handler
    }
    public func health() async throws -> Health {
        // Invalidate before the request so failed refreshes cannot leave a stale grant.
        try await db.setMeta("serverProtocolVersion", String(SyncProtocol.legacyVersion))
        let health: Health = try ProtocolJSON.decode(from: await transport.request(method: "GET", path: "/api/health", body: nil))
        guard health.status == "ok" else { throw SyncResponseFailure() }
        try await db.setMeta("serverProtocolVersion", String(health.protocolVersion))
        return health
    }
    public func requireServerVersion(_ minimum: Int) async throws {
        guard try await health().protocolVersion >= minimum else {
            throw SyncCompatibilityFailure("UnsupportedOperation", serverProtocolVersion: try await db.getMeta("serverProtocolVersion").flatMap(Int.init) ?? SyncProtocol.legacyVersion)
        }
    }
    public func requirePurgePlaylistSupport() async throws {
        try await requireServerVersion(SyncProtocol.minimumVersion(.purgePlaylist(playlistId: "")))
    }
    public func retry() { blocked = nil }
    public func sync() async throws {
        if let inFlight { return try await inFlight.value }
        if let blocked { throw blocked }
        let task = Task { try await performSync() }
        inFlight = task
        defer { inFlight = nil }
        do { try await task.value }
        catch let error as SyncCompatibilityFailure { blocked = error; throw error }
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
        catch { failure = error; if let compatibility = error as? SyncCompatibilityFailure { blocked = compatibility }; await onFailure(error) }
        // State and Library have independent cursors and failures.
        do { try await syncLibrary() } catch { if let compatibility = failure as? SyncCompatibilityFailure { throw compatibility }; throw error }
        if let failure { throw failure }
    }
    private func syncState() async throws {
        let sent = try await db.outbox()
        // Recheck after restart or a server rollback, including Operations imported by bring-over.
        let minimum = try sent.map { try SyncProtocol.minimumVersion($0.change) }.max() ?? SyncProtocol.legacyVersion
        if minimum > SyncProtocol.legacyVersion { try await requireServerVersion(minimum) }
        if !sent.isEmpty {
            let _: PushResult = try ProtocolJSON.decode(from: await transport.request(method: "POST", path: "/api/sync/push", body: ProtocolJSON.encode(PushBody(operations: sent))))
        }
        let since = try await db.getMeta("userCursor").flatMap(Int64.init) ?? 0
        let text = try await transport.request(method: "GET", path: "/api/sync/pull?since=\(since)", body: nil)
        let object = try JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any]
        let operations = object?["operations"] as? [[String: Any]] ?? []
        if operations.contains(where: { operation in
            guard let change = operation["change"] as? [String: Any], let tag = change["_tag"] as? String else { return false }
            return SyncProtocol.minimumVersions[tag] == nil
        }) { throw SyncCompatibilityFailure("UpdateRequired", minimumProtocolVersion: SyncProtocol.version + 1) }
        let page: PullPage = try ProtocolJSON.decode(from: text)
        guard page.cursor >= since else { throw SyncResponseFailure("State cursor moved backwards") }
        try await db.commitPull(page, sent: sent)
    }
    private func syncLibrary() async throws {
        // Rows already mirrored as an older reader may now carry publisher links.
        let mirroredAsV6 = try await db.getMeta("catalogueReaderV6") == "true"
        var cursor = mirroredAsV6 ? try await db.getMeta("catalogueCursor").flatMap(Int64.init) ?? 0 : 0
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
