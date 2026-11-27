import { describe, expect, it } from "@effect/vitest"
import { type FeedRead, publisherFeeds } from "@podlist/feeds/publisher"
import { Effect, Layer } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import * as LocalDb from "../platform/LocalDb.ts"
import { makeStandaloneLibrary } from "./StandaloneLibrary.ts"

const feedUrl = "https://example.com/feed"
const memory = LocalDb.layerMemoryStandalone.pipe(Layer.provideMerge(Reactivity.layer))
const episode = (guid: string) => ({
  guid,
  title: guid,
  description: "",
  published: 0,
  duration: 60,
  audioUrl: `https://example.com/${guid}.mp3`,
  link: null,
  artworkUrl: null,
  chaptersUrl: null
})
const feed = (guids: string[]): FeedRead => ({
  kind: "updated",
  feed: {
    title: "Test podcast",
    author: null,
    description: null,
    artworkUrl: null,
    link: "https://example.com",
    episodes: guids.map(episode)
  },
  validators: { etag: '"tag"', lastModified: null }
})
const unexpectedFetch = () => Promise.reject(new Error("Unexpected network request"))

describe("Standalone Library", () => {
  it.effect("keeps a preview transient and retains single-Episode identity on Subscribe", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const publisher = {
        ...publisherFeeds(unexpectedFetch),
        read: async () => feed(["first", "second"])
      }
      const library = yield* makeStandaloneLibrary(publisher)
      expect((yield* library.readPodcast(feedUrl)).episodes).toHaveLength(2)
      expect(yield* sql`SELECT * FROM subscription`).toEqual([])
      const id = yield* library.bringEpisode(feedUrl, "first")
      const [row] = yield* sql<{
        unsubscribed_at: number | null
      }>`SELECT unsubscribed_at FROM subscription`
      expect(row?.unsubscribed_at).not.toBeNull()
      expect(yield* sql`SELECT id, guid FROM episode`).toEqual([{ id, guid: "first" }])

      const sub = yield* library.subscribe(feedUrl)
      expect(sub.unsubscribedAt).toBeNull()
      expect(yield* library.bringEpisode(feedUrl, "first")).toBe(id)
      expect(yield* sql`SELECT guid FROM episode ORDER BY guid`).toEqual([
        { guid: "first" },
        { guid: "second" }
      ])
      yield* library.unsubscribe(sub.id)
      expect(yield* library.bringEpisode(feedUrl, "first")).toBe(id)
    }).pipe(Effect.provide(memory))
  )

  it.effect("reuses validators and respects persisted failure backoff after restart", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const interval = 30 * 60_000
      let time = 0
      let attempts = 0
      const publisher: ReturnType<typeof publisherFeeds> = {
        ...publisherFeeds(unexpectedFetch),
        read: async (_url, validators) => {
          attempts++
          if (attempts === 1) return feed(["first"])
          expect(validators?.etag).toBe('"tag"')
          if (attempts < 4) throw new Error("Feed unavailable")
          return { kind: "notModified" }
        }
      }
      const first = yield* makeStandaloneLibrary(publisher, () => time)
      yield* first.subscribe(feedUrl)
      expect((yield* first.refresh({ automatic: true })).checked).toBe(0)
      time = interval
      expect((yield* first.refresh({ automatic: true })).failed).toBe(1)
      time = interval * 2
      expect((yield* first.refresh({ automatic: true })).failed).toBe(1)

      const restarted = yield* makeStandaloneLibrary(publisher, () => time)
      time = interval * 3
      expect((yield* restarted.refresh({ automatic: true })).checked).toBe(0)
      expect(attempts).toBe(3)
      expect((yield* restarted.refresh()).notModified).toBe(1)
      expect(yield* sql`SELECT failures, etag FROM feed_state`).toEqual([
        { failures: 0, etag: '"tag"' }
      ])
    }).pipe(Effect.provide(memory))
  )
})
