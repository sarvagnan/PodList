import { describe, expect, it } from "@effect/vitest"
import { PlaybackSettings, State, Units } from "@podlist/domain"
import { Effect, Layer, Schema, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import * as LocalDb from "../platform/LocalDb.ts"
import { catalogueKey, SyncEngine } from "../sync/SyncEngine.ts"
import { DownloadRulesLive } from "./DownloadRules.ts"
import { Downloads } from "./DownloadService.ts"

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})

describe("Download Rules worker", () => {
  it.live("fetches a newly Published Episode after Library invalidation alone", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const reactivity = yield* Reactivity.Reactivity
      const state = yield* SubscriptionRef.make(
        Schema.decodeUnknownSync(State.State)({
          ...State.initial(defaults),
          downloadRules: [
            { subscriptionId: "s", deviceId: "mine", mode: "allNew", keepAtMost: null }
          ]
        })
      )
      const status = yield* SubscriptionRef.make<
        ReadonlyMap<string, import("./Downloads.ts").DownloadStatus>
      >(new Map())
      const fetched: Array<string> = []
      yield* sql`INSERT INTO subscription (id, feed_url, title, subscribed_at) VALUES ('s', 'f', 'Podcast', 0)`
      yield* sql`INSERT INTO sync_meta (key, value) VALUES ('ruleSince:s', '0')`
      const engine = SyncEngine.of({
        state,
        deviceId: "mine",
        status: yield* SubscriptionRef.make<import("../sync/SyncEngine.ts").SyncStatus>({
          pending: 0,
          lastSyncedAt: null,
          error: null,
          ready: true
        }),
        record: () => Effect.void,
        sync: Effect.void,
        runInBackground: Effect.never
      })
      const downloads = Downloads.of({
        status,
        download: (id) =>
          Effect.sync(() => {
            fetched.push(id)
          }),
        remove: () => Effect.void,
        cancel: () => Effect.void,
        playableUrl: () => Effect.succeed(null)
      })
      yield* Layer.build(
        DownloadRulesLive.pipe(
          Layer.provide(
            Layer.mergeAll(Layer.succeed(SyncEngine, engine), Layer.succeed(Downloads, downloads))
          )
        )
      )
      yield* Effect.sleep("1200 millis")
      expect(fetched).toEqual([])
      yield* sql`INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url) VALUES ('fresh', 's', 'fresh', 'Episode', '', 1, 'audio')`
      yield* reactivity.invalidate([catalogueKey])
      yield* Effect.sleep("1200 millis")
      expect(fetched).toEqual(["fresh"])
    }).pipe(Effect.provide(LocalDb.layerMemory.pipe(Layer.provideMerge(Reactivity.layer))))
  )
  it.live(
    "uses a synced All New activation after an off/on cycle and clears legacy memory on exit",
    () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const state = yield* SubscriptionRef.make(
          Schema.decodeUnknownSync(State.State)({
            ...State.initial(defaults),
            downloadRules: [
              {
                subscriptionId: "s",
                deviceId: "mine",
                mode: "allNew",
                keepAtMost: null,
                since: 300
              }
            ]
          })
        )
        const status = yield* SubscriptionRef.make<
          ReadonlyMap<string, import("./Downloads.ts").DownloadStatus>
        >(new Map())
        const fetched: Array<string> = []
        yield* sql`INSERT INTO subscription (id, feed_url, title, subscribed_at) VALUES ('s', 'f', 'Podcast', 0)`
        yield* sql`INSERT INTO sync_meta (key, value) VALUES ('ruleSince:s', '0')`
        const engine = SyncEngine.of({
          state,
          deviceId: "mine",
          status: yield* SubscriptionRef.make<import("../sync/SyncEngine.ts").SyncStatus>({
            pending: 0,
            lastSyncedAt: null,
            error: null,
            ready: true
          }),
          record: () => Effect.void,
          sync: Effect.void,
          runInBackground: Effect.never
        })
        const downloads = Downloads.of({
          status,
          download: (id) =>
            Effect.sync(() => {
              fetched.push(id)
            }),
          remove: () => Effect.void,
          cancel: () => Effect.void,
          playableUrl: () => Effect.succeed(null)
        })
        yield* sql`INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url) VALUES ('before', 's', 'before', 'Before', '', 200, 'audio'), ('after', 's', 'after', 'After', '', 350, 'audio')`
        yield* Layer.build(
          DownloadRulesLive.pipe(
            Layer.provide(
              Layer.mergeAll(Layer.succeed(SyncEngine, engine), Layer.succeed(Downloads, downloads))
            )
          )
        )
        yield* Effect.sleep("1200 millis")
        expect(fetched).toEqual(["after"])
        const before = yield* SubscriptionRef.get(state)
        yield* SubscriptionRef.set(
          state,
          Schema.decodeUnknownSync(State.State)({
            ...before,
            downloadRules: [
              { subscriptionId: "s", deviceId: "mine", mode: "never", keepAtMost: null }
            ]
          })
        )
        yield* Effect.sleep("1200 millis")
        expect(yield* sql`SELECT value FROM sync_meta WHERE key = 'ruleSince:s'`).toEqual([])
      }).pipe(Effect.provide(LocalDb.layerMemory.pipe(Layer.provideMerge(Reactivity.layer))))
  )
})
