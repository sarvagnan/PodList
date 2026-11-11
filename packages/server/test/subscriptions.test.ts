import { readFileSync } from "node:fs"
import { assert, describe, it } from "@effect/vitest"
import { Subscriptions as Api, PodListApi } from "@podlist/api"
import { Operation } from "@podlist/domain"
import { Effect, Exit, Layer, Schema } from "effect"
import { HttpClient, HttpClientResponse, HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { SqlClient } from "effect/sql"
import { Catalogue } from "../src/Catalogue.ts"
import * as Database from "../src/Database.ts"
import { SubscriptionsHandlers } from "../src/Http.ts"
import { Library } from "../src/Library.ts"
import { Poller } from "../src/Poller.ts"
import { feedUrlsFromOpml, Subscriptions } from "../src/Subscriptions.ts"
import { SyncStore } from "../src/SyncStore.ts"

const xml = readFileSync(new URL("fixtures/night-shift.xml", import.meta.url), "utf8")
const network = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        request.url.includes("broken")
          ? new Response("<html/>", { status: 200 })
          : new Response(xml, { status: 200 })
      )
    )
  )
)
const services = Layer.mergeAll(
  Subscriptions.layer,
  SyncStore.layer,
  Catalogue.layer,
  Poller.layer
).pipe(
  Layer.provideMerge(Library.layer),
  Layer.provide(network),
  Layer.provideMerge(Database.layer(":memory:"))
)
const count = (sql: SqlClient.SqlClient, query: string) =>
  sql.unsafe<{ n: number }>(query).pipe(Effect.map((rows) => rows[0]?.n ?? 0))

describe("Subscriptions", () => {
  it.effect("reads a Podcast without changing the Library and rejects unsafe addresses", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const sql = yield* SqlClient.SqlClient
      const feed = yield* subs.readPodcast("https://example.test/night.xml")
      assert.strictEqual(feed.title, "Night Shift Histories")
      assert.strictEqual(feed.episodes.length, 2)
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM subscription"), 0)
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM episode"), 0)
      for (const url of [
        "file:///etc/passwd",
        "https://person:secret@example.test/feed",
        "not an address"
      ]) {
        assert.include(
          (yield* subs.readPodcast(url).pipe(Effect.flip)).message,
          "Invalid feed address"
        )
        yield* subs.subscribe(url).pipe(Effect.flip)
      }
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM subscription"), 0)
    }).pipe(Effect.provide(services))
  )

  it.effect(
    "brings in only one Episode idempotently, syncs it, skips polling and later reveals the same identity",
    () =>
      Effect.gen(function* () {
        const subs = yield* Subscriptions
        const sql = yield* SqlClient.SqlClient
        const catalogue = yield* Catalogue
        const poller = yield* Poller
        const feedUrl = "https://example.test/night.xml"
        const first = yield* subs.bringEpisode(feedUrl, "ns-0212")
        const again = yield* subs.bringEpisode(feedUrl, "ns-0212")
        assert.deepStrictEqual(first, again)
        assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM episode"), 1)
        assert.isNotNull((yield* subs.list)[0]?.unsubscribedAt)
        const page = yield* catalogue.changes(0)
        assert.strictEqual(page.episodes[0]?.id, first.episodeId)
        assert.strictEqual(page.subscriptions[0]?.id, first.subscriptionId)
        assert.strictEqual((yield* poller.refreshAll({ respectBackoff: false })).checked, 0)
        const subscribed = yield* subs.subscribe(feedUrl)
        assert.strictEqual(subscribed.id, first.subscriptionId)
        assert.isNull(subscribed.unsubscribedAt)
        assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM episode"), 2)
        const [episode] = yield* sql<{
          id: string
        }>`SELECT id FROM episode WHERE guid = ${"ns-0212"}`
        assert.strictEqual(episode?.id, first.episodeId)
        assert.deepStrictEqual(yield* subs.bringEpisode(feedUrl, "ns-0212"), first)
        assert.isNull((yield* subs.list)[0]?.unsubscribedAt)
      }).pipe(Effect.provide(services))
  )

  it.effect("a missing Episode or failed feed leaves no partial imported rows", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const sql = yield* SqlClient.SqlClient
      yield* subs.bringEpisode("https://example.test/night.xml", "missing").pipe(Effect.flip)
      yield* subs.bringEpisode("https://example.test/broken.xml", "anything").pipe(Effect.flip)
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM subscription"), 0)
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM episode"), 0)
    }).pipe(Effect.provide(services))
  )

  it.effect(
    "serves Podcast page endpoints and ordinary FeedFailed errors over the typed HTTP API",
    () =>
      Effect.gen(function* () {
        const client = yield* HttpApiTest.groups(PodListApi, ["subscriptions"])
        const feedUrl = "https://example.test/night.xml"
        const feed = yield* client.subscriptions.readPodcast({
          payload: new Api.SubscribeRequest({ feedUrl })
        })
        assert.strictEqual(feed.author, "Night Shift Media")
        assert.strictEqual(feed.artworkUrl, "https://example.test/podcast.jpg")
        assert.include(feed.episodes[0]?.description ?? "", "1977")
        assert.strictEqual((yield* client.subscriptions.list()).length, 0)
        const first = yield* client.subscriptions.bringEpisode({
          payload: new Api.BringEpisodeRequest({ feedUrl, guid: "ns-0212" })
        })
        assert.deepStrictEqual(
          yield* client.subscriptions.bringEpisode({
            payload: new Api.BringEpisodeRequest({ feedUrl, guid: "ns-0212" })
          }),
          first
        )
        const error = yield* client.subscriptions
          .bringEpisode({ payload: new Api.BringEpisodeRequest({ feedUrl, guid: "missing" }) })
          .pipe(Effect.flip)
        assert.strictEqual(error._tag, "FeedFailed")
        assert.isNotNull((yield* client.subscriptions.list())[0]?.unsubscribedAt)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(SubscriptionsHandlers, HttpServer.layerServices).pipe(
            Layer.provideMerge(services)
          )
        )
      )
  )

  it.effect("an insertion failure rolls back both imported identities and catalogue changes", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const subs = yield* Subscriptions
      yield* sql.unsafe(
        "CREATE TRIGGER reject_episode BEFORE INSERT ON episode BEGIN SELECT RAISE(ABORT, 'test failure'); END"
      )
      assert.isTrue(
        Exit.isFailure(
          yield* subs.bringEpisode("https://example.test/night.xml", "ns-0212").pipe(Effect.exit)
        )
      )
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM subscription"), 0)
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM episode"), 0)
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM catalogue_change"), 0)
    }).pipe(Effect.provide(services))
  )

  it.effect(
    "uses the generic publisher User-Agent and reuses stored identity without re-fetching",
    () => {
      let requests = 0
      const once = Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make((request) => {
          assert.strictEqual(request.headers["user-agent"], "PodList")
          requests++
          return requests === 1
            ? Effect.succeed(HttpClientResponse.fromWeb(request, new Response(xml)))
            : Effect.die("Publisher is now unavailable")
        })
      )
      return Effect.gen(function* () {
        const subs = yield* Subscriptions
        const first = yield* subs.bringEpisode("https://example.test/night.xml", "ns-0212")
        assert.deepStrictEqual(
          yield* subs.bringEpisode("https://example.test/night.xml", "ns-0212"),
          first
        )
        assert.strictEqual(requests, 1)
      }).pipe(
        Effect.provide(
          Subscriptions.layer.pipe(
            Layer.provide(Library.layer),
            Layer.provide(once),
            Layer.provide(Database.layer(":memory:"))
          )
        )
      )
    }
  )

  it.effect("subscribes by URL, storing the Back Catalogue unplayed", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const sql = yield* SqlClient.SqlClient
      const sub = yield* subs.subscribe("https://example.test/night.xml")
      assert.strictEqual(sub.title, "Night Shift Histories")
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM episode"), 2)
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM episode_state"), 0)
    }).pipe(Effect.provide(services))
  )

  it.effect("keeps nothing when the feed cannot be read", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const sql = yield* SqlClient.SqlClient
      const error = yield* subs.subscribe("https://example.test/broken.xml").pipe(Effect.flip)
      assert.include(error.message, "Not an RSS feed")
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM subscription"), 0)
    }).pipe(Effect.provide(services))
  )

  it.effect("unsubscribing keeps the Episodes; subscribing again restores the podcast", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const sql = yield* SqlClient.SqlClient
      const sub = yield* subs.subscribe("https://example.test/night.xml")
      const gone = yield* subs.unsubscribe(sub.id)
      assert.isNotNull(gone.unsubscribedAt)
      assert.strictEqual(yield* count(sql, "SELECT count(*) AS n FROM episode"), 2)
      const back = yield* subs.subscribe("https://example.test/night.xml")
      assert.strictEqual(back.id, sub.id)
      assert.isNull(back.unsubscribedAt)
    }).pipe(Effect.provide(services))
  )

  it.effect(
    "Unsubscribe and re-subscribe retain ids, settings and every Device’s listening state",
    () =>
      Effect.gen(function* () {
        const subs = yield* Subscriptions
        const sql = yield* SqlClient.SqlClient
        const store = yield* SyncStore
        const sub = yield* subs.subscribe("https://example.test/night.xml")
        const episodes = yield* sql<{ id: string }>`SELECT id FROM episode ORDER BY id`
        const first = episodes[0]?.id
        const second = episodes[1]?.id
        const changes = [
          {
            _tag: "SetSubscriptionOverrides",
            subscriptionId: sub.id,
            playedThreshold: 60,
            playbackSettings: { speed: 1.5, skipIntro: 30, volumeBoost: true }
          },
          ...["phone", "desktop"].map((deviceId) => ({
            _tag: "SetDownloadRule",
            rule: { subscriptionId: sub.id, deviceId, mode: "allNew", keepAtMost: 5 }
          })),
          { _tag: "AddEntry", playlistId: "default", episodeId: first, placement: "last" },
          { _tag: "SetCursor", playlistId: "default", episodeId: first },
          {
            _tag: "ReportPosition",
            playlistId: "default",
            episodeId: first,
            position: 123,
            listenedAt: 5
          },
          { _tag: "SetStar", episodeId: first, starred: true },
          { _tag: "MarkPlayed", episodeId: second, source: { _tag: "User" } }
        ]
        yield* store.push(
          changes.map((change, i) =>
            Schema.decodeUnknownSync(Operation.Operation)({
              id: `retained-${i}`,
              deviceId: "phone",
              sequence: i + 1,
              recordedAt: 5,
              change
            })
          )
        )
        const before = yield* store.pull(0)
        const settings = (yield* subs.list)[0]
        yield* subs.unsubscribe(sub.id)
        assert.deepStrictEqual((yield* store.pull(0)).snapshot, before.snapshot)
        const restored = yield* subs.subscribe(sub.feedUrl)
        assert.deepStrictEqual(restored, settings)
        assert.deepStrictEqual(yield* sql`SELECT id FROM episode ORDER BY id`, episodes)
        assert.deepStrictEqual((yield* store.pull(0)).snapshot, before.snapshot)
      }).pipe(Effect.provide(services))
  )

  it.effect("imports OPML, reporting duplicates and failures, and exports it back", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      yield* subs.subscribe("https://example.test/a.xml")
      const opml = `<?xml version="1.0"?><opml version="2.0"><body>
        <outline text="Group">
          <outline type="rss" text="A" xmlUrl="https://example.test/a.xml"/>
          <outline type="rss" text="B" xmlUrl="https://example.test/b.xml"/>
        </outline>
        <outline type="rss" text="Broken" xmlUrl="https://example.test/broken.xml"/>
      </body></opml>`
      const summary = yield* subs.importOpml(opml)
      assert.strictEqual(summary.added, 1)
      assert.strictEqual(summary.alreadySubscribed, 1)
      assert.deepStrictEqual(
        summary.failed.map((f) => f.feedUrl),
        ["https://example.test/broken.xml"]
      )
      const exported = yield* subs.exportOpml
      assert.sameMembers(
        [...feedUrlsFromOpml(exported)],
        ["https://example.test/a.xml", "https://example.test/b.xml"]
      )
    }).pipe(Effect.provide(services))
  )
})

describe("server-side operations", () => {
  const op = (id: string, change: unknown) =>
    Schema.decodeUnknownSync(Operation.Operation)({
      id,
      deviceId: "phone",
      sequence: 1,
      recordedAt: 5,
      change
    })

  it.effect("Mark all Played becomes one Played per Episode, recorded for every Device", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const store = yield* SyncStore
      const sub = yield* subs.subscribe("https://example.test/night.xml")
      const result = yield* store.push([
        op("m1", { _tag: "MarkSubscriptionPlayed", subscriptionId: sub.id })
      ])
      assert.strictEqual(result.cursor, 3)
      const pulled = yield* store.pull(0)
      assert.strictEqual(Object.keys(pulled.snapshot?.episodeStates ?? {}).length, 2)
      const delta = yield* store.pull(1)
      assert.deepStrictEqual(
        delta.operations.map((o) => o.change._tag),
        ["MarkPlayed", "MarkPlayed"]
      )
    }).pipe(Effect.provide(services))
  )

  it.effect("Subscription overrides update the catalogue record", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const store = yield* SyncStore
      const sub = yield* subs.subscribe("https://example.test/night.xml")
      yield* store.push([
        op("o1", {
          _tag: "SetSubscriptionOverrides",
          subscriptionId: sub.id,
          playbackSettings: { speed: 1.5 },
          playedThreshold: 45
        })
      ])
      const [updated] = (yield* subs.list).filter((s) => s.id === sub.id)
      assert.strictEqual(updated?.playbackSettings.speed, 1.5)
      assert.strictEqual(updated?.playedThreshold, 45)
    }).pipe(Effect.provide(services))
  )
})
