import { execFile, spawn } from "node:child_process"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { createInterface } from "node:readline"
import { promisify } from "node:util"

/** Starts before Electron launches and stays alive until after Electron closes. */
export const startFocusGuard = async (out: string, temporary: string) => {
  const binary = join(temporary, "frontmost")
  await promisify(execFile)(
    "/usr/bin/swiftc",
    [
      "-module-cache-path",
      join(temporary, "swift-cache"),
      join(import.meta.dirname, "frontmost.swift"),
      "-o",
      binary
    ],
    { timeout: 60_000 }
  )
  const monitor = spawn(binary, [], { stdio: ["pipe", "pipe", "pipe"] })
  const samples: { phase: string; pid: number; at: string }[] = []
  const electronPids = new Set<number>()
  let error: Error | undefined
  let rejectFailure: (error: Error) => void
  const failure = new Promise<never>((_, reject) => {
    rejectFailure = reject
  })
  // The monitor is started before the first guarded operation.
  void failure.catch(() => {})
  const fail = (reason: Error) => {
    error ??= reason
    rejectFailure(error)
  }
  monitor.stdin.on("error", fail)
  const assert = () => {
    if (error) throw error
  }
  const check = () => {
    if (samples.some(({ pid }) => electronPids.has(pid)))
      fail(new Error("Hidden capture activated the Electron app. See focus.json."))
    assert()
  }
  let stderr = ""
  monitor.stderr.on("data", (data) => {
    stderr += data.toString()
  })
  let ready: () => void
  const started = new Promise<void>((resolve) => {
    ready = resolve
  })
  let stopping = false
  const exited = new Promise<void>((resolve) => {
    monitor.once("error", (reason) => {
      fail(reason)
      resolve()
    })
    monitor.once("close", (code) => {
      if (!stopping || code !== 0 || !samples.some((s) => s.phase === "after"))
        fail(new Error(`Frontmost monitor exited (${code}): ${stderr}`))
      resolve()
    })
  })
  const lines = createInterface({ input: monitor.stdout })
  lines.on("line", (line) => {
    const match = /^(before|activation|after) (\d+)$/.exec(line)
    if (!match) {
      fail(new Error(`Unexpected frontmost monitor output: ${line}`))
      return
    }
    const sample = {
      phase: match[1] as string,
      pid: Number(match[2]),
      at: new Date().toISOString()
    }
    samples.push(sample)
    writeFileSync(
      join(out, "focus.json"),
      JSON.stringify({ electronPids: [...electronPids], samples }, null, 2)
    )
    if (electronPids.has(sample.pid))
      fail(new Error("Hidden capture activated the Electron app. See focus.json."))
    if (sample.phase === "before") ready()
  })
  const timeout = setTimeout(
    () => fail(new Error("Frontmost monitor did not become ready.")),
    15_000
  )
  try {
    await Promise.race([started, failure])
  } catch (reason) {
    monitor.kill()
    await exited
    throw reason
  } finally {
    clearTimeout(timeout)
  }
  return {
    assert,
    addElectron(pid: number) {
      electronPids.add(pid)
      check()
    },
    run: <T>(operation: () => Promise<T>) => {
      assert()
      return Promise.race([operation(), failure])
    },
    async stop() {
      stopping = true
      monitor.stdin.end("stop\n")
      const kill = setTimeout(() => monitor.kill(), 10_000)
      try {
        await exited
        check()
      } finally {
        clearTimeout(kill)
        lines.close()
      }
    }
  }
}
