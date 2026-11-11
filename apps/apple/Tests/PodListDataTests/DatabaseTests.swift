import Foundation
import Testing
import PodListDomain
import PodListData
import ProtocolTestSupport
@testable import PodListData

@Test(arguments: try Fixtures.document("views.json")["cases"].array)
func sqliteView(_ example: JSON) async throws {
    let fixture = try Fixtures.document("views.json")
    let db = try LocalDatabase(path: ":memory:")
    try await db.upsertLibrary(subscriptions: fixture["subscriptions"].decode(), episodes: (example.object["episodes"] ?? fixture["episodes"]).decode())
    try await db.saveState(fixture["state"].decode())
    let view = try View(id: "v", name: "Test", filter: example["view"]["filter"].decode(), sort: example["view"]["sort"].decode(), limit: example["view"]["limit"].decode())
    let actual = try await db.evaluate(view, now: (example.object["now"] ?? fixture["now"]).int).compactMap { $0["id"]?.string }
    #expect(actual == (try example["expected"].decode([String].self)))
}

@Test(arguments: try Fixtures.vectorNames)
func sqliteStateRoundTrip(_ name: String) async throws {
    let vector = try Fixtures.document(name)
    let states = [vector["initial"], vector["expected"]] + (vector.object["checkpoints"]?.array ?? [])
    let db = try LocalDatabase(path: ":memory:")
    for element in states {
        let state = try element.decode(State.self)
        try await db.saveState(state)
        #expect(try await db.loadState() == state)
        #expect(try StateIndex.rowsToState(StateIndex.stateToRows(state)) == state)
        let expected = try StateIndex.stateToRows(state)["entry_index"]!
        let actual = try await db.query("SELECT * FROM entry_index ORDER BY playlist_id, ordinal")
        #expect(actual.count == expected.count)
        for row in expected { #expect(actual.contains(row)) }
    }
}

private func matches(_ pattern: String, in source: String) throws -> [[String]] {
    let regex = try NSRegularExpression(pattern: pattern)
    return regex.matches(in: source, range: NSRange(source.startIndex..., in: source)).map { match in
        (0..<match.numberOfRanges).map { i in Range(match.range(at: i), in: source).map { String(source[$0]) } ?? "" }
    }
}
private func normalize(_ sql: String) -> String {
    sql.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        .replacingOccurrences(of: "( ", with: "(").replacingOccurrences(of: " )", with: ")")
}

@Test func migrationsMatchSources() throws {
    let repo = Fixtures.protocolURL.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    let source = try String(contentsOf: repo.appendingPathComponent("packages/domain/src/Sql.ts"), encoding: .utf8)
        .components(separatedBy: "export const migrations:")[1].components(separatedBy: "/** Runs the shared")[0]
    let bodies = try matches(#"statements: \[([\s\S]*?)\n    ]"#, in: source).map { $0[1] }
    let statements = try bodies.flatMap { body in
        let clean = body.replacingOccurrences(of: #"//[^\n]*"#, with: "", options: .regularExpression)
        return try matches("`([^`]+)`|\"([^\"\n]+)\"", in: clean).map { $0[1].isEmpty ? $0[2] : $0[1] }
    }
    #expect(statements.map(normalize) == SharedSchema.migrations.flatMap(\.statements).map(normalize))
    let identities = try matches(#"id: (\d+),\s+name: "([^"]+)""#, in: source)
    #expect(identities.map { $0[1] + ":" + $0[2] } == SharedSchema.migrations.map { "\($0.id):\($0.name)" })
    let web = try String(contentsOf: repo.appendingPathComponent("packages/web/src/platform/LocalDb.ts"), encoding: .utf8)
    let client = try matches(#"sql`(CREATE TABLE[\s\S]*?)`"#, in: web).map { normalize($0[1]) }
    #expect(client == SharedSchema.clientMigrations.flatMap(\.statements).map(normalize))
    let android = try String(contentsOf: repo.appendingPathComponent("apps/android/data/src/main/kotlin/app/podlist/data/SharedSchema.kt"), encoding: .utf8)
    let androidSQL = try matches(#""""([\s\S]*?)"""|"([^"\n]*)""#, in: android)
        .map { $0[1].isEmpty ? $0[2] : $0[1] }.filter { $0.hasPrefix("CREATE ") || $0.hasPrefix("ALTER ") || $0.hasPrefix("UPDATE ") }
    #expect(androidSQL.map(normalize) == (SharedSchema.migrations + SharedSchema.clientMigrations + SharedSchema.platformMigrations + SharedSchema.deviceMigrations).flatMap(\.statements).map(normalize))
}

@Test func mentionsBackfillAndReopen() async throws {
    let path = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".sqlite")
    defer { try? FileManager.default.removeItem(at: path) }
    func oldDatabase() throws {
        let storage = try SQLite(path: path.path)
        try storage.execute("CREATE TABLE apple_migration (scope TEXT NOT NULL, id INTEGER NOT NULL, name TEXT NOT NULL, PRIMARY KEY (scope, id))")
        for (scope, migrations) in [("shared", SharedSchema.migrations.filter { $0.id <= 3 }), ("client", SharedSchema.clientMigrations)] {
            for migration in migrations {
                for sql in migration.statements { try storage.execute(sql) }
                try storage.execute("INSERT INTO apple_migration VALUES (?, ?, ?)", [.text(scope), .integer(Int64(migration.id)), .text(migration.name)])
            }
        }
        try storage.execute("INSERT INTO subscription (id, feed_url, title, subscribed_at) VALUES ('s', 'f', 'ПОДКАСТ', 0)")
        for i in 0..<260 {
            try storage.execute("INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url) VALUES (?, 's', ?, 'Café', 'Straße é', 1, 'audio')", [.text(String(i)), .text(String(i))])
        }
        try storage.execute("INSERT INTO sync_meta VALUES ('ruleSince:s', '123')")
        try storage.execute("INSERT INTO download_rule VALUES ('s', 'phone', 'allNew', NULL)")
    }
    try oldDatabase()
    for _ in 0..<2 {
        let db = try LocalDatabase(path: path.path)
        let view = View(id: "v", name: "test", filter: .init(text: "CAFE STRASSE ПОДКАСТ É"), sort: .publishedDesc, limit: nil)
        #expect(try await db.evaluate(view, now: 1).count == 260)
        #expect(try await db.getMeta("ruleSince:s") == "123")
        #expect(try await db.query("SELECT since FROM download_rule").first?["since"] == .null)
        #expect(try await db.query("SELECT title FROM episode WHERE id = '0'").first?["title"] == .text("Café"))
    }
}

@Test func durableEditsAndIndependentCursors() async throws {
    let path = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".sqlite")
    defer { try? FileManager.default.removeItem(at: path) }
    let db = try LocalDatabase(path: path.path)
    let initial = try await db.ensureState()
    try await db.saveConfirmed(initial, cursor: 7)
    try await db.upsertLibrary(subscriptions: [], episodes: [], cursor: 17)
    let first = try await db.record(.addEntry(playlistId: defaultPlaylistId, episodeId: "a", placement: .last), at: 100, id: "stable-id")
    #expect(first.sequence == 0)
    #expect(try await db.outbox() == [first])
    #expect(try await db.confirmedState() == initial)
    let state = try await db.loadState()
    await #expect(throws: DatabaseFailure.self) { try await db.record(.setStar(episodeId: "b", starred: true), at: 200, id: "stable-id") }
    #expect(try await db.loadState() == state)
    #expect(try await db.getMeta("sequence") == "1")
    let reopened = try LocalDatabase(path: path.path)
    #expect(try await reopened.installation().id == first.deviceId)
    #expect(try await reopened.outbox() == [first])
    #expect(try await reopened.getMeta("userCursor") == "7")
    #expect(try await reopened.getMeta("catalogueCursor") == "17")
    let second = try await reopened.record(.setStar(episodeId: "a", starred: true), at: 200, id: "second-id")
    #expect(second.sequence == 1)
    #expect(second.deviceId == first.deviceId)
    #expect(try await reopened.outbox() == [first, second])
    #expect(try await reopened.loadState().episodeStates["a"]?.starred == true)
    #expect(try await reopened.confirmedState()?.episodeStates.isEmpty == true)
    #expect(try await reopened.query("SELECT count(*) AS n FROM apple_migration").first?["n"] == .integer(8))
    let columns = try await reopened.query("PRAGMA table_info(episode)").compactMap { $0["name"]?.string }
    #expect(columns.contains("chapters_url"))
    #expect(columns.contains("chapters_fetched_at"))
}

@Test func libraryPageRollsBack() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let state = try await db.ensureState()
    try await db.upsertLibrary(subscriptions: [], episodes: [], cursor: 10)
    let invalid = Episode(id: "missing", subscriptionId: "absent", guid: "g", title: "t", description: "", published: 0,
                          duration: nil, audioUrl: "https://test/audio", artwork: nil, chapters: [], audioUpdatedAt: nil)
    await #expect(throws: DatabaseFailure.self) { try await db.upsertLibrary(subscriptions: [], episodes: [invalid], cursor: 11) }
    #expect(try await db.getMeta("catalogueCursor") == "10")
    #expect(try await db.query("SELECT * FROM episode").isEmpty)
    #expect(try await db.loadState() == state)
}

@Test func nestedTransactionsRollBack() throws {
    let db = try SQLite(path: ":memory:")
    try db.execute("CREATE TABLE sample (id INTEGER PRIMARY KEY)")
    struct Stop: Error {}
    do {
        try db.transaction {
            try db.execute("INSERT INTO sample VALUES (1)")
            #expect(throws: Stop.self) {
                try db.transaction { try db.execute("INSERT INTO sample VALUES (2)"); throw Stop() }
            }
            #expect(try db.query("SELECT id FROM sample") == [["id": .integer(1)]])
            throw Stop()
        }
        Issue.record("Outer transaction should throw")
    } catch is Stop {} catch { throw error }
    #expect(try db.query("SELECT * FROM sample").isEmpty)
    try db.transaction { try db.execute("INSERT INTO sample VALUES (3)") }
    #expect(try db.query("SELECT id FROM sample") == [["id": .integer(3)]])
}
