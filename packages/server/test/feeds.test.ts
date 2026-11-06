import { readFileSync } from "node:fs"
import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Ref } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"
import { parseDuration, parseFeed } from "../src/FeedParser.ts"
import { episodeId, Library } from "../src/Library.ts"

const xml = readFileSync(new URL("fixtures/night-shift.xml", import.meta.url), "utf8")

describe("feed parser", () => {
  it("reads podcast and Episode fields, skipping items without audio", () => {
    const feed = parseFeed(xml)
    expect(feed).toMatchObject({
      title: "Night Shift Histories",
      author: "Night Shift Media",
      artworkUrl: "https://example.test/podcast.jpg"
    })
    expect(feed.episodes).toHaveLength(2)
    expect(feed.episodes[0]).toEqual({
      guid: "ns-0212",
      title: "The night the bridge lights went out",
      description: "<p>In the summer of 1977…</p>",
      published: Date.UTC(2026, 10, 4, 6),
      duration: 4324,
      audioUrl: "https://example.test/0212.mp3",
      artworkUrl: "https://example.test/0212.jpg",
      chaptersUrl: "https://example.test/0212.chapters.json"
    })
    expect(feed.episodes[1]?.guid).toBe("https://example.test/0180.mp3")
  })

  it("parses iTunes durations", () => {
    expect([parseDuration("3600"), parseDuration("60:00"), parseDuration("1:00:00.5")]).toEqual([
      3600, 3600, 3600.5
    ])
    expect(parseDuration("soon")).toBeNull()
  })

  it("rejects documents that are not RSS", () => {
    expect(() => parseFeed("<html><body/></html>")).toThrow(/Not an RSS feed/)
  })
})

/** A fake network: serves the feed once with an ETag, then 304 when asked conditionally. */
const fakeNetwork = (requests: Ref.Ref<Array<Record<string, string>>>) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.gen(function* () {
        yield* Ref.update(requests, (all) => [...all, { ...request.headers }])
        const conditional = request.headers["if-none-match"] === '"v1"'
        return HttpClientResponse.fromWeb(
          request,
          conditional
            ? new Response(null, { status: 304 })
            : new Response(xml, { status: 200, headers: { etag: '"v1"' } })
        )
      })
    )
  )

describe("Library refresh", () => {
  it.effect("stores the Back Catalogue, then sends a conditional request", () =>
    Effect.gen(function* () {
      const requests = yield* Ref.make<Array<Record<string, string>>>([])
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO subscription ${sql.insert({
          id: "ns",
          feed_url: "https://example.test/feed.xml",
          title: "pending",
          subscribed_at: 0
        })}`
        const library = yield* Library

        const first = yield* library.refresh("ns")
        assert.deepStrictEqual(first, { _tag: "Updated", added: 2, changed: 0 })
        const second = yield* library.refresh("ns")
        assert.deepStrictEqual(second, { _tag: "NotModified" })
        const headers = yield* Ref.get(requests)
        assert.strictEqual(headers[1]?.["if-none-match"], '"v1"')

        const rows = yield* sql<{
          id: string
          title: string
        }>`SELECT id, title FROM episode ORDER BY published DESC`
        assert.deepStrictEqual(
          rows.map((r) => r.id),
          [episodeId("ns", "ns-0212"), episodeId("ns", "https://example.test/0180.mp3")]
        )
        const [sub] = yield* sql<{ title: string }>`SELECT title FROM subscription WHERE id = 'ns'`
        assert.strictEqual(sub?.title, "Night Shift Histories")
      }).pipe(
        Effect.provide(
          Library.layer.pipe(
            Layer.provideMerge(Database.layer(":memory:")),
            Layer.provide(fakeNetwork(requests))
          )
        )
      )
    })
  )

  it.effect("never deletes an Episode the feed stopped listing, and counts changes", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      yield* sql`INSERT INTO subscription ${sql.insert({ id: "ns", feed_url: "x", title: "t", subscribed_at: 0 })}`
      const library = yield* Library
      const feed = parseFeed(xml)
      yield* library.store("ns", feed)
      const [newest] = feed.episodes
      assert.isDefined(newest)
      const trimmed = { ...feed, episodes: [{ ...newest, title: "Renamed" }] }
      assert.deepStrictEqual(yield* library.store("ns", trimmed), { added: 0, changed: 1 })
      const [{ count } = { count: 0 }] = yield* sql<{
        count: number
      }>`SELECT count(*) AS count FROM episode`
      assert.strictEqual(count, 2)
    }).pipe(
      Effect.provide(
        Library.layer.pipe(
          Layer.provideMerge(Database.layer(":memory:")),
          Layer.provide(
            Layer.succeed(
              HttpClient.HttpClient,
              HttpClient.make(() => Effect.die("offline"))
            )
          )
        )
      )
    )
  )
})
