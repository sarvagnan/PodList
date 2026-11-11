import { spawn } from "node:child_process"
import { once } from "node:events"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { connect } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { buildMCP } from "../../scripts/build-mcp.ts"
import { protocolVersion } from "./handler.ts"
import { AutomationListener, endpoint } from "./listener.ts"

let binary: string
const listeners: AutomationListener[] = []
const children: ReturnType<typeof spawn>[] = []
const sockets: ReturnType<typeof connect>[] = []
const directory = () => mkdtempSync(join(tmpdir(), "pl-mcp-"))
const make = (dir = directory()) => {
  const listener = new AutomationListener(binary, dir, async () => ({ ok: true }))
  listeners.push(listener)
  return listener
}
const call = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "server/discover",
  params: {
    _meta: {
      "io.modelcontextprotocol/protocolVersion": protocolVersion,
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
})
const client = async (listener: AutomationListener) => {
  const socket = connect(endpoint(listener.userData))
  sockets.push(socket)
  socket.on("error", () => {})
  await once(socket, "connect")
  return socket
}
const bridge = (listener: AutomationListener) => {
  const child = spawn(binary, ["--socket", endpoint(listener.userData)], { windowsHide: true })
  children.push(child)
  let error = ""
  child.stderr.on("data", (data) => {
    error += String(data)
  })
  return { child, error: () => error }
}
beforeAll(() => {
  binary = buildMCP(directory())
})
afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  for (const child of children.splice(0)) child.kill()
  for (const listener of listeners.splice(0)) await listener.stop()
})

describe("opt-in local listener and bundled bridge (no windows)", () => {
  it("is off until enabled, serves requests, and stops connections and removes its endpoint", async () => {
    const listener = make()
    await listener.setEnabled(false)
    if (process.platform !== "win32") expect(existsSync(endpoint(listener.userData))).toBe(false)
    await listener.setEnabled(true)
    if (process.platform !== "win32") {
      expect(statSync(listener.userData).mode & 0o777).toBe(0o700)
      expect(statSync(endpoint(listener.userData)).mode & 0o777).toBe(0o600)
    }
    const socket = await client(listener),
      lines = createInterface({ input: socket })
    const response = once(lines, "line")
    socket.write(`${call}\n`)
    expect(JSON.parse((await response)[0]).result.resultType).toBe("complete")
    const closed = once(socket, "close")
    await listener.setEnabled(false)
    await closed
    if (process.platform !== "win32") expect(existsSync(endpoint(listener.userData))).toBe(false)
    await listener.setEnabled(true)
    expect(await client(listener)).toBeDefined()
    const configuration = JSON.parse(listener.configuration).mcpServers.podlist
    expect(Object.keys(configuration).sort()).toEqual(["args", "command"])
    expect(configuration.command).toBe(binary)
  })
  it("does not let another instance take over or unlink a live listener", async () => {
    const first = make(),
      second = make(first.userData)
    await first.setEnabled(true)
    await expect(second.setEnabled(true)).rejects.toThrow(/already serving MCP/)
    await second.setEnabled(false)
    const socket = await client(first),
      lines = createInterface({ input: socket })
    const response = once(lines, "line")
    socket.write(`${call}\n`)
    expect(JSON.parse((await response)[0]).result.supportedVersions).toEqual([protocolVersion])
  })
  it("reports a missing transport executable without hanging startup", async () => {
    const listener = new AutomationListener(
      join(directory(), "missing"),
      directory(),
      async () => ({})
    )
    listeners.push(listener)
    await expect(listener.setEnabled(true)).rejects.toThrow(/ENOENT/)
  })
  it("reports app absent or MCP off exclusively on stderr", async () => {
    const listener = make(),
      b = bridge(listener)
    expect((await once(b.child, "exit"))[0]).toBe(1)
    expect(b.error()).toContain("the app is not running or MCP is turned off")
    expect(b.child.stdout.read()).toBeNull()
  })
  it("relays newline JSON-RPC and reports PodList closing an open connection", async () => {
    const listener = make()
    await listener.setEnabled(true)
    const b = bridge(listener),
      lines = createInterface({ input: b.child.stdout })
    const response = once(lines, "line")
    b.child.stdin.write(`${call}\n`)
    expect(JSON.parse((await response)[0]).id).toBe(1)
    const exited = once(b.child, "exit")
    await listener.setEnabled(false)
    expect((await exited)[0]).toBe(1)
    expect(b.error()).toContain("PodList closed the connection")
  })
  it("treats client stdin EOF as normal and rejects oversized messages", async () => {
    const listener = make()
    await listener.setEnabled(true)
    const b = bridge(listener),
      lines = createInterface({ input: b.child.stdout })
    const response = once(lines, "line")
    b.child.stdin.write(`${call}\n`)
    await response
    const exited = once(b.child, "exit")
    b.child.stdin.end()
    expect((await exited)[0]).toBe(0)
    expect(b.error()).toBe("")
    const socket = await client(listener),
      closed = once(socket, "close")
    socket.write("x".repeat(1048577))
    await closed
  })
  it.skipIf(process.platform === "win32")(
    "cleans a crashed socket on disabled startup, and refuses symlinks or unexpected files",
    async () => {
      const listener = make()
      const child = spawn(binary, ["--serve", "--socket", endpoint(listener.userData)])
      children.push(child)
      await once(createInterface({ input: child.stdout }), "line")
      const exited = once(child, "exit")
      child.kill("SIGKILL")
      await exited
      expect(existsSync(endpoint(listener.userData))).toBe(true)
      await listener.setEnabled(false)
      expect(existsSync(endpoint(listener.userData))).toBe(false)
      writeFileSync(endpoint(listener.userData), "keep")
      await expect(listener.setEnabled(true)).rejects.toThrow(/unexpected file/)
      expect(readFileSync(endpoint(listener.userData), "utf8")).toBe("keep")
      const link = join(directory(), "linked")
      symlinkSync(directory(), link)
      await expect(make(link).setEnabled(true)).rejects.toThrow(/owned by this user/)
    }
  )
})
