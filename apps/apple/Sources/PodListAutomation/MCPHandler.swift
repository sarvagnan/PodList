import Foundation

/// One handler per connection. Supports the MCP 2025-11-25 lifecycle over newline JSON-RPC.
public actor MCPHandler {
    private let tools: [JSONValue]
    private let call: @Sendable (String, JSONValue) async throws -> JSONValue
    private var initialized = false
    private var ready = false
    public init(tools: [JSONValue], call: @escaping @Sendable (String, JSONValue) async throws -> JSONValue) {
        self.tools = tools; self.call = call
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
        guard let id else {
            if method == "notifications/initialized", initialized { ready = true }
            return nil
        }
        if let params = request["params"], params.object == nil {
            return encode(rpcError(id, -32602, "Parameters must be an object"))
        }
        let params = request["params"] ?? [:]
        switch method {
        case "initialize":
            guard !initialized, params["protocolVersion"]?.string != nil,
                  params["capabilities"]?.object != nil, params["clientInfo"]?.object != nil else {
                return encode(rpcError(id, -32602, "Expected protocolVersion, capabilities and clientInfo; initialize once"))
            }
            initialized = true
            return encode(result(id, ["protocolVersion": "2025-11-25", "capabilities": ["tools": ["listChanged": false]],
                                      "serverInfo": ["name": "PodList", "version": "0.1.0"]]))
        case "ping": return encode(result(id, [:]))
        case "tools/list":
            guard ready else { return encode(rpcError(id, -32000, "Initialize the MCP session first")) }
            return encode(result(id, ["tools": .array(tools)]))
        case "tools/call":
            guard ready else { return encode(rpcError(id, -32000, "Initialize the MCP session first")) }
            do {
                guard let name = params["name"]?.string else { throw AutomationFailure("Supply a tool name.") }
                let value = try await call(name, params["arguments"] ?? [:])
                return encode(result(id, ["content": [["type": "text", "text": .string(try value.text())]],
                                          "structuredContent": value, "isError": false]))
            } catch {
                return encode(result(id, ["content": [["type": "text", "text": .string(error.localizedDescription)]], "isError": true]))
            }
        default: return encode(rpcError(id, -32601, "Method not found"))
        }
    }
    private func result(_ id: JSONValue, _ value: JSONValue) -> JSONValue { ["jsonrpc": "2.0", "id": id, "result": value] }
    private func rpcError(_ id: JSONValue, _ code: Int, _ message: String) -> JSONValue {
        ["jsonrpc": "2.0", "id": id, "error": ["code": .number(Double(code)), "message": .string(message)]]
    }
    private func encode(_ value: JSONValue) -> Data? { try? JSONEncoder().encode(value) }
}
