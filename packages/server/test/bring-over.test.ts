import { assert, describe, it } from "@effect/vitest"
import { Subscriptions as Api, PodListApi } from "@podlist/api"
import { Library as Domain, Operation, Units, ViewQuery } from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import { HttpClient, HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { SqlClient } from "effect/sql"
import { Catalogue } from "../src/Catalogue.ts"
import * as Database from "../src/Database.ts"
import { SubscriptionsHandlers } from "../src/Http.ts"
import { episodeId, Library } from "../src/Library.ts"
import { Poller } from "../src/Poller.ts"
import { Subscriptions } from "../src/Subscriptions.ts"
import { SyncStore } from "../src/SyncStore.ts"

const subscription = {
  feedUrl: "https://test/extinct",
  title: "Café Podcast",
  author: "Author",
  description: "About",
  artwork: { url: "https://test/art" },
  subscribedAt: 10,
  unsubscribedAt: 20,
  playedThreshold: 15,
  playbackSettings: { speed: 1.5 }
}
const episode = {
  feedUrl: subscription.feedUrl,
  guid: "retired",
  title: "Épisode",
  description: "Résumé",
  published: 11,
  duration: 300,
  audioUrl: "https://test/audio",
  artwork: null,
  chapters: [{ start: 0, title: "Start", artwork: null, url: null }],
  audioUpdatedAt: 12
}
const request = (s: unknown = subscription, episodes: ReadonlyArray<unknown> = [episode]) =>
  Schema.decodeUnknownSync(Api.BringOverRequest)({ subscriptions: [s], episodes })
const network = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make(() => Effect.die("metadata import must not fetch a publisher feed"))
)
const services = Layer.mergeAll(
  Subscriptions.layer,
  Catalogue.layer,
  Poller.layer,
  SyncStore.layer
).pipe(
  Layer.provideMerge(Library.layer),
  Layer.provide(network),
  Layer.provideMerge(Database.layer(":memory:"))
)

describe("bring-over metadata", () => {
  it.effect(
    "imports full metadata without a feed, exposing server ids through paged Catalogue changes",
    () =>
      Effect.gen(function* () {
        const subs = yield* Subscriptions
        const catalogue = yield* Catalogue
        const sql = yield* SqlClient.SqlClient
        yield* subs.bringOver(request())
        const first = yield* catalogue.changes(0, 1)
        assert.isTrue(first.more)
        const second = yield* catalogue.changes(first.cursor, 1)
        assert.isFalse(second.more)
        const s = first.subscriptions[0]
        const e = second.episodes[0]
        assert.isDefined(s)
        assert.isDefined(e)
        assert.deepStrictEqual(
          { ...Schema.encodeSync(Domain.Subscription)(s), id: undefined },
          { ...subscription, id: undefined }
        )
        const { feedUrl: _feed, ...metadata } = episode
        assert.deepStrictEqual(
          { ...Schema.encodeSync(Domain.Episode)(e), id: undefined, subscriptionId: undefined },
          {
            ...metadata,
            id: undefined,
            subscriptionId: undefined
          }
        )
        assert.strictEqual(e.subscriptionId, s.id)
        assert.match(s.id, /^sub_/)
        assert.match(e.id, /^ep_/)
        assert.deepStrictEqual(yield* sql`SELECT title_folded, description_folded FROM episode`, [
          { title_folded: "episode", description_folded: "resume" }
        ])
        assert.deepStrictEqual(yield* sql`SELECT title_folded FROM subscription`, [
          { title_folded: "cafe podcast" }
        ])
        assert.deepStrictEqual(yield* sql`SELECT * FROM feed_state`, [])
      }).pipe(Effect.provide(services))
  )

  it.effect(
    "retries, duplicate identities and conflicting metadata never update existing rows or change ids",
    () =>
      Effect.gen(function* () {
        const subs = yield* Subscriptions
        const catalogue = yield* Catalogue
        const sql = yield* SqlClient.SqlClient
        const original = request()
        yield* subs.bringOver(original)
        const before = yield* catalogue.changes(0)
        const rows = yield* sql`SELECT * FROM episode`
        const conflict = request({ ...subscription, title: "Overwrite", unsubscribedAt: null }, [
          { ...episode, title: "Overwrite", audioUrl: "changed" }
        ])
        yield* Effect.all([subs.bringOver(conflict), subs.bringOver(original)], { concurrency: 2 })
        yield* subs.bringOver(
          new Api.BringOverRequest({
            subscriptions: [...conflict.subscriptions, ...original.subscriptions],
            episodes: [...conflict.episodes, ...original.episodes]
          })
        )
        assert.deepStrictEqual(yield* catalogue.changes(0), before)
        assert.deepStrictEqual(yield* sql`SELECT * FROM episode`, rows)
        assert.deepStrictEqual(yield* catalogue.changes(before.cursor), {
          cursor: before.cursor,
          subscriptions: [],
          episodes: [],
          more: false
        })
        // An active server Subscription also wins over the phone's removed metadata.
        yield* sql`UPDATE subscription SET unsubscribed_at = NULL`
        const active = yield* subs.list
        yield* subs.bringOver(original)
        assert.deepStrictEqual(yield* subs.list, active)
      }).pipe(Effect.provide(services))
  )

  it.effect(
    "removed imports are not polled, exported as active, or visible without an Entry or Star",
    () =>
      Effect.gen(function* () {
        const subs = yield* Subscriptions
        const catalogue = yield* Catalogue
        const poller = yield* Poller
        const sql = yield* SqlClient.SqlClient
        const store = yield* SyncStore
        yield* subs.bringOver(
          request(subscription, [
            episode,
            { ...episode, guid: "entry" },
            { ...episode, guid: "star" }
          ])
        )
        assert.deepStrictEqual(yield* poller.refreshAll({ respectBackoff: false }), {
          checked: 0,
          updated: 0,
          notModified: 0,
          failed: 0
        })
        assert.notInclude(yield* subs.exportOpml, subscription.feedUrl)
        const rows = yield* catalogue.changes(0)
        const s = rows.subscriptions[0]
        const entry = rows.episodes.find((e) => e.guid === "entry")?.id
        const star = rows.episodes.find((e) => e.guid === "star")?.id
        assert.isDefined(s)
        assert.isDefined(entry)
        assert.isDefined(star)
        const view = ViewQuery.compile(
          { filter: {}, sort: "publishedDesc", limit: null },
          Units.EpochMillis.make(30)
        )
        assert.deepStrictEqual(yield* sql.unsafe(view.sql, view.params), [])
        const changes = [
          { _tag: "AddEntry", playlistId: "default", episodeId: entry, placement: "last" },
          { _tag: "SetStar", episodeId: star, starred: true },
          {
            _tag: "RecordListening",
            amounts: [{ day: "2026-11-09", subscriptionId: s.id, seconds: 60 }]
          }
        ]
        yield* store.push(
          changes.map((change, i) =>
            Schema.decodeUnknownSync(Operation.Operation)({
              id: `move-${i}`,
              deviceId: "phone",
              sequence: i,
              recordedAt: 30,
              change
            })
          )
        )
        const visible = yield* sql.unsafe<{ id: string }>(view.sql, view.params)
        assert.sameMembers(
          visible.map((r) => r.id),
          [entry, star]
        )
        assert.strictEqual(
          (yield* store.pull(0)).snapshot?.listeningLog?.["2026-11-09"]?.[s.id],
          60
        )
        assert.strictEqual((yield* subs.list)[0]?.unsubscribedAt, 20)
        yield* store.push(
          [
            { _tag: "RemoveEntry", playlistId: "default", episodeId: entry },
            { _tag: "SetStar", episodeId: star, starred: false }
          ].map((change, i) =>
            Schema.decodeUnknownSync(Operation.Operation)({
              id: `remove-${i}`,
              deviceId: "phone",
              sequence: i + 3,
              recordedAt: 31,
              change
            })
          )
        )
        assert.deepStrictEqual(yield* sql.unsafe(view.sql, view.params), [])
      }).pipe(Effect.provide(services))
  )

  it.effect("rolls back the whole request when an Episode's Subscription is unknown", () =>
    Effect.gen(function* () {
      const subs = yield* Subscriptions
      const catalogue = yield* Catalogue
      const result = yield* subs
        .bringOver(
          request(subscription, [episode, { ...episode, feedUrl: "https://test/missing" }])
        )
        .pipe(Effect.flip)
      assert.strictEqual(result.feedUrl, "https://test/missing")
      assert.deepStrictEqual((yield* catalogue.changes(0)).subscriptions, [])
      assert.deepStrictEqual((yield* catalogue.changes(0)).episodes, [])
      yield* subs.bringOver(request())
      assert.strictEqual((yield* catalogue.changes(0)).episodes.length, 1)
    }).pipe(Effect.provide(services))
  )

  it.effect(
    "matches existing nonstandard ids and keeps separate feeds and previously changed guids separate",
    () =>
      Effect.gen(function* () {
        const subs = yield* Subscriptions
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO subscription (id, feed_url, title, subscribed_at) VALUES ('existing', ${subscription.feedUrl}, 'Server', 1)`
        // A normal refresh can change guid while retaining the id hashed from the old guid.
        yield* sql`INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url)
        VALUES (${episodeId("existing", episode.guid)}, 'existing', 'new-guid', 'Server', '', 1, 'server-audio')`
        yield* subs.bringOver(request())
        yield* subs.bringOver(
          request({ ...subscription, feedUrl: "https://test/other" }, [
            { ...episode, feedUrl: "https://test/other" }
          ])
        )
        const rows = yield* sql`SELECT * FROM episode`
        assert.strictEqual(rows.length, 3)
        assert.strictEqual((yield* subs.list).find((s) => s.id === "existing")?.title, "Server")
        yield* subs.bringOver(
          new Api.BringOverRequest({ subscriptions: [], episodes: request().episodes })
        )
        assert.deepStrictEqual(yield* sql`SELECT * FROM episode`, rows)
      }).pipe(Effect.provide(services))
  )

  it.effect("serves the typed API endpoint and its missing-parent error", () =>
    Effect.gen(function* () {
      const client = yield* HttpApiTest.groups(PodListApi, ["subscriptions"])
      yield* client.subscriptions.bringOver({ payload: request() })
      yield* client.subscriptions.bringOver({ payload: request() })
      const missing = yield* client.subscriptions
        .bringOver({
          payload: request(subscription, [{ ...episode, feedUrl: "https://test/unknown" }])
        })
        .pipe(Effect.flip)
      assert.strictEqual(missing._tag, "MissingSubscription")
      assert.strictEqual((yield* client.subscriptions.list()).length, 1)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(SubscriptionsHandlers, HttpServer.layerServices).pipe(
          Layer.provideMerge(services)
        )
      )
    )
  )
})
