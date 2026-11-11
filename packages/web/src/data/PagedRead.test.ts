import { describe, expect, it } from "vitest"
import { PagedRead, pageControls } from "./PagedRead.ts"

describe("server list continuation", () => {
  it("loads only the first page, appends on demand and keeps loaded depth on refresh", async () => {
    const calls: Array<string | undefined> = []
    const read = new PagedRead(async (continuation) => {
      calls.push(continuation)
      return { items: [continuation ? 2 : 1], total: 2, continuation: continuation ? null : "next" }
    })
    const first = await read.read()
    expect(first).toEqual([1])
    expect(calls).toEqual([undefined])
    const next = await pageControls(first)?.more?.()
    expect(next).toEqual([1, 2])
    expect(next && pageControls(next)?.more).toBeNull()
    expect(await read.read()).toEqual([1, 2])
  })
  it.each(["ReadChanged", "InvalidContinuation"])(
    "restarts from the top after %s without mixing pages",
    async (_tag) => {
      let changed = false
      const read = new PagedRead(async (continuation) => {
        if (continuation === "old") {
          changed = true
          throw { _tag }
        }
        return {
          items: [continuation ? 3 : changed ? 2 : 1],
          total: 2,
          continuation: continuation ? null : changed ? "new" : "old"
        }
      })
      const first = await read.read()
      expect(await pageControls(first)?.more?.()).toEqual([2, 3])
    }
  )
  it("retries a failed page with the same continuation", async () => {
    let fail = true
    const read = new PagedRead(async (continuation) => {
      if (continuation && fail) {
        fail = false
        throw new Error("network")
      }
      return { items: [continuation ? 2 : 1], total: 2, continuation: continuation ? null : "next" }
    })
    const first = await read.read()
    await expect(pageControls(first)?.more?.()).rejects.toThrow("network")
    expect(await pageControls(first)?.more?.()).toEqual([1, 2])
  })
})
