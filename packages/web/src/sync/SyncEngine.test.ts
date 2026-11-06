import { describe, expect, it } from "@effect/vitest"
import { Library as LibraryApi, Sync } from "@podlist/api"
import { Library, Operation, PlaybackSettings, State, Units } from "@podlist/domain"
import { type Context, Effect, Layer, Schema, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import * as LocalDb from "../platform/LocalDb.ts"
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
    registerDevice: () => guard(() => undefined),
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
    // Catalogue in pages of two rows: the Subscription first, then Episodes.
    catalogue: (since) =>
      guard(() => {
        const rows = [subscription, ...episodes]
        const page = rows.slice(since, since + 2)
        return new LibraryApi.CatalogueChanges({
          cursor: since + page.length,
          subscriptions: page.filter((r): r is Library.Subscription => "feedUrl" in r),
          episodes: page.filter((r): r is Library.Episode => "audioUrl" in r),
          more: since + page.length < rows.length
        })
      })
  })
  return {
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
  db: Context.Context<SqlClient.SqlClient | Reactivity.Reactivity>
) =>
  SyncEngine.layer({ defaults, deviceName: "test" }).pipe(
    Layer.provideMerge(Layer.succeedContext(db)),
    Layer.provide(Layer.succeed(Transport, server.transport))
  )
const change = (c: unknown) => Schema.decodeUnknownSync(Operation.Change)(c)
const add = (episodeId: string) =>
  change({ _tag: "AddEntry", playlistId: "default", episodeId, placement: "last" })
const order = (s: State.State) => s.playlists[0]?.entries.map((e) => e.episodeId)

describe("SyncEngine", () => {
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
