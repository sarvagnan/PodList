import { describe, expect, it, vi } from "vitest"
import { OpmlImport, readOpml } from "./OpmlImport.ts"

const xml =
  '<opml><body><outline text="Known" xmlUrl="known"/><outline text="Good" xmlUrl="good"/><outline xmlUrl="bad"/><outline xmlUrl="good"/></body></opml>'
const file = (text = xml, name = "Subscriptions.opml") => new File([text], name)
const known = async () => new Set(["known"])

describe("confirmed OPML import", () => {
  it("selects and summarises without subscribing, supports replacing and cancelling", async () => {
    const job = new OpmlImport()
    const subscribe = vi.fn()
    await job.select(file(), known)
    expect(job.getSnapshot().name).toBe("Subscriptions.opml")
    expect(job.getSnapshot().phase).toBe("ready")
    expect(job.getSnapshot().podcasts).toHaveLength(3)
    expect(
      job.getSnapshot().podcasts.filter((p) => p.result === "already in the Library")
    ).toHaveLength(1)
    expect(subscribe).not.toHaveBeenCalled()
    await job.select(
      file('<opml><body><outline xmlUrl="other"/></body></opml>', "Other.opml"),
      known
    )
    expect(job.getSnapshot().name).toBe("Other.opml")
    expect(job.getSnapshot().podcasts).toHaveLength(1)
    job.cancel()
    await job.run(known, subscribe)
    expect(job.getSnapshot().phase).toBe("empty")
    expect(subscribe).not.toHaveBeenCalled()
  })
  it("Import subscribes, counts progress, retains each outcome and retries only failures", async () => {
    const job = new OpmlImport()
    const existing = new Set(["known"])
    const counts: number[] = []
    await job.select(file(), async () => existing)
    job.listen(() =>
      counts.push(job.getSnapshot().podcasts.filter((p) => p.result !== "pending").length)
    )
    const subscribe = vi.fn(async (feed: string) => {
      if (feed === "bad") throw new Error("Host unavailable")
      existing.add(feed)
    })
    await job.run(async () => existing, subscribe)
    expect(subscribe.mock.calls.map((c) => c[0])).toEqual(["good", "bad"])
    expect(counts).toContain(0)
    expect(counts).toContain(1)
    expect(counts).toContain(2)
    expect(counts).toContain(3)
    expect(job.getSnapshot().podcasts.map((p) => p.result)).toEqual([
      "already in the Library",
      "added",
      "failed"
    ])
    expect(job.getSnapshot().podcasts[2]?.reason).toBe("Host unavailable")
    const retry = vi.fn(async () => {})
    await job.run(async () => existing, retry, true)
    expect(retry.mock.calls).toHaveLength(1)
    expect(job.getSnapshot().podcasts.map((p) => p.result)).toEqual([
      "already in the Library",
      "added",
      "added"
    ])
  })
  it("keeps going without sheet listeners, prevents unload only while running and skips concurrent additions", async () => {
    const job = new OpmlImport()
    await job.select(file(), known)
    const remove = job.listen(() => {})
    let release = () => {}
    const wait = new Promise<void>((resolve) => {
      release = resolve
    })
    const entered = Promise.withResolvers<void>()
    const subscribe = vi.fn(async () => {
      entered.resolve()
      await wait
    })
    const run = job.run(async () => new Set(["known", "bad"]), subscribe)
    await entered.promise
    const event = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    remove()
    job.cancel()
    expect(job.getSnapshot().phase).toBe("running")
    release()
    await run
    expect(subscribe.mock.calls).toHaveLength(1)
    expect(job.getSnapshot().phase).toBe("finished")
    const finished = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(finished)
    expect(finished.defaultPrevented).toBe(false)
  })
  it("rejects unreadable or unsafe files before Import", async () => {
    for (const text of [
      "not XML",
      "<opml/>",
      "<opml><body></opml>",
      "<!DOCTYPE opml><opml><body/></opml>"
    ]) {
      const job = new OpmlImport()
      await job.select(file(text), known)
      const subscribe = vi.fn()
      await job.run(known, subscribe)
      expect(job.getSnapshot().phase).toBe("error")
      expect(job.getSnapshot().error).toBeTruthy()
      expect(subscribe).not.toHaveBeenCalled()
    }
    expect(
      readOpml('<opml><body><outline text="Folder"><outline xmlUrl="x"/></outline></body></opml>')
    ).toHaveLength(1)
  })
  it("does not restore a cancelled or replaced slow selection", async () => {
    const job = new OpmlImport()
    const deferred = Promise.withResolvers<ReadonlySet<string>>()
    const reading = job.select(file(), () => deferred.promise)
    await Promise.resolve()
    job.cancel()
    deferred.resolve(new Set())
    await reading
    expect(job.getSnapshot().phase).toBe("empty")
  })
})
