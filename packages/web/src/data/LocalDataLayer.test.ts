import { describe, expect, it } from "@effect/vitest"
import { Library, Operation, PlaybackSettings, Units } from "@podlist/domain"
import { Effect, Layer, Schema, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as LocalDb from "../platform/LocalDb.ts"
import { upsertEpisodes, upsertSubscriptions } from "../sync/Catalogue.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { Offline, Transport } from "../sync/Transport.ts"
import { DataLayer } from "./DataLayer.ts"
import { LocalDataLayer } from "./LocalDataLayer.ts"

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})
const offline = () => Effect.fail(new Offline("offline"))
const transport = Transport.of({
  registerDevice: offline,
  push: offline,
  pull: offline,
  catalogue: offline,
  chapters: offline
})

const subscription = Schema.decodeUnknownSync(Library.Subscription)({
  id: "s",
  feedUrl: "https://feed.test/rss",
  title: "Deep Field",
  author: null,
  description: "A podcast",
  artwork: { url: "https://img.test/podcast.jpg" },
  subscribedAt: 0,
  unsubscribedAt: null,
  playedThreshold: 0,
  playbackSettings: { speed: 1.5 }
})
const removed = Schema.decodeUnknownSync(Library.Subscription)({
  ...Schema.encodeSync(Library.Subscription)(subscription),
  id: "removed",
  feedUrl: "https://feed.test/removed",
  title: "Former podcast",
  unsubscribedAt: 1
})
const episodes = ["e1", "e2", "e3"].map((id, i) =>
  Schema.decodeUnknownSync(Library.Episode)({
    id,
    subscriptionId: i === 2 ? "removed" : "s",
    guid: id,
    title: `Episode ${id}`,
    description: "Notes about café",
    published: i,
    duration: 60,
    audioUrl: `https://cdn.test/${id}.mp3`,
    artwork: null,
    chapters: [{ start: 0, title: "Opening", artwork: null, url: null }],
    audioUpdatedAt: null
  })
)
const change = Schema.decodeUnknownSync(Operation.Change)
const layer = LocalDataLayer.pipe(
  Layer.provideMerge(SyncEngine.layer({ defaults, deviceName: "test" })),
  Layer.provideMerge(LocalDb.layerMemory),
  Layer.provide(Reactivity.layer),
  Layer.provide(Layer.succeed(Transport, transport))
)
const seed = Effect.gen(function* () {
  yield* upsertSubscriptions([subscription, removed])
  yield* upsertEpisodes(episodes)
})

describe("LocalDataLayer", () => {
  it.effect(
    "keeps View results, limited counts and Subscription summaries in step with edits",
    () =>
      Effect.gen(function* () {
        yield* seed
        const data = yield* DataLayer
        yield* data.record(
          change({
            _tag: "SaveView",
            view: { id: "v", name: "Recent", filter: {}, sort: "publishedDesc", limit: 1 }
          })
        )
        expect((yield* data.viewEpisodes("v")).map((e) => e.id)).toEqual(["e2"])
        expect((yield* data.viewCounts).get("v")).toBe(1)
        expect(yield* data.viewEpisodes("missing")).toEqual([])
        expect(yield* data.entryEpisodes([])).toEqual(new Map())
        expect((yield* data.entryEpisodes(["e1", "missing"])).get("e1")?.artworkUrl).toBe(
          "https://img.test/podcast.jpg"
        )
        yield* data.record(
          change({ _tag: "MarkPlayed", episodeId: "e2", source: { _tag: "User" } })
        )
        yield* data.record(change({ _tag: "SetStar", episodeId: "e3", starred: true }))
        const found = yield* data.filterEpisodes({
          filter: { text: "CAFE", played: "unplayed" },
          sort: "publishedDesc",
          limit: null
        })
        expect(found.map((e) => [e.id, e.starred, e.played])).toEqual([
          ["e3", true, false],
          ["e1", false, false]
        ])
        expect(yield* data.subscriptions).toMatchObject([
          { id: "s", unplayed: 1, speed: 1.5, customSettings: 2 }
        ])
        expect(yield* data.subscription("s")).toMatchObject({
          episodes: 2,
          unplayed: 1,
          playedThreshold: 0,
          playbackSettings: { speed: 1.5 }
        })
        expect(yield* data.subscription("removed")).toMatchObject({ subscribed: false })
        expect(yield* data.subscription("missing")).toBeNull()
        expect((yield* SubscriptionRef.get(data.status)).pending).toBe(3)
      }).pipe(Effect.provide(layer))
  )

  it.effect(
    "serves detail and playback without ambient SQL, with stored Chapters while offline",
    () =>
      Effect.gen(function* () {
        yield* seed
        const data = yield* DataLayer
        // The consumer receives only the seam. All local dependencies are captured by the adapter.
        yield* Effect.gen(function* () {
          const client = yield* DataLayer
          expect(yield* client.episodeTitle("e1")).toBe("Episode e1")
          expect(yield* client.episodeTitle("missing")).toBeUndefined()
          expect(yield* client.episodeDetail("e1")).toMatchObject({
            title: "Episode e1",
            description: "Notes about café",
            artworkUrl: "https://img.test/podcast.jpg",
            chapters: [{ start: 0, title: "Opening" }]
          })
          expect(yield* client.episodeDetail("missing")).toBeNull()
          expect(yield* client.playbackEpisode("e1")).toMatchObject({
            audioUrl: "https://cdn.test/e1.mp3",
            threshold: 0,
            subscriptionId: "s",
            override: { speed: 1.5 },
            chapters: [{ start: 0, title: "Opening" }]
          })
          expect(yield* client.playbackEpisode("missing")).toMatchObject({
            title: "",
            audioUrl: null,
            subscriptionId: null,
            chapters: []
          })
          const stats = yield* client.statsCatalogue
          expect(stats.podcasts.get("removed")).toBe("Former podcast")
          expect([...stats.episodes].sort()).toEqual(["e1", "e2", "e3"])
          expect(yield* client.sync.pipe(Effect.flip)).toBeInstanceOf(Offline)
          expect((yield* SubscriptionRef.get(client.status)).error).toBe("offline")
        }).pipe(Effect.provideService(DataLayer, data))
      }).pipe(Effect.provide(layer))
  )
})
