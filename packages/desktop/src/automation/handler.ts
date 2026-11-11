export const protocolVersion = "2026-07-28"
export type ObjectValue = Record<string, unknown>
export const object = (value: unknown): value is ObjectValue =>
  typeof value === "object" && value !== null && !Array.isArray(value)
const text = { type: "string", minLength: 1 }
const ids = { type: "array", items: text, minItems: 1, maxItems: 200 }
const page = {
  offset: { type: "integer", minimum: 0, maximum: 1000000 },
  limit: { type: "integer", minimum: 1, maximum: 200 }
}
const tool = (
  name: string,
  description: string,
  properties: ObjectValue = {},
  required: string[] = []
) => ({
  name,
  description,
  inputSchema: { type: "object", properties, required, additionalProperties: false }
})
// Keep this catalog identical to PodListUI.AutomationActions.tools on the Mac.
export const tools = [
  tool("play", "Resume the Active Playlist."),
  tool("pause", "Pause playback."),
  tool("toggle", "Toggle playback."),
  tool("skip_back", "Skip back 15 seconds."),
  tool("skip_forward", "Skip forward 30 seconds."),
  tool("now_playing", "Episode, podcast, Position in seconds and Active Playlist."),
  tool(
    "play_episode",
    "Play an Episode now in the Active Playlist. Offers Undo.",
    { episode_id: text },
    ["episode_id"]
  ),
  tool(
    "add_episodes",
    "Add or move Episodes to a Playlist, Active by default. Offers Undo.",
    { episode_ids: ids, playlist_id: text, placement: { type: "string", enum: ["next", "last"] } },
    ["episode_ids"]
  ),
  tool("add_current", "Add the current Episode to a Playlist, Active by default. Offers Undo.", {
    playlist_id: text
  }),
  tool("list_views", "List Views with Episode counts.", page),
  tool("list_playlists", "List Playlists with Entry counts and Active status.", page),
  tool(
    "list_episodes",
    "List a View's Episodes or a Playlist's ordered Entries. Supply exactly one id.",
    { ...page, view_id: text, playlist_id: text }
  ),
  tool(
    "search_episodes",
    "Search Library titles, podcasts and show notes using the app's text matching.",
    { ...page, text },
    ["text"]
  ),
  tool(
    "set_starred",
    "Star or Unstar Episodes. Offers Undo.",
    { episode_ids: ids, starred: { type: "boolean" } },
    ["episode_ids", "starred"]
  ),
  tool(
    "set_played",
    "Mark Episodes Played or Unplayed. Offers Undo.",
    { episode_ids: ids, played: { type: "boolean" } },
    ["episode_ids", "played"]
  )
].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

export function validate(name: string, args: ObjectValue) {
  const schema = tools.find((t) => t.name === name)?.inputSchema
  if (!schema) throw new Error(`Unknown action: ${name}.`)
  for (const key of schema.required)
    if (!(key in args)) throw new Error(`Missing argument: ${key}.`)
  for (const [key, value] of Object.entries(args)) {
    const rule = schema.properties[key]
    if (!object(rule)) throw new Error(`Unknown argument: ${key}.`)
    const valid =
      rule.type === "string"
        ? typeof value === "string" &&
          value.trim().length > 0 &&
          new TextEncoder().encode(value).length <= 8192 &&
          (!Array.isArray(rule.enum) || rule.enum.includes(value))
        : rule.type === "boolean"
          ? typeof value === "boolean"
          : rule.type === "array"
            ? Array.isArray(value) &&
              value.length > 0 &&
              value.length <= 200 &&
              value.every(
                (v) =>
                  typeof v === "string" &&
                  v.length > 0 &&
                  new TextEncoder().encode(v).length <= 8192
              )
            : rule.type === "integer" &&
              typeof value === "number" &&
              Number.isInteger(value) &&
              value >= Number(rule.minimum) &&
              value <= Number(rule.maximum)
    if (!valid) throw new Error(`Invalid argument: ${key}.`)
  }
}

export class MCPHandler {
  private readonly call: (name: string, args: ObjectValue) => Promise<unknown>
  constructor(call: (name: string, args: ObjectValue) => Promise<unknown>) {
    this.call = call
  }
  async handle(line: string): Promise<string | undefined> {
    const error = (id: unknown, code: number, message: string, data?: unknown) =>
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code, message, ...(data === undefined ? {} : { data }) }
      })
    let request: unknown
    try {
      request = JSON.parse(line)
    } catch {
      return error(null, -32700, "Parse error")
    }
    if (
      !object(request) ||
      request.jsonrpc !== "2.0" ||
      typeof request.method !== "string" ||
      ("id" in request && typeof request.id !== "string" && typeof request.id !== "number")
    )
      return error(null, -32600, "Invalid Request")
    if (!("id" in request)) return undefined
    const { id, method } = request
    const params = request.params
    const unsupported = (requested: unknown, message = "Unsupported protocol version") =>
      error(id, -32022, message, { supported: [protocolVersion], requested })
    if (method === "initialize")
      return unsupported(
        object(params)
          ? ((object(params._meta)
              ? params._meta["io.modelcontextprotocol/protocolVersion"]
              : undefined) ??
              params.protocolVersion ??
              "unknown")
          : "unknown",
        "PodList requires MCP 2026-07-28; the initialize handshake is not supported"
      )
    if (params !== undefined && !object(params))
      return error(id, -32602, "Parameters must be an object")
    const p = params ?? {}
    const meta = p._meta
    if (!object(meta) || typeof meta["io.modelcontextprotocol/protocolVersion"] !== "string")
      return error(
        id,
        -32602,
        "Supply _meta.io.modelcontextprotocol/protocolVersion and clientCapabilities"
      )
    if (meta["io.modelcontextprotocol/protocolVersion"] !== protocolVersion)
      return unsupported(meta["io.modelcontextprotocol/protocolVersion"])
    if (!object(meta["io.modelcontextprotocol/clientCapabilities"]))
      return error(
        id,
        -32602,
        "Supply _meta.io.modelcontextprotocol/clientCapabilities as an object"
      )
    const info = meta["io.modelcontextprotocol/clientInfo"]
    if (
      info !== undefined &&
      (!object(info) || typeof info.name !== "string" || typeof info.version !== "string")
    )
      return error(id, -32602, "clientInfo must include name and version")
    const result = (value: ObjectValue) =>
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: {
          ...value,
          resultType: "complete",
          _meta: { "io.modelcontextprotocol/serverInfo": { name: "PodList", version: "0.1.0" } }
        }
      })
    const cache = { ttlMs: 300000, cacheScope: "private" }
    switch (method) {
      case "server/discover":
        return result({
          supportedVersions: [protocolVersion],
          capabilities: { tools: { listChanged: false } },
          ...cache
        })
      case "tools/list":
        if (p.cursor !== undefined && typeof p.cursor !== "string")
          return error(id, -32602, "Cursor must be a string")
        return result({ tools, ...cache })
      case "tools/call": {
        if (typeof p.name !== "string") return error(id, -32602, "Supply a tool name")
        if (!tools.some((t) => t.name === p.name))
          return error(id, -32602, `Unknown tool: ${p.name}`)
        if (p.arguments !== undefined && !object(p.arguments))
          return error(id, -32602, "Arguments must be an object")
        try {
          const args = p.arguments ?? {}
          validate(p.name, args)
          const value = await this.call(p.name, args)
          return result({
            content: [{ type: "text", text: JSON.stringify(value) }],
            structuredContent: value,
            isError: false
          })
        } catch (e) {
          return result({
            content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
            isError: true
          })
        }
      }
      default:
        return error(id, -32601, "Method not found")
    }
  }
}
