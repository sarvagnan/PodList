import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpClient } from "effect/http"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"
import type { ParsedEpisode, ParsedFeed } from "../src/FeedParser.ts"
import { Library } from "../src/Library.ts"

const episode = (overrides: Partial<ParsedEpisode>): ParsedEpisode => ({
  guid: "g1",
  title: "The quiet sun problem",
  description: "",
  published: 1000,
  duration: 2460,
  audioUrl: "https://cdn.test/a.mp3",
  artworkUrl: null,
  chaptersUrl: null,
  ...overrides
})
const feed = (...episodes: Array<ParsedEpisode>): ParsedFeed => ({
  title: "Deep Field",
  author: null,
  description: null,
  artworkUrl: null,
  episodes
})

const services = Library.layer.pipe(
  Layer.provideMerge(Database.layer(":memory:")),
  Layer.provide(
    Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make(() => Effect.die("offline"))
    )
  )
)

const setup = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  yield* sql`INSERT INTO subscription ${sql.insert({ id: "s", feed_url: "f", title: "t", subscribed_at: 0 })}`
  return { sql, library: yield* Library }
})
const episodes = (sql: SqlClient.SqlClient) =>
  sql<{ id: string; guid: string; audio_url: string; audio_updated_at: number | null }>`
    SELECT id, guid, audio_url, audio_updated_at FROM episode ORDER BY guid`

describe("feed edge cases", () => {
  it.effect("flags replaced audio only when the length changes by more than 30 s", () =>
    Effect.gen(function* () {
      const { sql, library } = yield* setup
      yield* library.store("s", feed(episode({})))
      yield* library.store(
        "s",
        feed(episode({ duration: 2480, audioUrl: "https://cdn2.test/a.mp3" }))
      )
      let [row] = yield* episodes(sql)
      assert.strictEqual(row?.audio_url, "https://cdn2.test/a.mp3")
      assert.isNull(row?.audio_updated_at)
      yield* library.store("s", feed(episode({ duration: 2600 })))
      ;[row] = yield* episodes(sql)
      assert.isNotNull(row?.audio_updated_at)
    }).pipe(Effect.provide(services))
  )

  it.effect("merges an Episode whose guid changed into the existing one", () =>
    Effect.gen(function* () {
      const { sql, library } = yield* setup
      yield* library.store("s", feed(episode({})))
      const [before] = yield* episodes(sql)
      const result = yield* library.store("s", feed(episode({ guid: "g1-renumbered" })))
      assert.deepStrictEqual(result, { added: 0, changed: 1 })
      const after = yield* episodes(sql)
      assert.strictEqual(after.length, 1)
      assert.strictEqual(after[0]?.id, before?.id)
      assert.strictEqual(after[0]?.guid, "g1-renumbered")
      // The next refresh finds it by its new guid and changes nothing.
      assert.deepStrictEqual(yield* library.store("s", feed(episode({ guid: "g1-renumbered" }))), {
        added: 0,
        changed: 0
      })
    }).pipe(Effect.provide(services))
  )

  it.effect("keeps ambiguous matches as separate Episodes", () =>
    Effect.gen(function* () {
      const { sql, library } = yield* setup
      yield* library.store(
        "s",
        feed(
          episode({ guid: "a", audioUrl: "https://cdn.test/shared.mp3" }),
          episode({ guid: "b", audioUrl: "https://cdn.test/shared.mp3", title: "Other" })
        )
      )
      yield* library.store(
        "s",
        feed(episode({ guid: "c", audioUrl: "https://cdn.test/shared.mp3" }))
      )
      assert.strictEqual((yield* episodes(sql)).length, 3)
    }).pipe(Effect.provide(services))
  )
})
