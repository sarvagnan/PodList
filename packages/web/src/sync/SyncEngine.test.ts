import { describe, expect, it } from "@effect/vitest"
import { Library as LibraryApi, Sync } from "@podlist/api"
import { type Device, Library, Operation, PlaybackSettings, State, Units } from "@podlist/domain"
import { type Context, Effect, Layer, Schema, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import {
  entryMembershipKey,
  episodeFactsKey,
  playedKey,
  progressMembershipKey
} from "../data/DataLayer.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { localWorkLayer } from "../platform/LocalWorkLive.ts"
import { upsertEpisodes, upsertSubscriptions } from "./Catalogue.ts"
import { catalogueKey, SyncEngine } from "./SyncEngine.ts"
import { Offline, Transport } from "./Transport.ts"

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})

/** An in-memory server with the same rules as the real one: an operation log and State. */
const makeServer = () => {
  const log: Array<Operation.Operation> = []
  const registrations: Array<Device.Device> = []
  let state = State.initial(defaults)
  let online = true
  let duringPush: (() => Promise<void>) | undefined
  const episodes = ["e1", "e2", "e3"].map((id, i) =>
    Schema.decodeUnknownSync(Library.Episode)({
      id,
      subscriptionId: "s",
      guid: id,
      title: `Episode ${id}`,
      description: "",
      published: i,
      duration: 60,
      audioUrl: `https://cdn.test/${id}.mp3`,
      artwork: null,
      chapters: [],
      audioUpdatedAt: null
    })
  )
  const subscription = Schema.decodeUnknownSync(Library.Subscription)({
    id: "s",
    feedUrl: "https://feed.test",
    title: "Deep Field",
    author: null,
    description: null,
    artwork: null,
    subscribedAt: 0,
    unsubscribedAt: null,
    playedThreshold: null,
    playbackSettings: {}
  })
  const guard = <A>(f: () => A) =>
    online ? Effect.sync(f) : Effect.fail(new Offline("server unreachable"))
  const transport = Transport.of({
    registerDevice: (device) =>
      guard(() => {
        registrations.push(device)
      }),
    push: (operations) =>
      Effect.gen(function* () {
        if (duringPush) yield* Effect.promise(duringPush)
        return yield* guard(() => {
          const fresh = operations.filter((o) => !log.some((l) => l.id === o.id))
          log.push(...fresh)
          state = State.applyOperations(state, fresh).state
          return new Sync.PushResponse({ cursor: log.length, accepted: fresh.length })
        })
      }),
    pull: (since) =>
      guard(() =>
        since === 0
          ? new Sync.PullResponse({ cursor: log.length, snapshot: state, operations: [] })
          : new Sync.PullResponse({
              cursor: log.length,
              snapshot: null,
              operations: log.slice(since)
            })
      ),
    chapters: () => Effect.succeed([]),
    // The Subscription's change comes after the Episodes in the first page.
    catalogue: (since) =>
      guard(() => {
        const rows = [...episodes, subscription]
        const page = rows.slice(since, since + 2)
        return new LibraryApi.CatalogueChanges({
          cursor: since + page.length,
          subscriptions: page.filter((r): r is Library.Subscription => "feedUrl" in r),
          episodes: page.filter((r): r is Library.Episode => "audioUrl" in r),
          referencedSubscriptions:
            page.includes(subscription) || page.length === 0 ? [] : [subscription],
          more: since + page.length < rows.length
        })
      })
  })
  return {
    registrations,
    transport,
    setOnline: (value: boolean) => {
      online = value
    },
    onPush: (f: (() => Promise<void>) | undefined) => {
      duringPush = f
    },
    state: () => state
  }
}

// Each Device gets an in-memory database built once per test, so "restarting" a Device
// rebuilds only the engine, over the same database.
const newDatabase = Layer.build(LocalDb.layerMemory.pipe(Layer.provideMerge(Reactivity.layer)))
const device = (
  server: ReturnType<typeof makeServer>,
  db: Context.Context<SqlClient.SqlClient | Reactivity.Reactivity>,
  options: Pick<Parameters<typeof SyncEngine.layer>[0], "deviceKind" | "standalone"> = {}
) =>
  SyncEngine.layer({ defaults, deviceName: "test", ...options }).pipe(
    Layer.provideMerge(Layer.succeedContext(db)),
    Layer.provide(Layer.succeed(Transport, server.transport))
  )
const change = (c: unknown) => Schema.decodeUnknownSync(Operation.Change)(c)
const add = (episodeId: string) =>
  change({ _tag: "AddEntry", playlistId: "default", episodeId, placement: "last" })
const order = (s: State.State) => s.playlists[0]?.entries.map((e) => e.episodeId)

describe("SyncEngine", () => {
  it.effect("re-registers an existing desktop device with the same ID and the desktop kind", () =>
    Effect.gen(function* () {
      const server = makeServer()
      const db = yield* newDatabase
      const id = yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* engine.sync
        yield* engine.sync
        return engine.deviceId
      }).pipe(Effect.provide(device(server, db)))
      expect(server.registrations).toMatchObject([{ id, kind: "pwa" }])

      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        server.setOnline(false)
        expect(yield* engine.sync.pipe(Effect.flip)).toBeInstanceOf(Offline)
        server.setOnline(true)
        yield* engine.sync
      }).pipe(Effect.provide(device(server, db, { deviceKind: "desktop" })))

      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* engine.sync
      }).pipe(Effect.provide(device(server, db, { deviceKind: "desktop" })))
      expect(server.registrations).toMatchObject([
        { id, kind: "pwa" },
        { id, kind: "desktop" }
      ])
    })
  )

  it.effect(
    "keeps Standalone State and catalogue edits without registering or queuing a push",
    () =>
      Effect.gen(function* () {
        const server = makeServer()
        const db = yield* Layer.build(
          LocalDb.layerMemoryStandalone.pipe(Layer.provideMerge(Reactivity.layer))
        )
        const firstPage = yield* server.transport.catalogue(0)
        yield* Effect.gen(function* () {
          yield* upsertSubscriptions(firstPage.referencedSubscriptions ?? [])
          yield* upsertEpisodes(firstPage.episodes)
        }).pipe(Effect.provide(db))
        server.setOnline(false)
        const layer = device(server, db, { deviceKind: "desktop", standalone: true })
        const id = yield* Effect.gen(function* () {
          const engine = yield* SyncEngine
          yield* engine.record(add("e1"))
          yield* engine.record(change({ _tag: "MarkSubscriptionPlayed", subscriptionId: "s" }))
          yield* engine.record(
            change({
              _tag: "SetSubscriptionOverrides",
              subscriptionId: "s",
              playbackSettings: { speed: 1.5 },
              playedThreshold: 15
            })
          )
          yield* engine.sync
          expect(yield* SubscriptionRef.get(engine.status)).toMatchObject({
            pending: 0,
            ready: true
          })
          return engine.deviceId
        }).pipe(Effect.provide(layer))

        yield* Effect.gen(function* () {
          const engine = yield* SyncEngine
          const sql = yield* SqlClient.SqlClient
          expect(engine.deviceId).toBe(id)
          expect(
            (yield* SubscriptionRef.get(engine.state)).episodeStates.e1?.played?.source._tag
          ).toBe("User")
          expect(yield* sql`SELECT played_threshold, playback_settings FROM subscription`).toEqual([
            { played_threshold: 15, playback_settings: '{"speed":1.5}' }
          ])
          expect(yield* sql`SELECT * FROM outbox`).toEqual([])
          const logged = yield* sql<{
            operation: string
          }>`SELECT operation FROM local_operation ORDER BY seq`
          expect(logged.map(({ operation }) => JSON.parse(operation).change._tag)).toEqual([
            "AddEntry",
            "MarkPlayed",
            "MarkPlayed",
            "SetSubscriptionOverrides"
          ])
        }).pipe(Effect.provide(layer))
        expect(server.registrations).toEqual([])
      })
  )

  it.effect("commits a dependent batch as ordered outbox operations across a Worker restart", () =>
    Effect.gen(function* () {
      const server = makeServer()
      const db = yield* newDatabase
      const transport = server.transport
      const withWorker = SyncEngine.layer({
        defaults,
        deviceName: "desktop",
        deviceKind: "desktop"
      }).pipe(
        Layer.provide(
          Layer.mergeAll(
            localWorkLayer,
            Layer.succeed(Transport, {
              ...transport,
              catalogueText: (since) =>
                transport
                  .catalogue(since)
                  .pipe(
                    Effect.map(
                      Schema.encodeSync(Schema.fromJsonString(LibraryApi.CatalogueChanges))
                    )
                  )
            })
          )
        ),
        Layer.provideMerge(Layer.succeedContext(db))
      )

      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        const sql = yield* SqlClient.SqlClient
        const abort = yield* Effect.exit(
          engine.recordBatch(function* () {
            yield add("discarded")
            throw new Error("Abort the batch")
          })
        )
        expect(abort._tag).toBe("Failure")
        expect(order(yield* SubscriptionRef.get(engine.state))).toEqual([])
        expect(yield* sql`SELECT * FROM outbox`).toEqual([])
        const first = yield* engine.recordBatch(function* () {
          const afterFirst = yield add("e1")
          yield add("e2")
          return order(afterFirst)
        })
        expect(first).toEqual(["e1"])
        expect((yield* SubscriptionRef.get(engine.status)).pending).toBe(2)
        yield* engine.sync
        expect(yield* sql`SELECT title_folded FROM episode WHERE id = 'e2'`).toEqual([
          { title_folded: "episode e2" }
        ])
      }).pipe(Effect.provide(withWorker))

      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        expect(order(yield* SubscriptionRef.get(engine.state))).toEqual(["e1", "e2"])
        yield* engine.record(
          change({ _tag: "RemoveEntry", playlistId: "default", episodeId: "e1" })
        )
        yield* engine.sync
        expect(order(server.state())).toEqual(["e2"])
        expect(order(yield* SubscriptionRef.get(engine.state))).toEqual(["e2"])
      }).pipe(Effect.provide(withWorker))
    })
  )

  it.effect("invalidates progress membership only when an Entry crosses zero", () =>
    Effect.gen(function* () {
      const server = makeServer()
      const db = yield* newDatabase
      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        const reactivity = yield* Reactivity.Reactivity
        yield* engine.record(add("e1"))
        const invalidated: string[] = []
        for (const key of [entryMembershipKey, playedKey, episodeFactsKey, progressMembershipKey]) {
          const stop = reactivity.registerUnsafe([key], () => invalidated.push(key))
          yield* Effect.addFinalizer(() => Effect.sync(stop))
        }
        const position = (seconds: number) =>
          engine.record(
            change({
              _tag: "ReportPosition",
              playlistId: "default",
              episodeId: "e1",
              position: seconds,
              listenedAt: Date.now()
            })
          )
        yield* position(15)
        expect(invalidated.splice(0)).toEqual([progressMembershipKey])
        yield* position(30)
        expect(invalidated).toEqual([])
        yield* engine.record(
          change({ _tag: "MarkPlayed", episodeId: "e1", source: { _tag: "User" } })
        )
        expect(invalidated).toEqual(
          expect.arrayContaining([playedKey, episodeFactsKey, entryMembershipKey])
        )
      }).pipe(Effect.provide(device(server, db)))
    })
  )

  it.effect("queues imported Operations and their checkpoint together", () =>
    Effect.gen(function* () {
      const server = makeServer()
      const db = yield* newDatabase
      const original = Schema.decodeUnknownSync(Operation.Operation)({
        id: "bring-over-op",
        deviceId: "source-device",
        sequence: 0,
        recordedAt: 1,
        change: Schema.encodeSync(Operation.Change)(add("e1"))
      })
      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        const sql = yield* SqlClient.SqlClient
        if (!engine.queueBringOver) throw new Error("Expected connected engine")
        const checkpoint = { key: "bringOverJob", value: '{"queued":true}' }
        yield* engine.queueBringOver([original], checkpoint)
        yield* engine.queueBringOver([original], checkpoint)
        expect(yield* sql`SELECT id FROM outbox`).toEqual([{ id: original.id }])
        expect(yield* sql`SELECT value FROM sync_meta WHERE key = ${checkpoint.key}`).toEqual([
          { value: checkpoint.value }
        ])
        expect(order(yield* SubscriptionRef.get(engine.state))).toEqual(["e1"])
      }).pipe(Effect.provide(device(server, db)))

      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        expect((yield* SubscriptionRef.get(engine.status)).pending).toBe(1)
        yield* engine.sync
        yield* engine.sync
        expect(order(server.state())).toEqual(["e1"])
        expect((yield* SubscriptionRef.get(engine.status)).pending).toBe(0)
      }).pipe(Effect.provide(device(server, db)))
    })
  )

  it.effect("applies edits immediately offline and keeps them across restarts", () =>
    Effect.gen(function* () {
      const server = makeServer()
      server.setOnline(false)
      const db = yield* newDatabase
      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* engine.record(add("e1"))
        expect(order(yield* SubscriptionRef.get(engine.state))).toEqual(["e1"])
        const failed = yield* engine.sync.pipe(Effect.flip)
        expect(failed).toBeInstanceOf(Offline)
      }).pipe(Effect.provide(device(server, db)))

      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        expect(order(yield* SubscriptionRef.get(engine.state))).toEqual(["e1"])
        expect((yield* SubscriptionRef.get(engine.status)).pending).toBe(1)
        server.setOnline(true)
        yield* engine.sync
        expect((yield* SubscriptionRef.get(engine.status)).pending).toBe(0)
        expect(order(server.state())).toEqual(["e1"])
      }).pipe(Effect.provide(device(server, db)))
    })
  )

  it.effect("brings two Devices to the same State", () =>
    Effect.gen(function* () {
      const server = makeServer()
      const phone = yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* engine.record(add("e1"))
        yield* engine.record(add("e2"))
        yield* engine.sync
        return engine.deviceId
      }).pipe(Effect.provide(device(server, yield* newDatabase)))

      const mac = yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* engine.sync
        yield* engine.record(
          change({ _tag: "MoveEntry", playlistId: "default", episodeId: "e2", after: null })
        )
        yield* engine.sync
        return { id: engine.deviceId, state: yield* SubscriptionRef.get(engine.state) }
      }).pipe(Effect.provide(device(server, yield* newDatabase)))

      expect(mac.id).not.toBe(phone)
      expect(order(mac.state)).toEqual(["e2", "e1"])
      expect(Schema.encodeSync(State.State)(mac.state)).toEqual(
        Schema.encodeSync(State.State)(server.state())
      )
    })
  )

  it.effect("syncs as soon as it starts, without waiting for edits to settle", () =>
    Effect.gen(function* () {
      const server = makeServer()
      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* engine.record(add("e1"))
        yield* engine.sync
      }).pipe(Effect.provide(device(server, yield* newDatabase)))

      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* Effect.forkScoped(engine.runInBackground)
        // The test clock stands still, so only an immediate first sync can bring e1 in.
        for (
          let i = 0;
          i < 50 && order(yield* SubscriptionRef.get(engine.state))?.length === 0;
          i++
        ) {
          yield* Effect.promise(() => new Promise((r) => setTimeout(r, 10)))
        }
        expect(order(yield* SubscriptionRef.get(engine.state))).toEqual(["e1"])
      }).pipe(Effect.provide(device(server, yield* newDatabase)))
    })
  )

  it.effect("keeps an edit made while a sync is talking to the server", () =>
    Effect.gen(function* () {
      const server = makeServer()
      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* engine.record(add("e1"))
        server.onPush(() => Effect.runPromise(engine.record(add("e2"))))
        yield* engine.sync
        server.onPush(undefined)
        expect(order(yield* SubscriptionRef.get(engine.state))).toEqual(["e1", "e2"])
        expect((yield* SubscriptionRef.get(engine.status)).pending).toBe(1)
        expect(order(server.state())).toEqual(["e1"])
        yield* engine.sync
        expect(order(server.state())).toEqual(["e1", "e2"])
      }).pipe(Effect.provide(device(server, yield* newDatabase)))
    })
  )

  it.effect("mirrors the catalogue into the local tables, page by page", () =>
    Effect.gen(function* () {
      const server = makeServer()
      yield* Effect.gen(function* () {
        const engine = yield* SyncEngine
        const sql = yield* SqlClient.SqlClient
        const reactivity = yield* Reactivity.Reactivity
        let invalidated = 0
        reactivity.registerUnsafe([catalogueKey], () => invalidated++)
        yield* engine.sync
        // Screens reading the catalogue re-run when new podcasts or Episodes arrive.
        expect(invalidated).toBeGreaterThan(0)
        const rows = yield* sql<{ id: string }>`SELECT id FROM episode ORDER BY id`
        expect(rows.map((r) => r.id)).toEqual(["e1", "e2", "e3"])
        const [sub] = yield* sql<{ title: string }>`SELECT title FROM subscription`
        expect(sub?.title).toBe("Deep Field")
      }).pipe(Effect.provide(device(server, yield* newDatabase)))
    })
  )
})
