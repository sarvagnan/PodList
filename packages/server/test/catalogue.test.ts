import { readFileSync } from "node:fs"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { Catalogue } from "../src/Catalogue.ts"
import * as Database from "../src/Database.ts"
import { parseFeed } from "../src/FeedParser.ts"
import { Library } from "../src/Library.ts"
import { Subscriptions } from "../src/Subscriptions.ts"

const xml = readFileSync(new URL("fixtures/night-shift.xml", import.meta.url), "utf8")
const network = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request) =>
    Effect.succeed(HttpClientResponse.fromWeb(request, new Response(xml)))
  )
)
const services = Layer.mergeAll(Subscriptions.layer, Catalogue.layer).pipe(
  Layer.provideMerge(Library.layer),
  Layer.provide(network),
  Layer.provideMerge(Database.layer(":memory:"))
)

describe("catalogue changes", () => {
  it.effect("returns new Subscriptions and Episodes, then nothing until something changes", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const catalogue = yield* Catalogue
      const library = yield* Library
      const sub = yield* subs.subscribe("https://example.test/night.xml")

      const first = yield* catalogue.changes(0)
      assert.deepStrictEqual(
        first.subscriptions.map((s) => s.id),
        [sub.id]
      )
      assert.strictEqual(first.episodes.length, 2)
      assert.isFalse(first.more)
      assert.strictEqual(first.episodes[0]?.title.length !== 0, true)

      // An unchanged feed refresh produces no catalogue changes.
      yield* library.refresh(sub.id)
      const quiet = yield* catalogue.changes(first.cursor)
      assert.deepStrictEqual([quiet.subscriptions.length, quiet.episodes.length], [0, 0])

      // Unsubscribing changes the Subscription row, which clients must learn about.
      yield* subs.unsubscribe(sub.id)
      const after = yield* catalogue.changes(first.cursor)
      assert.isNotNull(after.subscriptions[0]?.unsubscribedAt)
    }).pipe(Effect.provide(services))
  )

  it.effect("pages through large catalogues", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const catalogue = yield* Catalogue
      yield* subs.subscribe("https://example.test/night.xml")
      const pageOne = yield* catalogue.changes(0, 2)
      assert.isTrue(pageOne.more)
      const pageTwo = yield* catalogue.changes(pageOne.cursor, 2)
      assert.isFalse(pageTwo.more)
      assert.strictEqual(
        pageOne.subscriptions.length +
          pageOne.episodes.length +
          pageTwo.subscriptions.length +
          pageTwo.episodes.length,
        3
      )
    }).pipe(Effect.provide(services))
  )

  it.effect(
    "publishes link-only changes and clears removed links without changing Episode identity",
    () =>
      Effect.gen(function* () {
        const subs = yield* Subscriptions
        const catalogue = yield* Catalogue
        const library = yield* Library
        const sub = yield* subs.subscribe("https://example.test/night.xml")
        const first = yield* catalogue.changes(0)
        const feed = parseFeed(xml)
        const [episode] = feed.episodes
        assert.isDefined(episode)
        assert.strictEqual(first.subscriptions[0]?.websiteUrl, feed.link)
        assert.strictEqual(
          first.episodes.find((e) => e.guid === episode.guid)?.websiteUrl,
          episode.link
        )

        const revised = {
          ...feed,
          link: "https://example.test/new-site",
          episodes: [{ ...episode, link: null }]
        }
        assert.deepStrictEqual(yield* library.store(sub.id, revised), { added: 0, changed: 1 })
        const next = yield* catalogue.changes(first.cursor)
        assert.deepStrictEqual(
          next.subscriptions.map((row) => row.websiteUrl),
          [revised.link]
        )
        assert.deepStrictEqual(
          next.episodes.map((row) => [row.guid, row.websiteUrl, row.audioUpdatedAt]),
          [[episode.guid, null, null]]
        )
        assert.strictEqual(
          next.episodes[0]?.id,
          first.episodes.find((e) => e.guid === episode.guid)?.id
        )
      }).pipe(Effect.provide(services))
  )
})
