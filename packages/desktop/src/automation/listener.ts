import { type ChildProcessWithoutNullStreams, execFile, spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { createInterface } from "node:readline"
import { promisify } from "node:util"
import { MCPHandler, type ObjectValue } from "./handler.ts"

export const endpoint = (userData: string, platform = process.platform) =>
  platform === "win32"
    ? `\\\\.\\pipe\\podlist-${createHash("sha256").update(userData).digest("hex")}-mcp`
    : join(userData, "mcp.sock")

/** Machine-local preference belongs to main's config, never Library State. */
export class AutomationListener {
  private child: ChildProcessWithoutNullStreams | undefined
  private serial = Promise.resolve()
  error: string | null = null
  readonly binary: string
  readonly userData: string
  readonly call: (name: string, args: ObjectValue) => Promise<unknown>
  constructor(
    binary: string,
    userData: string,
    call: (name: string, args: ObjectValue) => Promise<unknown>
  ) {
    this.binary = binary
    this.userData = userData
    this.call = call
  }
  get configuration() {
    return JSON.stringify(
      {
        mcpServers: {
          podlist: { command: this.binary, args: ["--socket", endpoint(this.userData)] }
        }
      },
      null,
      2
    )
  }
  setEnabled(enabled: boolean) {
    const work = this.serial.then(async () => {
      if (enabled) await this.start()
      else {
        await this.stop()
        await this.clean()
      }
    })
    this.serial = work.catch(() => {})
    return work
  }
  private async start() {
    if (this.child) return
    await mkdir(this.userData, { recursive: true, mode: 0o700 })
    const child = spawn(this.binary, ["--serve", "--socket", endpoint(this.userData)], {
      windowsHide: true
    })
    this.child = child
    // A crashed helper can close stdin before its process close event arrives.
    // That close event reports the failure; an EPIPE must not crash Electron.
    child.stdin.on("error", () => {})
    const handler = new MCPHandler(this.call)
    const lines = createInterface({ input: child.stdout })
    let diagnostics = ""
    child.stderr.on("data", (data) => {
      diagnostics = (diagnostics + String(data)).slice(-8192)
    })
    // Serialize requests, as the Mac action layer does. Bound the backlog per listener.
    let pending = 0
    let requests = Promise.resolve()
    await new Promise<void>((resolve, reject) => {
      const fail = (e: Error) => {
        this.error = e.message
        reject(e)
      }
      const timer = setTimeout(() => {
        fail(new Error("The MCP listener did not start."))
        child.kill()
      }, 5000)
      child.once("error", (e) => {
        clearTimeout(timer)
        fail(e)
      })
      child.once("close", () => {
        clearTimeout(timer)
        if (this.child === child) {
          this.child = undefined
          this.error = diagnostics.trim() || "The MCP listener stopped."
        }
        reject(new Error(diagnostics.trim() || "The MCP listener stopped."))
      })
      lines.on("line", (line) => {
        if (line === "ready") {
          clearTimeout(timer)
          this.error = null
          resolve()
          return
        }
        const tab = line.indexOf("\t")
        if (tab < 1 || !/^\d+$/.test(line.slice(0, tab))) return
        if (++pending > 64) {
          child.stdin.end()
          return
        }
        requests = requests
          .then(async () => {
            try {
              if (this.child !== child || child.stdin.destroyed || child.stdin.writableEnded) return
              const reply = await handler.handle(line.slice(tab + 1))
              if (reply !== undefined && !child.stdin.destroyed && !child.stdin.writableEnded)
                child.stdin.write(`${line.slice(0, tab)}\t${reply}\n`)
            } finally {
              pending--
            }
          })
          .catch(() => {})
      })
    }).catch(async (e: unknown) => {
      await this.stop()
      throw e
    })
  }
  private async clean() {
    await promisify(execFile)(this.binary, ["--clean", "--socket", endpoint(this.userData)], {
      windowsHide: true
    })
  }
  async stop() {
    const child = this.child
    if (!child) return
    this.child = undefined
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => child.kill(), 1000)
      child.once("close", () => {
        clearTimeout(timer)
        resolve()
      })
      child.stdin.end()
    })
    this.error = null
    await this.clean()
  }
}
