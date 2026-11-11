import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"
import { MCPHandler, protocolVersion, tools } from "./handler.ts"

export const meta = {
  "io.modelcontextprotocol/protocolVersion": protocolVersion,
  "io.modelcontextprotocol/clientCapabilities": {}
}
export const request = (method: string, params: Record<string, unknown> = {}) =>
  JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { _meta: meta, ...params } })
const reply = async (handler: MCPHandler, line: string) =>
  JSON.parse((await handler.handle(line)) ?? "null")

describe("Mac-compatible stateless MCP", () => {
  it("discovers and lists a deterministic, private five-minute catalog with complete results", async () => {
    const handler = new MCPHandler(async () => ({}))
    const discovery = (await reply(handler, request("server/discover"))).result
    expect(discovery).toEqual({
      supportedVersions: [protocolVersion],
      capabilities: { tools: { listChanged: false } },
      ttlMs: 300000,
      cacheScope: "private",
      resultType: "complete",
      _meta: { "io.modelcontextprotocol/serverInfo": { name: "PodList", version: "0.1.0" } }
    })
    const list = (await reply(handler, request("tools/list"))).result
    expect(list).toMatchObject({
      tools,
      ttlMs: 300000,
      cacheScope: "private",
      resultType: "complete"
    })
    expect(tools.map((t) => t.name)).toEqual([...tools.map((t) => t.name)].sort())
    const swift = readFileSync(
      new URL("../../../../apps/apple/Sources/PodListUI/AutomationActions.swift", import.meta.url),
      "utf8"
    )
    const reference = [...swift.matchAll(/tool\("([^"]+)", "([^"]+)"/g)]
      .map((m) => ({ name: m[1], description: m[2] }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    expect(tools.map(({ name, description }) => ({ name, description }))).toEqual(reference)
    expect(tools.map((t) => t.inputSchema)).toMatchSnapshot()
  })
  it("calls with structured and text content, while action failures are tool errors", async () => {
    const call = vi.fn(async () => ({ episode_ids: ["e"], undo: "Undo Star" }))
    const handler = new MCPHandler(call)
    const result = (
      await reply(
        handler,
        request("tools/call", {
          name: "set_starred",
          arguments: { episode_ids: ["e"], starred: true }
        })
      )
    ).result
    expect(result).toMatchObject({
      structuredContent: { episode_ids: ["e"], undo: "Undo Star" },
      content: [{ type: "text", text: '{"episode_ids":["e"],"undo":"Undo Star"}' }],
      isError: false,
      resultType: "complete"
    })
    expect(call).toHaveBeenCalledWith("set_starred", { episode_ids: ["e"], starred: true })
    const failed = (
      await reply(
        new MCPHandler(async () => {
          throw new Error("Unavailable")
        }),
        request("tools/call", { name: "play" })
      )
    ).result
    expect(failed).toMatchObject({
      isError: true,
      content: [{ type: "text", text: "Unavailable" }],
      resultType: "complete"
    })
  })
  it("rejects initialize and unsupported revisions without establishing connection state", async () => {
    const handler = new MCPHandler(async () => ({}))
    for (const line of [
      request("initialize"),
      request("tools/list", {
        _meta: { ...meta, "io.modelcontextprotocol/protocolVersion": "2025-11-25" }
      })
    ]) {
      expect((await reply(handler, line)).error).toMatchObject({
        code: -32022,
        data: { supported: [protocolVersion] }
      })
    }
    expect(
      (await reply(handler, JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }))).error
        .code
    ).toBe(-32602)
    expect((await reply(handler, request("tools/list"))).result.tools).toHaveLength(15)
  })
  it("validates JSON-RPC, per-request metadata and protocol parameters", async () => {
    const handler = new MCPHandler(async () => ({}))
    for (const malformed of [
      "[]",
      "null",
      '{"jsonrpc":"1.0","id":1,"method":"tools/list"}',
      '{"jsonrpc":"2.0","id":null,"method":"tools/list"}'
    ])
      expect((await reply(handler, malformed)).error.code).toBe(-32600)
    expect((await reply(handler, "{")).error.code).toBe(-32700)
    for (const params of [
      null,
      [],
      { _meta: {} },
      { _meta: { "io.modelcontextprotocol/protocolVersion": protocolVersion } },
      { _meta: { ...meta, "io.modelcontextprotocol/clientCapabilities": [] } },
      { _meta: { ...meta, "io.modelcontextprotocol/clientInfo": { name: "client" } } },
      { _meta: meta, cursor: 42 }
    ]) {
      expect(
        (
          await reply(
            handler,
            JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params })
          )
        ).error.code
      ).toBe(-32602)
    }
    for (const method of ["ping", "notifications/initialized", "unknown"])
      expect((await reply(handler, request(method))).error.code).toBe(-32601)
  })
  it("never runs notifications, rejects unknown tools, and validates tool arguments", async () => {
    const call = vi.fn(async () => ({})),
      handler = new MCPHandler(call)
    expect(
      await handler.handle('{"jsonrpc":"2.0","method":"tools/call","params":{"name":"play"}}')
    ).toBeUndefined()
    expect(call).not.toHaveBeenCalled()
    for (const params of [{}, { name: "empty_trash" }, { name: "play", arguments: [] }])
      expect((await reply(handler, request("tools/call", params))).error.code).toBe(-32602)
    for (const params of [
      { name: "play", arguments: { unexpected: true } },
      { name: "set_starred", arguments: { episode_ids: [], starred: true } },
      { name: "set_starred", arguments: { episode_ids: ["e"] } },
      { name: "list_views", arguments: { limit: 201 } },
      { name: "list_views", arguments: { offset: 1.5 } },
      { name: "search_episodes", arguments: { text: " " } }
    ])
      expect((await reply(handler, request("tools/call", params))).result.isError).toBe(true)
    expect(call).not.toHaveBeenCalled()
  })
})
