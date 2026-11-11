import { describe, expect, it } from "@effect/vitest"
import { PodListApi, Reads } from "@podlist/api"
import {
  Library,
  Mentions,
  Operation,
  Sql,
  State,
  StateStore,
  Units,
  View,
  ViewQuery
} from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import { HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { SqlClient } from "effect/sql"
import { buildViewVectors } from "../../domain/scripts/view-vectors.ts"
import { insertRows, migratedDatabase } from "../../domain/test/support/sqlite.ts"
import * as Database from "../src/Database.ts"
import { ReadHandlers } from "../src/Http.ts"
import { make, ReadTime } from "../src/Reads.ts"
import { SyncStore } from "../src/SyncStore.ts"

const vectors = buildViewVectors()
const api = HttpApiTest.groups(PodListApi, ["reads"])
const services = Layer.mergeAll(ReadHandlers, HttpServer.layerServices, SyncStore.layer).pipe(
  Layer.provideMerge(Database.layer(":memory:"))
)
const seed = (
  episodes = vectors.episodes,
  state = Schema.decodeUnknownSync(State.State)(vectors.state)
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    for (const s of vectors.subscriptions)
      yield* sql`INSERT INTO subscription ${sql.insert({
        id: s.id,
        feed_url: s.feedUrl,
        title: s.title,
        title_folded: Mentions.fold(s.title),
        subscribed_at: s.subscribedAt,
        unsubscribed_at: s.unsubscribedAt,
        artwork_url: s.artwork?.url ?? null,
        played_threshold: s.playedThreshold,
        playback_settings: JSON.stringify(s.playbackSettings)
      })}`
    for (const e of episodes)
      yield* sql`INSERT INTO episode ${sql.insert({
        id: e.id,
        subscription_id: e.subscriptionId,
        guid: e.guid,
        title: e.title,
        title_folded: Mentions.fold(e.title),
        description: e.description,
        description_folded: Mentions.fold(e.description),
        published: e.published,
        duration: e.duration,
        audio_url: e.audioUrl,
        artwork_url: e.artwork?.url ?? null,
        chapters: JSON.stringify(e.chapters)
      })}`
    yield* StateStore.save(null, state)
  })

// Exercise HTTP codecs, the server database and the local SQLite implementation on every shared vector.
describe("online View parity", () => {
  for (const vector of vectors.cases)
    it.effect(vector.name, () =>
      Effect.gen(function* () {
        const view = Schema.decodeUnknownSync(View.View)(vector.view)
        const state = new State.State({
          ...Schema.decodeUnknownSync(State.State)(vectors.state),
          views: [view]
        })
        const episodes = vector.episodes
          ? vector.episodes.map((e) => Schema.decodeUnknownSync(Library.Episode)(e))
          : vectors.episodes
        yield* seed(episodes, state)
        const client = yield* api
        const local = migratedDatabase()
        try {
          insertRows(
            local,
            "subscription",
            vectors.subscriptions.map((s) => ({
              id: s.id,
              feed_url: s.feedUrl,
              title: s.title,
              subscribed_at: s.subscribedAt,
              unsubscribed_at: s.unsubscribedAt
            }))
          )
          insertRows(
            local,
            "episode",
            episodes.map((e) => ({
              id: e.id,
              subscription_id: e.subscriptionId,
              guid: e.guid,
              title: e.title,
              description: e.description,
              published: e.published,
              duration: e.duration,
              audio_url: e.audioUrl
            }))
          )
          const rows = Sql.stateToRows(state)
          insertRows(local, "episode_state", rows.episode_state)
          insertRows(local, "entry_index", rows.entry_index)
          const compiled = ViewQuery.compile(
            view,
            Units.EpochMillis.make(vector.now ?? vectors.now)
          )
          const expected = local
            .prepare(compiled.sql)
            .all(...compiled.params)
            .map((r) => r.id)
          expect(expected).toEqual(vector.expected)
          const localItems = local
            .prepare(compiled.sql)
            .all(...compiled.params)
            .map((r) => ({
              id: r.id,
              title: r.title,
              podcast: r.podcast,
              published: r.published,
              duration: r.duration,
              artworkUrl: r.artwork_url ?? r.podcast_artwork_url,
              played: r.played_at !== null,
              starred: r.starred === 1
            }))
          const collect = (saved: boolean) =>
            Effect.gen(function* () {
              const items: Reads.ViewEpisode[] = []
              let continuation: string | undefined
              do {
                const paging = { pageSize: 2, ...(continuation ? { continuation } : {}) }
                const page = saved
                  ? yield* client.reads.view({ params: { id: view.id }, query: paging })
                  : yield* client.reads.filter({
                      payload: new Reads.FilterRequest({
                        filter: view.filter,
                        sort: view.sort,
                        limit: view.limit,
                        ...paging
                      })
                    })
                expect(page.total).toBe(expected.length)
                items.push(...page.items)
                continuation = page.continuation ?? undefined
              } while (continuation)
              return items.map((item) => ({ ...item }))
            })
          expect(yield* collect(true)).toEqual(localItems)
          expect(yield* collect(false)).toEqual(localItems)
          expect((yield* client.reads.counts()).counts).toEqual([
            { id: "v", count: expected.length }
          ])
        } finally {
          local.close()
        }
      }).pipe(
        Effect.provide(
          services.pipe(Layer.provide(Layer.succeed(ReadTime, () => vector.now ?? vectors.now)))
        )
      )
    )
})

it.effect(
  "continuations bind query and size, reject tampering and restart on changed State or Library",
  () =>
    Effect.gen(function* () {
      yield* seed()
      const reads = yield* make
      const input = new Reads.FilterRequest({
        filter: {},
        sort: "publishedDesc",
        limit: 3,
        pageSize: 1
      })
      const first = yield* reads.filter(input)
      const continuation = first.continuation as string
      expect(first.total).toBe(3)
      expect(
        (yield* Effect.flip(
          reads.filter(new Reads.FilterRequest({ ...input, pageSize: 2, continuation }))
        ))._tag
      ).toBe("InvalidContinuation")
      expect(
        (yield* Effect.flip(
          reads.filter(
            new Reads.FilterRequest({ ...input, filter: { starred: true }, continuation })
          )
        ))._tag
      ).toBe("InvalidContinuation")
      expect(
        (yield* Effect.flip(
          reads.filter(new Reads.FilterRequest({ ...input, continuation: `${continuation}x` }))
        ))._tag
      ).toBe("InvalidContinuation")
      const second = yield* reads.filter(new Reads.FilterRequest({ ...input, continuation }))
      expect(second.items[0]?.id).not.toBe(first.items[0]?.id)
      const third = yield* reads.filter(
        new Reads.FilterRequest({ ...input, continuation: second.continuation as string })
      )
      expect(third.continuation).toBeNull()
      const sql = yield* SqlClient.SqlClient
      yield* sql`UPDATE episode SET title = 'changed' WHERE id = 'a'`
      expect(
        (yield* Effect.flip(reads.filter(new Reads.FilterRequest({ ...input, continuation }))))._tag
      ).toBe("ReadChanged")
      const fresh = yield* reads.filter(input)
      const store = yield* SyncStore
      yield* store.push([
        Schema.decodeUnknownSync(Operation.Operation)({
          id: "edit",
          deviceId: "web",
          sequence: 1,
          recordedAt: 1,
          change: { _tag: "SetStar", episodeId: "a", starred: false }
        })
      ])
      expect(
        (yield* Effect.flip(
          reads.filter(
            new Reads.FilterRequest({ ...input, continuation: fresh.continuation as string })
          )
        ))._tag
      ).toBe("ReadChanged")
    }).pipe(
      Effect.provide(services),
      Effect.provideService(ReadTime, () => vectors.now)
    )
)

it.effect(
  "reads retained and removed metadata, playback overrides, counts and bounded Listening metadata",
  () =>
    Effect.gen(function* () {
      yield* seed()
      const sql = yield* SqlClient.SqlClient
      yield* sql`UPDATE subscription SET artwork_url = 'show.jpg', playback_settings = '{"speed":1.5}', played_threshold = 10 WHERE id = 'gone'`
      const client = yield* api
      const episode = yield* client.reads.episode({ params: { id: "e" } })
      expect(episode.artworkUrl).toBe("show.jpg")
      expect(episode.audioUrl).toBe("https://example.test/e.mp3")
      expect(episode.override).toEqual({ speed: 1.5 })
      expect(episode.threshold).toBe(10)
      expect(episode.chapters).toEqual([])
      const summaries = yield* client.reads.summaries({
        payload: new Reads.SummaryRequest({ ids: ["e", "missing"] })
      })
      expect(summaries.map((e) => e.id)).toEqual(["e"])
      const removed = yield* client.reads.subscription({ params: { id: "gone" } })
      expect(removed.subscribed).toBe(false)
      expect(removed.episodes).toBe(3)
      expect(removed.customSettings).toBe(2)
      const active = yield* client.reads.subscriptions({ query: { pageSize: 1 } })
      expect(active.total).toBe(2)
      expect(active.items).toHaveLength(1)
      expect(active.continuation).not.toBeNull()
      const podcasts = yield* client.reads.stats({ params: { kind: "podcasts" }, query: {} })
      expect(podcasts.items.some((s) => s.id === "gone")).toBe(true)
      const episodes = yield* client.reads.stats({
        params: { kind: "episodes" },
        query: { pageSize: 2 }
      })
      expect(episodes.total).toBe(8)
      expect(episodes.items).toHaveLength(2)
      const search = yield* client.reads.search({
        payload: new Reads.SearchRequest({ q: "CAFÉ", pageSize: 2 })
      })
      expect(search.total).toBe(4)
      expect(search.items.map((e) => e.id)).toEqual(["h", "a"])
      expect((yield* Effect.flip(client.reads.episode({ params: { id: "missing" } })))._tag).toBe(
        "ReadNotFound"
      )
    }).pipe(
      Effect.provide(services),
      Effect.provideService(ReadTime, () => vectors.now)
    )
)

it.effect("bounds pages and keeps LastDays fixed while continuing", () => {
  let at = vectors.now
  return Effect.gen(function* () {
    yield* seed()
    const client = yield* api
    const input = new Reads.FilterRequest({
      filter: { published: { _tag: "LastDays", days: 1 } },
      sort: "publishedDesc",
      limit: null,
      pageSize: 2
    })
    const first = yield* client.reads.filter({ payload: input })
    expect(first.total).toBe(5)
    at += 30 * 86_400_000
    const second = yield* client.reads.filter({
      payload: new Reads.FilterRequest({ ...input, continuation: first.continuation as string })
    })
    expect(second.total).toBe(5)
    expect(second.items.map((e) => e.id)).toEqual(["f", "a"])
    const fresh = yield* client.reads.filter({ payload: input })
    expect(fresh.total).toBe(0)
    const sql = yield* SqlClient.SqlClient
    for (let i = 0; i < 205; i++)
      yield* sql`INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url)
      VALUES (${`bulk-${i}`}, 'tech', ${`bulk-${i}`}, 'Bulk', '', 0, 'audio')`
    const request = { filter: {}, sort: "publishedDesc" as const, limit: null }
    expect(
      (yield* client.reads.filter({ payload: new Reads.FilterRequest(request) })).items
    ).toHaveLength(100)
    const largest = yield* client.reads.filter({
      payload: new Reads.FilterRequest({ ...request, pageSize: 200 })
    })
    expect(largest.items).toHaveLength(200)
    expect(largest.total).toBe(212)
    const remaining = yield* client.reads.filter({
      payload: new Reads.FilterRequest({
        ...request,
        pageSize: 200,
        continuation: largest.continuation as string
      })
    })
    expect(remaining.items).toHaveLength(12)
    expect(remaining.continuation).toBeNull()
    yield* sql`UPDATE subscription SET title = 'New title' WHERE id = 'tech'`
    const changed = yield* Effect.flip(
      client.reads.filter({
        payload: new Reads.FilterRequest({
          ...request,
          pageSize: 200,
          continuation: largest.continuation as string
        })
      })
    )
    expect(changed._tag).toBe("ReadChanged")
  }).pipe(
    Effect.provide(services),
    Effect.provideService(ReadTime, () => at)
  )
})

it.effect("fails closed for oversized persisted Views and direct query-builder callers", () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const reads = yield* make
    const view = {
      id: "huge",
      name: "Huge",
      filter: { text: Array(1000).fill("a").join(" ") },
      sort: "publishedDesc",
      limit: null
    }
    yield* sql`INSERT INTO view (id, ordinal, doc) VALUES ('huge', 0, ${JSON.stringify(view)})`
    expect((yield* Effect.flip(reads.view("huge", {})))._tag).toBe("InvalidReadQuery")
    expect((yield* Effect.flip(reads.counts))._tag).toBe("InvalidReadQuery")
    // Typed callers and old stored State must pass the same pre-compilation budget.
    expect((yield* Effect.flip(reads.filter({ ...view } as Reads.FilterRequest)))._tag).toBe(
      "InvalidReadQuery"
    )
  }).pipe(Effect.provide(services))
)
