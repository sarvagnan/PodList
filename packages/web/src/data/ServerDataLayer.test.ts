import { describe, expect, it } from "@effect/vitest"
import { Sync } from "@podlist/api"
import {
  type Operation,
  Operation as Operations,
  PlaybackSettings,
  State,
  Units
} from "@podlist/domain"
import { Deferred, Effect, Fiber, Layer, Schema, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { Offline, Transport } from "../sync/Transport.ts"
import { DataLayer } from "./DataLayer.ts"
import { serverDataLayer } from "./ServerDataLayer.ts"

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})
const change = Schema.decodeUnknownSync(Operations.Change)
const create = (id: string) =>
  change({ _tag: "CreatePlaylist", playlistId: id, name: id, clearOnPlayed: false })
const setup = () => {
  let confirmed = State.initial(defaults)
  let cursor = 1
  let legacy = false
  let offline = false
  let loseResponse = false
  let delay: Effect.Effect<void> = Effect.void
  const committed = new Set<string>()
  const submitted: Array<ReadonlyArray<Operation.Operation>> = []
  const transport = Transport.of({
    registerDevice: (device) => {
      expect(device.kind).toBe("web")
      return Effect.void
    },
    push: (operations) =>
      Effect.gen(function* () {
        submitted.push(operations)
        if (offline) return yield* Effect.fail(new Offline("offline"))
        yield* delay
        const fresh = operations.filter((operation) => !committed.has(operation.id))
        for (const operation of fresh) committed.add(operation.id)
        confirmed = State.applyOperations(confirmed, fresh).state
        cursor += fresh.length
        if (loseResponse) return yield* Effect.fail(new Offline("response lost"))
        return new Sync.PushResponse({
          cursor,
          accepted: fresh.length,
          ...(legacy ? {} : { acknowledged: operations.map((operation) => operation.id) })
        })
      }),
    pull: () =>
      Effect.suspend(() =>
        offline
          ? Effect.fail(new Offline("offline"))
          : Effect.succeed(new Sync.PullResponse({ cursor, snapshot: confirmed, operations: [] }))
      ),
    catalogue: () => Effect.die("Web must never pull the local Library"),
    chapters: () => Effect.succeed([])
  })
  const layer = serverDataLayer({ defaults, deviceName: "Browser", origin: location.origin }).pipe(
    Layer.provide(Layer.succeed(Transport, transport)),
    Layer.provide(Reactivity.layer)
  )
  return {
    layer,
    submitted,
    legacy: () => {
      legacy = true
    },
    offline: (value: boolean) => {
      offline = value
    },
    lose: (value: boolean) => {
      loseResponse = value
    },
    delay: (value: Effect.Effect<void>) => {
      delay = value
    },
    confirmed: () => confirmed
  }
}

describe("online State adapter", () => {
  it.effect(
    "keeps a failed optimistic edit, rejects new offline edits, and retries its stable operation",
    () => {
      const server = setup()
      return Effect.gen(function* () {
        const data = yield* DataLayer
        yield* data.sync
        yield* data.record(create("pending"))
        expect(
          (yield* SubscriptionRef.get(data.state)).playlists.some((p) => p.id === "pending")
        ).toBe(true)
        server.offline(true)
        yield* Effect.ignore(data.sync)
        expect(yield* SubscriptionRef.get(data.status)).toMatchObject({
          pending: 1,
          writable: false
        })
        expect((yield* Effect.exit(data.record(create("blocked"))))._tag).toBe("Failure")
        expect((yield* SubscriptionRef.get(data.status)).pending).toBe(1)
        server.offline(false)
        yield* data.sync
        expect(server.submitted[1]?.[0]).toEqual(server.submitted[0]?.[0])
        expect(yield* SubscriptionRef.get(data.status)).toMatchObject({
          pending: 0,
          writable: true
        })
      }).pipe(Effect.provide(server.layer))
    }
  )
  it.effect("retains edits recorded during a push and applies them after confirmed State", () => {
    const server = setup()
    return Effect.gen(function* () {
      const data = yield* DataLayer
      yield* data.sync
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      server.delay(
        Deferred.succeed(started, undefined).pipe(Effect.andThen(Deferred.await(release)))
      )
      yield* data.record(create("first"))
      const syncing = yield* Effect.forkChild(data.sync)
      yield* Deferred.await(started)
      yield* data.record(create("second"))
      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(syncing)
      expect((yield* SubscriptionRef.get(data.status)).pending).toBe(1)
      expect((yield* SubscriptionRef.get(data.state)).playlists.map((p) => p.id)).toEqual(
        expect.arrayContaining(["first", "second"])
      )
      yield* data.sync
      expect((yield* SubscriptionRef.get(data.status)).pending).toBe(0)
    }).pipe(Effect.provide(server.layer))
  })
  it.effect("a lost response does not count Listening twice on retry", () => {
    const server = setup()
    return Effect.gen(function* () {
      const data = yield* DataLayer
      yield* data.sync
      yield* data.record(
        change({
          _tag: "RecordListening",
          amounts: [{ day: "2026-11-11", subscriptionId: "podcast", seconds: 15 }]
        })
      )
      server.lose(true)
      yield* Effect.ignore(data.sync)
      expect((yield* SubscriptionRef.get(data.status)).pending).toBe(1)
      server.lose(false)
      yield* data.sync
      expect(server.submitted[1]?.[0]?.id).toBe(server.submitted[0]?.[0]?.id)
      expect(yield* SubscriptionRef.get(data.state)).toEqual(server.confirmed())
      expect((yield* SubscriptionRef.get(data.status)).pending).toBe(0)
    }).pipe(Effect.provide(server.layer))
  })
  it.effect("accepts successful replies from older servers without acknowledgements", () => {
    const server = setup()
    server.legacy()
    return Effect.gen(function* () {
      const data = yield* DataLayer
      yield* data.sync
      yield* data.record(create("legacy"))
      yield* data.sync
      expect((yield* SubscriptionRef.get(data.status)).pending).toBe(0)
      expect(
        (yield* SubscriptionRef.get(data.state)).playlists.some((p) => p.id === "legacy")
      ).toBe(true)
    }).pipe(Effect.provide(server.layer))
  })
  it.effect("reopening keeps identity and drops unsent edits", () => {
    const server = setup()
    let id = ""
    return Effect.gen(function* () {
      yield* Effect.gen(function* () {
        const data = yield* DataLayer
        id = data.deviceId
        yield* data.record(create("unsent"))
      }).pipe(Effect.provide(server.layer), Effect.scoped)
      yield* Effect.gen(function* () {
        const data = yield* DataLayer
        expect(data.deviceId).toBe(id)
        expect((yield* SubscriptionRef.get(data.status)).pending).toBe(0)
        yield* data.sync
        expect(
          (yield* SubscriptionRef.get(data.state)).playlists.some((p) => p.id === "unsent")
        ).toBe(false)
      }).pipe(Effect.provide(server.layer), Effect.scoped)
    })
  })
})
