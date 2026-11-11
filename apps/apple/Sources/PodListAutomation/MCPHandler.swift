import Foundation

/// Stateless MCP 2026-07-28 requests over newline-delimited JSON-RPC.
public actor MCPHandler {
    public static let protocolVersion = "2026-07-28"
    private static let supported: JSONValue = [.string(protocolVersion)]
    private static let serverInfo: JSONValue = ["name": "PodList", "version": "0.1.0"]
    private static let capabilities: JSONValue = ["tools": ["listChanged": false]]
    private let tools: [JSONValue]
    private let call: @Sendable (String, JSONValue) async throws -> JSONValue

    public init(tools: [JSONValue], call: @escaping @Sendable (String, JSONValue) async throws -> JSONValue) {
        self.tools = tools.sorted { ($0["name"]?.string ?? "") < ($1["name"]?.string ?? "") }
        self.call = call
    }
    public func handle(_ data: Data) async -> Data? {
        let request: JSONValue
        do { request = try JSONDecoder().decode(JSONValue.self, from: data) }
        catch { return encode(rpcError(.null, -32700, "Parse error")) }
        let id = request["id"]
        guard request.object != nil, request["jsonrpc"] == "2.0", let method = request["method"]?.string,
              id == nil || id?.string != nil || id?.number != nil else {
            return encode(rpcError(.null, -32600, "Invalid Request"))
        }
        // Notifications never receive responses and never establish connection state.
        guard let id else { return nil }
        if method == "initialize" {
            return encode(unsupported(id, requested: request["params"]?["_meta"]?["io.modelcontextprotocol/protocolVersion"]?.string
                                        ?? request["params"]?["protocolVersion"]?.string ?? "unknown",
                                      message: "PodList requires MCP 2026-07-28; the initialize handshake is not supported"))
        }
        if let params = request["params"], params.object == nil {
            return encode(rpcError(id, -32602, "Parameters must be an object"))
        }
        let params = request["params"] ?? [:]
        guard let meta = params["_meta"], meta.object != nil,
              let version = meta["io.modelcontextprotocol/protocolVersion"]?.string else {
            return encode(rpcError(id, -32602, "Supply _meta.io.modelcontextprotocol/protocolVersion and clientCapabilities"))
        }
        guard version == Self.protocolVersion else { return encode(unsupported(id, requested: version)) }
        guard meta["io.modelcontextprotocol/clientCapabilities"]?.object != nil else {
            return encode(rpcError(id, -32602, "Supply _meta.io.modelcontextprotocol/clientCapabilities as an object"))
        }
        if let info = meta["io.modelcontextprotocol/clientInfo"],
           info["name"]?.string == nil || info["version"]?.string == nil {
            return encode(rpcError(id, -32602, "clientInfo must include name and version"))
        }
        switch method {
        case "server/discover":
            return encode(result(id, ["supportedVersions": Self.supported, "capabilities": Self.capabilities,
                                      "ttlMs": 300000, "cacheScope": "private"]))
        case "tools/list":
            if let cursor = params["cursor"], cursor.string == nil {
                return encode(rpcError(id, -32602, "Cursor must be a string"))
            }
            // The complete fixed catalog fits in one response; there is no next cursor.
            return encode(result(id, ["tools": .array(tools), "ttlMs": 300000, "cacheScope": "private"]))
        case "tools/call":
            guard let name = params["name"]?.string else {
                return encode(rpcError(id, -32602, "Supply a tool name"))
            }
            guard tools.contains(where: { $0["name"]?.string == name }) else {
                return encode(rpcError(id, -32602, "Unknown tool: \(name)"))
            }
            if let arguments = params["arguments"], arguments.object == nil {
                return encode(rpcError(id, -32602, "Arguments must be an object"))
            }
            do {
                let value = try await call(name, params["arguments"] ?? [:])
                return encode(result(id, ["content": [["type": "text", "text": .string(try value.text())]],
                                          "structuredContent": value, "isError": false]))
            } catch {
                return encode(result(id, ["content": [["type": "text", "text": .string(error.localizedDescription)]], "isError": true]))
            }
        default: return encode(rpcError(id, -32601, "Method not found"))
        }
    }
    private func result(_ id: JSONValue, _ value: JSONValue) -> JSONValue {
        var fields = value.object ?? [:]
        fields["resultType"] = "complete"
        fields["_meta"] = ["io.modelcontextprotocol/serverInfo": Self.serverInfo]
        return ["jsonrpc": "2.0", "id": id, "result": .object(fields)]
    }
    private func unsupported(_ id: JSONValue, requested: String, message: String = "Unsupported protocol version") -> JSONValue {
        rpcError(id, -32022, message, data: ["supported": Self.supported, "requested": .string(requested)])
    }
    private func rpcError(_ id: JSONValue, _ code: Int, _ message: String, data: JSONValue? = nil) -> JSONValue {
        var error: [String: JSONValue] = ["code": .number(Double(code)), "message": .string(message)]
        if let data { error["data"] = data }
        return ["jsonrpc": "2.0", "id": id, "error": .object(error)]
    }
    private func encode(_ value: JSONValue) -> Data? { try? JSONEncoder().encode(value) }
}
