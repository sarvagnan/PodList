import Foundation
import Testing
import Darwin
import PodListData
import PodListDomain
import PodListAutomation
@testable import PodListUI

@Test func automationFailureExposesMessageAsLocalizedStringResource() {
    let failure = AutomationFailure("Episode \"Café\" is unavailable (404).")
    let localized: any CustomLocalizedStringResourceConvertible = failure
    #expect(String(localized: localized.localizedStringResource) == failure.message)
    #expect(failure.errorDescription == failure.message)
}

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
private func modernRPC(_ handler: MCPHandler, _ method: String, params: [String: JSONValue] = [:],
                       version: String = MCPHandler.protocolVersion, capabilities: JSONValue = [:]) async throws -> JSONValue {
    var params = params
    params["_meta"] = ["io.modelcontextprotocol/protocolVersion": .string(version),
                       "io.modelcontextprotocol/clientCapabilities": capabilities]
    let request: JSONValue = ["jsonrpc": "2.0", "id": "request", "method": .string(method), "params": .object(params)]
    return try await rpc(handler, request.text())
}

private func expectModernResult(_ response: JSONValue) {
    #expect(response["result"]?["resultType"] == "complete")
    #expect(response["result"]?["_meta"]?["io.modelcontextprotocol/serverInfo"] == ["name": "PodList", "version": "0.1.0"])
}

private let discoveryLine = Data(#"{"jsonrpc":"2.0","id":1,"method":"server/discover","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}}}"#.utf8) + Data([10])

@MainActor @Test func mcpModernToolsWithoutInitializeAndToolErrors() async throws {
    let (_, app) = try await automationFixture()
    defer { app.disconnect() }
    let handler = MCPHandler(tools: AutomationActions.tools.reversed()) { name, args in try await app.actions.perform(name, arguments: args) }
    let list = try await modernRPC(handler, "tools/list")
    expectModernResult(list)
    let tools = try #require(list["result"]?["tools"]?.array)
    #expect(tools.count == 15 && list["id"] == "request")
    let names = tools.compactMap { $0["name"]?.string }
    #expect(names == names.sorted())
    #expect(list["result"]?["ttlMs"] == 300000 && list["result"]?["cacheScope"] == "private")
    for tool in tools {
        #expect(tool["name"]?.string != nil && tool["description"]?.string != nil)
        #expect(tool["inputSchema"]?["type"] == "object")
        #expect(tool["inputSchema"]?["properties"]?.object != nil)
        #expect(tool["inputSchema"]?["additionalProperties"] == false)
    }
    // A fresh handler can call a tool as its first request, without discovery or initialization.
    let fresh = MCPHandler(tools: AutomationActions.tools) { name, args in try await app.actions.perform(name, arguments: args) }
    let call = try await modernRPC(fresh, "tools/call", params: ["name": "set_starred", "arguments": ["episode_ids": ["a"], "starred": true]])
    expectModernResult(call)
    #expect(call["result"]?["isError"] == false)
    #expect(call["result"]?["structuredContent"]?["undo"] == "Undo Star")
    #expect(app.editing?.undoTitle == "Undo Star")
    let failure = try await modernRPC(handler, "tools/call", params: ["name": "add_episodes", "arguments": ["episode_ids": ["missing"]]])
    expectModernResult(failure)
    #expect(failure["result"]?["isError"] == true && failure["error"] == nil)
    #expect(try await modernRPC(handler, "tools/list") == list)
}

@Test func mcpDiscoveryAndUnsupportedVersions() async throws {
    let handler = MCPHandler(tools: []) { _, _ in [:] }
    let discovery = try await modernRPC(handler, "server/discover")
    expectModernResult(discovery)
    #expect(discovery["result"]?["supportedVersions"] == ["2026-07-28"])
    #expect(discovery["result"]?["capabilities"] == ["tools": ["listChanged": false]])
    #expect(discovery["result"]?["ttlMs"] == 300000 && discovery["result"]?["cacheScope"] == "private")
    for version in ["1900-01-01", "2025-11-25"] {
        let unsupported = try await modernRPC(handler, "tools/list", version: version)
        #expect(unsupported["error"] == ["code": -32022, "message": "Unsupported protocol version",
                                        "data": ["supported": ["2026-07-28"], "requested": .string(version)]])
    }
    // Neither a failed request nor earlier capabilities affect a later request.
    #expect(try await modernRPC(handler, "server/discover", capabilities: ["elicitation": [:]]) == discovery)
}

@Test func mcpRejectsLegacyInitializeAndMissingPerRequestMetadata() async throws {
    let handler = MCPHandler(tools: []) { _, _ in [:] }
    let response = try await rpc(handler, #"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"Example client","version":"1"}}}"#)
    #expect(response["error"]?["code"] == -32022)
    #expect(response["error"]?["data"] == ["supported": ["2026-07-28"], "requested": "2025-11-25"])
    #expect(response["error"]?["message"]?.string?.contains("PodList requires MCP 2026-07-28") == true)
    #expect(await handler.handle(Data(#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#.utf8)) == nil)
    for method in ["tools/list", "tools/call", "server/discover", "ping"] {
        let request: JSONValue = ["jsonrpc": "2.0", "id": 2, "method": .string(method)]
        #expect(try await rpc(handler, request.text())["error"]?["code"] == -32602)
    }
    expectModernResult(try await modernRPC(handler, "tools/list"))
    // Modern success never grants subsequent requests an implicit protocol version.
    #expect(try await rpc(handler, #"{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/clientCapabilities":{}}}}"#)["error"]?["code"] == -32602)
    for method in ["ping", "notifications/initialized", "missing"] {
        #expect(try await modernRPC(handler, method)["error"]?["code"] == -32601)
    }
}

@Test func mcpMalformedJSONEnvelopesMetadataAndArguments() async throws {
    let handler = MCPHandler(tools: AutomationActions.tools) { _, _ in [:] }
    #expect(try await rpc(handler, "{")["error"]?["code"] == -32700)
    for value in ["[]", "null", #"{"jsonrpc":"1.0","id":1,"method":"tools/list"}"#, #"{"jsonrpc":"2.0","id":true,"method":"tools/list"}"#] {
        #expect(try await rpc(handler, value)["error"]?["code"] == -32600)
    }
    for params in ["[]", #"{"_meta":[]}"#, #"{"_meta":{"io.modelcontextprotocol/protocolVersion":12}}"#,
                   #"{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}"#,
                   #"{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":[]}}"#,
                   #"{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{},"io.modelcontextprotocol/clientInfo":{}}}"#] {
        #expect(try await rpc(handler, "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":\(params)}")["error"]?["code"] == -32602)
    }
    for params: [String: JSONValue] in [[:], ["name": "unknown"], ["name": "search_episodes", "arguments": []]] {
        #expect(try await modernRPC(handler, "tools/call", params: params)["error"]?["code"] == -32602)
    }
    #expect(try await modernRPC(handler, "tools/list", params: ["cursor": 12])["error"]?["code"] == -32602)
    #expect(try await modernRPC(handler, "missing")["error"]?["code"] == -32601)
    #expect(await handler.handle(Data(#"{"jsonrpc":"2.0","method":"missing"}"#.utf8)) == nil)
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
    try LocalSocket.removeStaleSocket(at: url) // A live owner must keep its socket.
    let fd = try LocalSocket.connect(to: url)
    defer { close(fd) }
    try LocalSocket.write(discoveryLine, to: fd)
    var timeout = timeval(tv_sec: 2, tv_usec: 0)
    _ = setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
    var bytes = [UInt8](repeating: 0, count: 4096)
    let count = read(fd, &bytes, bytes.count)
    #expect(count > 0)
    if count > 0 {
        let reply = try JSONDecoder().decode(JSONValue.self, from: Data(bytes.prefix(count)))
        expectModernResult(reply)
        #expect(reply["result"]?["supportedVersions"] == ["2026-07-28"])
    }
    server.stop()
    #expect(!FileManager.default.fileExists(atPath: url.path))
    #expect(throws: AutomationFailure.self) { _ = try LocalSocket.connect(to: url) }
    try server.start() // lock and socket can be acquired again after quit
}

@MainActor @Test func mcpSettingsDefaultOffToggleClosesConnectionsAndPersistsPerMac() throws {
    let suite = "PodList.AutomationTests." + UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    let directory = URL(fileURLWithPath: "/tmp/podlist-" + UUID().uuidString)
    let url = directory.appendingPathComponent("mcp.sock")
    let settings = AutomationSettings(defaults: defaults, socketURL: url) { _, _ in [:] }
    defer { settings.stop(); defaults.removePersistentDomain(forName: suite); try? FileManager.default.removeItem(at: directory) }
    #expect(!settings.isEnabled)
    settings.start()
    #expect(!FileManager.default.fileExists(atPath: url.path))
    #expect(throws: AutomationFailure.self) { _ = try LocalSocket.connect(to: url) }
    settings.setEnabled(true)
    #expect(settings.isEnabled && settings.error == nil)
    #expect(FileManager.default.fileExists(atPath: url.path))
    let fd = try LocalSocket.connect(to: url)
    defer { close(fd) }
    // A round trip ensures the connection has been accepted before disabling.
    try LocalSocket.write(discoveryLine, to: fd)
    var timeout = timeval(tv_sec: 2, tv_usec: 0)
    _ = setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
    var bytes = [UInt8](repeating: 0, count: 4096)
    #expect(read(fd, &bytes, bytes.count) > 0)
    settings.setEnabled(false)
    #expect(!settings.isEnabled && settings.error == nil)
    #expect(!FileManager.default.fileExists(atPath: url.path))
    #expect(read(fd, &bytes, bytes.count) == 0)
    do {
        _ = try LocalSocket.connect(to: url)
        Issue.record("Disabled MCP accepted a connection")
    } catch {
        #expect(error.localizedDescription.contains("MCP is turned off in PodList Settings"))
        #expect(error.localizedDescription.contains("app is not running"))
    }
    settings.setEnabled(true)
    settings.stop() // Quit preserves the enabled preference.
    #expect(!FileManager.default.fileExists(atPath: url.path))
    let relaunched = AutomationSettings(defaults: defaults, socketURL: url) { _, _ in [:] }
    defer { relaunched.stop() }
    #expect(relaunched.isEnabled)
    relaunched.start()
    #expect(FileManager.default.fileExists(atPath: url.path))
    relaunched.setEnabled(false)
    let disabled = AutomationSettings(defaults: defaults, socketURL: url) { _, _ in [:] }
    #expect(!disabled.isEnabled)
    let config = try JSONDecoder().decode(JSONValue.self, from: Data(settings.clientConfiguration.utf8))
    #expect(config["mcpServers"]?["podlist"]?["command"] == .string(settings.bridgePath))
    #expect(config["mcpServers"]?["podlist"]?["args"] == nil)
}

@MainActor @Test func disabledMCPRemovesStaleSocketsWithoutRemovingOtherFiles() throws {
    let suite = "PodList.AutomationTests." + UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    let directory = URL(fileURLWithPath: "/tmp/podlist-" + UUID().uuidString)
    let url = directory.appendingPathComponent("mcp.sock")
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
    defer { defaults.removePersistentDomain(forName: suite); try? FileManager.default.removeItem(at: directory) }
    var address = sockaddr_un()
    address.sun_family = sa_family_t(AF_UNIX)
    address.sun_len = UInt8(MemoryLayout<sockaddr_un>.size)
    let path = Array(url.path.utf8) + [UInt8(0)]
    withUnsafeMutableBytes(of: &address.sun_path) { $0.copyBytes(from: path) }
    let fd = socket(AF_UNIX, SOCK_STREAM, 0)
    #expect(fd >= 0)
    let bound = withUnsafePointer(to: &address) { pointer in
        pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(fd, $0, socklen_t(MemoryLayout<sockaddr_un>.size)) }
    }
    close(fd) // Closing a listener without unlinking after a crash leaves its socket path behind.
    #expect(bound == 0 && FileManager.default.fileExists(atPath: url.path))
    let settings = AutomationSettings(defaults: defaults, socketURL: url) { _, _ in [:] }
    settings.start()
    #expect(!settings.isEnabled && settings.error == nil)
    #expect(!FileManager.default.fileExists(atPath: url.path))
    try Data("Keep this file".utf8).write(to: url)
    settings.start()
    #expect(settings.error != nil)
    #expect(try String(contentsOf: url, encoding: .utf8) == "Keep this file")
}
