import { id3ProbeBytes } from "@podlist/feeds/id3"
import { Effect } from "effect"
import { expect, test, vi } from "vitest"
import { resolveLocalChapters } from "./DownloadedChapters.ts"

const frame = (id: string, body: number[]) => [
  ...Array.from(id, (letter) => letter.charCodeAt(0)),
  0,
  0,
  0,
  body.length,
  0,
  0,
  ...body
]

const title = frame("TIT2", [3, 79, 112, 101, 110])
const chapter = frame("CHAP", [65, 0, 0, 0, 11, 184, ...new Array<number>(12).fill(0), ...title])
const id3 = Uint8Array.from([73, 68, 51, 4, 0, 0, 0, 0, 0, chapter.length, ...chapter])

test("decodes the bounded prefix of an existing download without network access", async () => {
  const remote = vi.fn(() => [])
  const readPrefix = vi.fn(() => Effect.succeed(id3))
  const result = await Effect.runPromise(
    resolveLocalChapters({
      cached: [],
      preferDownload: true,
      remote: Effect.sync(remote),
      readPrefix
    })
  )
  expect(result).toMatchObject([{ start: 3, title: "Open", artwork: null, url: null }])
  expect(readPrefix).toHaveBeenCalledExactlyOnceWith(id3ProbeBytes)
  expect(remote).not.toHaveBeenCalled()
})

test("falls back to downloaded audio when the publisher chapter request fails", async () => {
  const result = await Effect.runPromise(
    resolveLocalChapters({
      cached: [],
      preferDownload: false,
      remote: Effect.fail("offline"),
      readPrefix: () => Effect.succeed(id3)
    })
  )
  expect(result[0]?.title).toBe("Open")
})

test("skips incomplete CHAP frames", async () => {
  const result = await Effect.runPromise(
    resolveLocalChapters({
      cached: [],
      preferDownload: true,
      remote: Effect.succeed([]),
      readPrefix: () => Effect.succeed(id3.subarray(0, id3.length - 1))
    })
  )
  expect(result).toEqual([])
})
