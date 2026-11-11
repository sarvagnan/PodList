import Foundation
import PodListDomain
import struct PodListDomain.Operation

/// All connection use and multi-table commits are isolated to this actor; HTTP never holds a transaction.
public actor LocalDatabase {
    let storage: SQLite
    private let standalone: Bool

    public init(path: String, standalone: Bool = false) throws {
        let storage = try SQLite(path: path)
        try storage.execute("PRAGMA foreign_keys = ON")
        try storage.execute("CREATE TABLE IF NOT EXISTS apple_migration (scope TEXT NOT NULL, id INTEGER NOT NULL, name TEXT NOT NULL, PRIMARY KEY (scope, id))")
        for (scope, migrations) in [("shared", SharedSchema.migrations), ("client", SharedSchema.clientMigrations), ("device", SharedSchema.deviceMigrations), ("apple", SharedSchema.platformMigrations)] {
            for migration in migrations {
                try storage.transaction {
                    if try storage.query("SELECT id FROM apple_migration WHERE scope = ? AND id = ?", [.text(scope), .integer(Int64(migration.id))]).isEmpty {
                        for sql in migration.statements { try storage.execute(sql) }
                        if scope == "shared" && migration.id == 4 { try Self.backfillMentions(storage) }
                        try storage.execute("INSERT INTO apple_migration (scope, id, name) VALUES (?, ?, ?)", [.text(scope), .integer(Int64(migration.id)), .text(migration.name)])
                    }
                }
            }
        }
        self.storage = storage
        self.standalone = standalone
        try storage.transaction {
            // Pre-validation clients offered zero. Preserve All New intent by removing the cap.
            try storage.execute("UPDATE download_rule SET keep_at_most = NULL WHERE keep_at_most < 1 OR keep_at_most > 9007199254740991")
            try storage.execute("DELETE FROM download_rule WHERE subscription_id = '' OR device_id = '' OR mode NOT IN ('never', 'onEntry', 'allNew') OR since < 0 OR since > 9007199254740991")
            for table in ["outbox", "local_operation"] {
                for row in try storage.query("SELECT id, operation FROM \(table) ORDER BY seq") {
                    guard var operation = try? ProtocolJSON.decode(Operation.self, from: row["operation"]!.string!) else {
                        try storage.execute("DELETE FROM \(table) WHERE id = ?", [row["id"]!]); continue
                    }
                    if case var .setDownloadRule(rule) = operation.change, let cap = rule.keepAtMost, cap < 1 || cap > 9_007_199_254_740_991 {
                        rule.keepAtMost = nil; operation.change = .setDownloadRule(rule: rule)
                    }
                    if (try? ProtocolValidation.validate(operation)) != nil {
                        try storage.execute("UPDATE \(table) SET operation = ? WHERE id = ?", [.text(try ProtocolJSON.encode(operation)), row["id"]!])
                    } else { try storage.execute("DELETE FROM \(table) WHERE id = ?", [row["id"]!]) }
                }
            }
            if let raw = try storage.query("SELECT value FROM sync_meta WHERE key = 'confirmedState'").first?["value"]?.string,
               var confirmed = try? ProtocolJSON.decode(State.self, from: raw) {
                confirmed.downloadRules = confirmed.downloadRules.compactMap { original in
                    var rule = original
                    if let cap = rule.keepAtMost, cap < 1 || cap > 9_007_199_254_740_991 { rule.keepAtMost = nil }
                    return (try? ProtocolValidation.validate(rule)) != nil ? rule : nil
                }
                try storage.execute("UPDATE sync_meta SET value = ? WHERE key = 'confirmedState'", [.text(try ProtocolJSON.encode(confirmed))])
            }
        }
    }

    private static func backfillMentions(_ storage: SQLite) throws {
        for table in ["subscription", "episode"] {
            var after: String?
            while true {
                let rows = try storage.query("SELECT id, title\(table == "episode" ? ", description" : "") FROM \(table) \(after == nil ? "" : "WHERE id > ?") ORDER BY id LIMIT 128", after.map { [.text($0)] } ?? [])
                if rows.isEmpty { break }
                for row in rows {
                    let title = Mentions.fold(row["title"]!.string!)
                    if table == "episode" {
                        try storage.execute("UPDATE episode SET title_folded = ?, description_folded = ? WHERE id = ?", [.text(title), .text(Mentions.fold(row["description"]!.string!)), row["id"]!])
                    } else { try storage.execute("UPDATE subscription SET title_folded = ? WHERE id = ?", [.text(title), row["id"]!]) }
                    after = row["id"]!.string!
                }
            }
        }
    }
    public func execute(_ sql: String, _ params: [SQLValue] = []) throws { try storage.execute(sql, params) }
    public func query(_ sql: String, _ params: [SQLValue] = []) throws -> [Row] { try storage.query(sql, params) }

    private func replaceState(_ state: State) throws {
        try ProtocolValidation.validateDownloadRules(state)
        let rows = try StateIndex.stateToRows(state)
        for table in StateIndex.tables {
            try storage.execute("DELETE FROM \(table)")
            for row in rows[table] ?? [] { try storage.insert(table, row) }
        }
    }
    public func saveState(_ state: State) throws { try storage.transaction { try replaceState(state) } }
    public func loadState() throws -> State {
        var rows: StateRows = [:]
        for table in StateIndex.tables { rows[table] = try storage.query("SELECT * FROM \(table) ORDER BY rowid") }
        return try StateIndex.rowsToState(rows)
    }
    @discardableResult
    public func ensureState(settings: PlaybackSettings = State.initial().playbackSettings) throws -> State {
        try storage.transaction {
            if try storage.query("SELECT key FROM setting WHERE key = 'activePlaylistId'").isEmpty { try replaceState(.initial(settings: settings)) }
            return try loadState()
        }
    }
    public func evaluate(_ view: View, now: Int64) throws -> [Row] {
        let compiled = ViewQuery.compile(view, now: now)
        return try storage.query(compiled.sql, compiled.params)
    }
    public func upsertLibrary(subscriptions: [Subscription], episodes: [Episode], cursor: Int64? = nil) throws {
        try storage.transaction {
            for s in subscriptions {
                try storage.insert("subscription", [
                    "id": .text(s.id), "feed_url": .text(s.feedUrl), "title": .text(s.title), "title_folded": .text(Mentions.fold(s.title)),
                    "author": .optional(s.author), "description": .optional(s.description), "artwork_url": .optional(s.artwork?.url),
                    "subscribed_at": .integer(s.subscribedAt), "unsubscribed_at": .optional(s.unsubscribedAt),
                    "played_threshold": .optional(s.playedThreshold), "playback_settings": .text(try ProtocolJSON.encode(s.playbackSettings))
                ], upsert: true)
            }
            for e in episodes {
                let previous = try storage.query("SELECT chapters, chapters_fetched_at, audio_url, audio_updated_at FROM episode WHERE id = ?", [.text(e.id)]).first
                let sameAudio = previous?["audio_url"]?.string == e.audioUrl && previous?["audio_updated_at"]?.int == e.audioUpdatedAt
                let chapters = !standalone && sameAudio && e.chapters.isEmpty && previous?["chapters_fetched_at"]?.int != nil
                    ? previous!["chapters"]!.string! : try ProtocolJSON.encode(e.chapters)
                try storage.insert("episode", [
                    "id": .text(e.id), "subscription_id": .text(e.subscriptionId), "guid": .text(e.guid), "title": .text(e.title),
                    "title_folded": .text(Mentions.fold(e.title)), "description_folded": .text(Mentions.fold(e.description)),
                    "description": .text(e.description), "published": .integer(e.published), "duration": .optional(e.duration),
                    "audio_url": .text(e.audioUrl), "artwork_url": .optional(e.artwork?.url),
                    "chapters": .text(chapters), "audio_updated_at": .optional(e.audioUpdatedAt)
                ], upsert: true)
                if !sameAudio { try storage.execute("UPDATE episode SET chapters_fetched_at = NULL WHERE id = ?", [.text(e.id)]) }
            }
            if let cursor { try setMeta("catalogueCursor", String(cursor)) }
        }
    }
    public func getMeta(_ key: String) throws -> String? {
        try storage.query("SELECT value FROM sync_meta WHERE key = ?", [.text(key)]).first?["value"]?.string
    }
    public func setMeta(_ key: String, _ value: String) throws {
        try storage.execute("INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", [.text(key), .text(value)])
    }
    public func installation() throws -> Device {
        try storage.transaction {
            let id = try getMeta("deviceId") ?? UUID().uuidString
            let at = try getMeta("registeredAt").flatMap(Int64.init) ?? Int64(Date().timeIntervalSince1970 * 1000)
            try setMeta("deviceId", id); try setMeta("registeredAt", String(at))
            // The shared contract currently has no separate Apple kind.
            return Device(id: id, name: "PodList Apple", kind: .desktop, registeredAt: at)
        }
    }
    @discardableResult
    public func record(_ change: Change, at: Int64, id: String = UUID().uuidString) throws -> Operation {
        try recordAll([change], at: at, ids: [id])[0]
    }
    @discardableResult
    public func recordAll(_ changes: [Change], at: Int64, ids: [String]? = nil) throws -> [Operation] {
        let ids = ids ?? changes.map { _ in UUID().uuidString }
        guard ids.count == changes.count else { throw DatabaseFailure(description: "Operation ids must match Changes") }
        return try storage.transaction {
            let device = try installation()
            var sequence = try getMeta("sequence").flatMap(Int64.init) ?? 0
            var state = try loadState()
            var operations: [Operation] = []
            for (change, id) in zip(changes, ids) {
                let operation = Operation(id: id, deviceId: device.id, sequence: sequence, recordedAt: at, change: change)
                try ProtocolValidation.validate(operation)
                sequence += 1
                try storage.execute("INSERT INTO \(standalone ? "local_operation" : "outbox") (id, operation) VALUES (?, ?)", [.text(id), .text(try ProtocolJSON.encode(operation))])
                if standalone {
                    switch change {
                    case .setSubscriptionOverrides: try applySubscriptionMetadata(change)
                    case let .markSubscriptionPlayed(id):
                        for row in try storage.query("SELECT id FROM episode WHERE subscription_id = ? ORDER BY published ASC", [.text(id)]) {
                            let episodeId = row["id"]!.string!
                            if state.episodeStates[episodeId]?.played == nil {
                                var concrete = operation
                                concrete.id += ":\(episodeId)"; concrete.change = .markPlayed(episodeId: episodeId, source: .user)
                                try storage.execute("INSERT INTO local_operation (id, operation) VALUES (?, ?)", [.text(concrete.id), .text(try ProtocolJSON.encode(concrete))])
                                state = StateRules.apply(state, change: concrete.change, at: at)
                            }
                        }
                    default: break
                    }
                }
                state = StateRules.apply(state, change: change, at: at)
                operations.append(operation)
            }
            try setMeta("sequence", String(sequence)); try replaceState(state)
            return operations
        }
    }
    /// Validate names, capture inverses and write all Operations in one local transaction.
    /// The builder sees current State, including edits arriving while UI work was queued.
    public func reversibleEdit(at: Int64, validateNames: Bool = true,
                               build: @Sendable (State) throws -> [Change]) throws -> [Change] {
        try storage.transaction {
            let changes = try build(loadState())
            var inverse: [Change] = []
            for (index, requested) in changes.enumerated() {
                let before = try loadState()
                let deletedLater: Bool
                if case let .renamePlaylist(id, _) = requested {
                    deletedLater = changes.dropFirst(index + 1).contains(.deletePlaylist(playlistId: id))
                } else { deletedLater = false }
                if validateNames && !deletedLater {
                    switch requested {
                    case let .createPlaylist(_, name, _):
                        if let problem = PlaylistNames.problem(name, playlists: before.playlists) { throw DatabaseFailure(description: problem) }
                    case let .renamePlaylist(id, name):
                        guard let playlist = before.playlists.first(where: { $0.id == id }), !playlist.isDefault else {
                            throw DatabaseFailure(description: "This Playlist cannot be renamed.")
                        }
                        if let problem = PlaylistNames.problem(name, playlists: before.playlists, excluding: id) { throw DatabaseFailure(description: problem) }
                    default: break
                    }
                }
                if case let .setSubscriptionOverrides(id, _, _) = requested,
                   let sub = try readLibrary().subscriptions.first(where: { $0.id == id }) {
                    inverse.insert(.setSubscriptionOverrides(subscriptionId: id, playbackSettings: sub.playbackSettings, playedThreshold: sub.playedThreshold), at: 0)
                } else if !deletedLater { inverse = EditUndo.inverse(before, change: requested, at: at) + inverse }
                let expanded: [Change]
                if case let .restorePlaylist(id) = requested {
                    expanded = PlaylistNames.restoreChanges(before, id: id, at: at)
                    guard PlaylistRules.availableTrash(before, at: at).contains(where: { $0.playlist.id == id }) else {
                        throw DatabaseFailure(description: "This Playlist is no longer in Trash.")
                    }
                } else if case let .reportPosition(id, episode, position, _, listening) = requested {
                    expanded = [.reportPosition(playlistId: id, episodeId: episode, position: position, listenedAt: at, listening: listening)]
                } else { expanded = [requested] }
                try recordAll(expanded, at: at)
            }
            return inverse
        }
    }

    private func applySubscriptionMetadata(_ change: Change) throws {
        if case let .setSubscriptionOverrides(id, settings, threshold) = change {
            try storage.execute("UPDATE subscription SET playback_settings = ?, played_threshold = ? WHERE id = ?", [.text(try ProtocolJSON.encode(settings)), .optional(threshold), .text(id)])
        }
    }

    public func outbox() throws -> [Operation] {
        try storage.query("SELECT operation FROM outbox ORDER BY seq").map { try ProtocolJSON.decode(Operation.self, from: $0["operation"]!.string!) }
    }
    public func confirmedState() throws -> State? { try getMeta("confirmedState").map { try ProtocolJSON.decode(State.self, from: $0) } }
    public func saveConfirmed(_ state: State, cursor: Int64) throws {
        try ProtocolValidation.validateDownloadRules(state)
        try storage.transaction { try setMeta("confirmedState", ProtocolJSON.encode(state)); try setMeta("userCursor", String(cursor)) }
    }
    /// Only the outbox snapshot actually sent is acknowledged; edits made during HTTP are replayed.
    public func commitPull(_ page: PullPage, sent: [Operation]) throws {
        try storage.transaction {
            let seen: Set<String> = page.snapshot != nil ? [] : try getMeta("seenOperations").map { try ProtocolJSON.decode(Set<String>.self, from: $0) } ?? []
            let base = try page.snapshot ?? confirmedState() ?? .initial()
            let replayed = StateRules.replay(base, operations: page.operations, applied: seen)
            // Accepted metadata intentions must survive a later catalogue-pull failure too.
            let returnedIDs = Set(page.operations.map(\.id))
            for operation in sent where !returnedIDs.contains(operation.id) { try applySubscriptionMetadata(operation.change) }
            for operation in page.operations { try applySubscriptionMetadata(operation.change) }
            for operation in sent { try storage.execute("DELETE FROM outbox WHERE id = ?", [.text(operation.id)]) }
            try setMeta("confirmedState", ProtocolJSON.encode(replayed.state))
            try setMeta("seenOperations", ProtocolJSON.encode(replayed.applied.sorted()))
            try setMeta("userCursor", String(page.cursor))
            try replaceState(StateRules.replay(replayed.state, operations: outbox()).state)
        }
    }
}
