import Foundation
import Testing
import Darwin
import PodListData
import PodListDomain
import PodListAutomation
@testable import PodListUI

@MainActor private func automationFixture() async throws -> (LocalDatabase, ApplicationModel) {
    let db = try await fixtureDatabase()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    await app.startStandalone()
    return (db, app)
}

@MainActor @Test func automationDefaultsToActivePlaylistAndSharesUndoHistory() async throws {
    let (db, app) = try await automationFixture()
    defer { app.disconnect() }
    let id = try #require(await app.editing?.create(name: "Walk"))
    try await db.record(.setActivePlaylist(playlistId: id), at: 100)
    let value = try await app.actions.perform("add_episodes", arguments: ["episode_ids": ["a", "b"]])
    #expect(value["playlist_id"]?.string == id)
    #expect(value["undo"] == "Undo Play Last")
    #expect(try await db.loadState().playlists.first { $0.id == id }?.entries.map(\.episodeId) == ["a", "b"])
    await app.editing?.reverse()
    #expect(try await db.loadState().playlists.first { $0.id == id }?.entries.isEmpty == true)
    #expect(app.editing?.redoTitle == "Redo Play Last")
    _ = try await app.actions.perform("set_starred", arguments: ["episode_ids": ["a"], "starred": true])
    #expect(app.editing?.undoTitle == "Undo Star")
    await app.editing?.reverse()
    #expect(try await db.loadState().episodeStates["a"]?.starred != true)
}

@MainActor @Test func automationSearchUsesLibraryMatchingAndPaginates() async throws {
    let (_, app) = try await automationFixture()
    defer { app.disconnect() }
    let found = try await app.actions.perform("search_episodes", arguments: ["text": "bÉta science"])
    #expect(found["episodes"]?.array?.map { $0["id"]?.string } == ["b"])
    let notes = try await app.actions.perform("search_episodes", arguments: ["text": "notes", "limit": 1])
    #expect(notes["total"] == 3 && notes["has_more"] == true)
    let entries = try await app.actions.perform("list_episodes", arguments: ["playlist_id": "default"])
    #expect(entries["episodes"]?.array?.map { $0["id"]?.string } == ["b", "a", "pending"])
    let views = try await app.actions.perform("list_views")
    #expect(views["views"]?.array?.first?["count"] == 3)
    let now = try await app.actions.perform("now_playing")
    #expect(now["episode_id"] == "a" && now["position"] == 65)
    #expect(now["active_playlist"]?["id"] == "default")
}

@MainActor @Test func automationRejectsUnknownIDsArgumentsAndExcludedActions() async throws {
    let (db, app) = try await automationFixture()
    defer { app.disconnect() }
    let before = try await db.loadState()
    for (name, args): (String, JSONValue) in [
        ("add_episodes", ["episode_ids": ["missing"]]),
        ("add_episodes", ["episode_ids": ["a"], "playlist_id": "missing"]),
        ("add_episodes", ["episode_ids": ["a"], "placement": "now"]),
        ("set_starred", ["episode_ids": ["a"], "starred": "true"]),
        ("search_episodes", ["text": "a", "limit": -1]),
        ("list_episodes", ["playlist_id": "default", "view_id": "all"]),
        ("empty_trash", [:]), ("delete_playlist", [:]), ("unsubscribe", [:]), ("connect", [:])
    ] {
        await #expect(throws: AutomationFailure.self) { try await app.actions.perform(name, arguments: args) }
    }
    #expect(try await db.loadState() == before)
}

private func rpc(_ handler: MCPHandler, _ text: String) async throws -> JSONValue {
    let data = try #require(await handler.handle(Data(text.utf8)))
    return try JSONDecoder().decode(JSONValue.self, from: data)
}
private func handshake(_ handler: MCPHandler) async throws {
    let response = try await rpc(handler, #"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"Example client","version":"1"}}}"#)
    #expect(response["result"]?["protocolVersion"] == "2025-11-25")
    #expect(response["result"]?["capabilities"]?["tools"]?["listChanged"] == false)
    #expect(await handler.handle(Data(#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#.utf8)) == nil)
}

@MainActor @Test func mcpLifecycleToolSchemasSuccessAndToolErrors() async throws {
    let (_, app) = try await automationFixture()
    defer { app.disconnect() }
    let handler = MCPHandler(tools: AutomationActions.tools) { name, args in try await app.actions.perform(name, arguments: args) }
    let early = try await rpc(handler, #"{"jsonrpc":"2.0","id":0,"method":"tools/list"}"#)
    #expect(early["error"]?["code"] == -32000)
    try await handshake(handler)
    let list = try await rpc(handler, #"{"jsonrpc":"2.0","id":"list","method":"tools/list"}"#)
    let tools = try #require(list["result"]?["tools"]?.array)
    #expect(tools.count == 15 && list["id"] == "list")
    for tool in tools {
        #expect(tool["name"]?.string != nil && tool["description"]?.string != nil)
        #expect(tool["inputSchema"]?["type"] == "object")
        #expect(tool["inputSchema"]?["properties"]?.object != nil)
        #expect(tool["inputSchema"]?["additionalProperties"] == false)
    }
    let call = try await rpc(handler, #"{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"set_starred","arguments":{"episode_ids":["a"],"starred":true}}}"#)
    #expect(call["result"]?["isError"] == false)
    #expect(call["result"]?["structuredContent"]?["undo"] == "Undo Star")
    #expect(app.editing?.undoTitle == "Undo Star")
    for params in [#"{"name":"add_episodes","arguments":{"episode_ids":["missing"]}}"#, #"{"name":"unknown"}"#, #"{"name":"search_episodes","arguments":[]}"#, #"{}"#] {
        let failure = try await rpc(handler, "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":\(params)}")
        #expect(failure["result"]?["isError"] == true && failure["error"] == nil)
    }
    #expect(try await rpc(handler, #"{"jsonrpc":"2.0","id":5,"method":"ping"}"#)["result"] == [:])
}

@Test func mcpMalformedJSONInvalidEnvelopesAndNotifications() async throws {
    let handler = MCPHandler(tools: []) { _, _ in [:] }
    #expect(try await rpc(handler, "{")["error"]?["code"] == -32700)
    for value in ["[]", "null", #"{"jsonrpc":"1.0","id":1,"method":"ping"}"#, #"{"jsonrpc":"2.0","id":true,"method":"ping"}"#] {
        #expect(try await rpc(handler, value)["error"]?["code"] == -32600)
    }
    #expect(try await rpc(handler, #"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}"#)["error"]?["code"] == -32602)
    #expect(try await rpc(handler, #"{"jsonrpc":"2.0","id":1,"method":"ping","params":[]}"#)["error"]?["code"] == -32602)
    #expect(try await rpc(handler, #"{"jsonrpc":"2.0","id":1,"method":"missing"}"#)["error"]?["code"] == -32601)
    #expect(await handler.handle(Data(#"{"jsonrpc":"2.0","method":"ping"}"#.utf8)) == nil)
}

@Test func localSocketPermissionsLifecycleAndExclusiveOwnership() async throws {
    // /tmp stays below Darwin's 104-byte Unix socket path limit.
    let directory = URL(fileURLWithPath: "/tmp/podlist-" + UUID().uuidString)
    let url = directory.appendingPathComponent("mcp.sock")
    let server = LocalMCPServer(url: url) { MCPHandler(tools: []) { _, _ in [:] } }
    defer { server.stop(); try? FileManager.default.removeItem(at: directory) }
    try server.start()
    let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
    #expect((attributes[.posixPermissions] as? NSNumber)?.intValue == 0o600)
    #expect((try FileManager.default.attributesOfItem(atPath: directory.path)[.posixPermissions] as? NSNumber)?.intValue == 0o700)
    let second = LocalMCPServer(url: url) { MCPHandler(tools: []) { _, _ in [:] } }
    #expect(throws: AutomationFailure.self) { try second.start() }
    let fd = try LocalSocket.connect(to: url)
    defer { close(fd) }
    try LocalSocket.write(Data(#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#.utf8) + Data([10]), to: fd)
    var bytes = [UInt8](repeating: 0, count: 1024)
    let count = read(fd, &bytes, bytes.count)
    #expect(count > 0)
    if count > 0 {
        let reply = try JSONDecoder().decode(JSONValue.self, from: Data(bytes.prefix(count)))
        #expect(reply["result"] == [:])
    }
    server.stop()
    #expect(!FileManager.default.fileExists(atPath: url.path))
    #expect(throws: AutomationFailure.self) { _ = try LocalSocket.connect(to: url) }
    try server.start() // lock and socket can be acquired again after quit
}
