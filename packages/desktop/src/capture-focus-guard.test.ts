import type { ChildProcessWithoutNullStreams } from "node:child_process"
import { EventEmitter } from "node:events"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PassThrough } from "node:stream"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { startFocusGuard } from "../ui-capture/focus-guard.ts"

const processMocks = vi.hoisted(() => ({ execFile: vi.fn(), spawn: vi.fn() }))
vi.mock("node:child_process", () => processMocks)

describe("frontmost capture guard (mocked native monitor, no Electron)", () => {
  let dir: string
  let child: EventEmitter & {
    stdin: PassThrough
    stdout: PassThrough
    stderr: PassThrough
    kill: ReturnType<typeof vi.fn>
  }
  let guard: Awaited<ReturnType<typeof startFocusGuard>> | undefined

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "podlist-focus-test-"))
    guard = undefined
    child = Object.assign(new EventEmitter(), {
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: vi.fn()
    })
    // Stop answers with a final snapshot, as the Swift monitor does.
    child.stdin.on("finish", () => {
      child.stdout.write("after 100\n")
      child.emit("close", 0)
    })
    processMocks.execFile.mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1) as (error: null) => void
      callback(null)
    })
    processMocks.spawn.mockImplementation(() => {
      setImmediate(() => child.stdout.write("before 100\n"))
      return child as unknown as ChildProcessWithoutNullStreams
    })
  })
  afterEach(async () => {
    await guard?.stop().catch(() => {})
    rmSync(dir, { recursive: true, force: true })
  })

  it("allows the owner to switch apps and records before and after PIDs", async () => {
    guard = await startFocusGuard(dir, dir)
    guard.addElectron(200)
    child.stdout.write("activation 300\nactivation 400\n")
    await expect(guard.run(async () => "captured")).resolves.toBe("captured")
    await guard.stop()
    guard = undefined
    const log = JSON.parse(readFileSync(join(dir, "focus.json"), "utf8"))
    expect(log.electronPids).toEqual([200])
    expect(
      log.samples.map(({ phase, pid }: { phase: string; pid: number }) => [phase, pid])
    ).toEqual([
      ["before", 100],
      ["activation", 300],
      ["activation", 400],
      ["after", 100]
    ])
  })

  it("fails on even a brief Electron activation followed by another app", async () => {
    guard = await startFocusGuard(dir, dir)
    guard.addElectron(200)
    child.stdout.write("activation 200\nactivation 300\n")
    expect(() => guard?.assert()).toThrow("activated the Electron app")
    await expect(guard.stop()).rejects.toThrow("activated the Electron app")
    guard = undefined
  })

  it("detects a launch-time activation reported before Playwright supplies the PID", async () => {
    guard = await startFocusGuard(dir, dir)
    child.stdout.write("activation 200\nactivation 300\n")
    expect(() => guard?.addElectron(200)).toThrow("activated the Electron app")
  })

  it("fails closed if the native monitor exits during the capture", async () => {
    guard = await startFocusGuard(dir, dir)
    child.stderr.write("monitor failed")
    child.emit("close", 1)
    expect(() => guard?.assert()).toThrow("Frontmost monitor exited (1): monitor failed")
  })
})
