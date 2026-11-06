import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assert, describe, it } from "@effect/vitest"
import { PodListApi, Sync } from "@podlist/api"
import { Device, Operation, State } from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import { HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import * as Database from "../src/Database.ts"
import { SyncHandlers } from "../src/Http.ts"
import { SyncStore } from "../src/SyncStore.ts"

const serverAt = (filename: string) =>
  Layer.mergeAll(SyncHandlers, HttpServer.layerServices).pipe(
    Layer.provide(SyncStore.layer),
    Layer.provide(Database.layer(filename))
  )
const client = HttpApiTest.groups(PodListApi, ["sync"])

let n = 0
const op = (deviceId: string, change: unknown) =>
  Schema.decodeUnknownSync(Operation.Operation)({
    id: `${deviceId}-${++n}`,
    deviceId,
    sequence: n,
    recordedAt: 1_000_000 + n,
    change
  })
const add = (deviceId: string, episodeId: string) =>
  op(deviceId, { _tag: "AddEntry", playlistId: "default", episodeId, placement: "last" })
const order = (state: State.State) => state.playlists[0]?.entries.map((e) => e.episodeId)

describe("sync API", () => {
  it.effect("registers a Device and accepts each operation once", () =>
    Effect.gen(function* () {
      const api = yield* client
      const device = Schema.decodeUnknownSync(Device.Device)({
        id: "phone",
        name: "Pixel",
        kind: "pwa",
        registeredAt: 1
      })
      assert.strictEqual((yield* api.sync.registerDevice({ payload: device })).id, "phone")

      const ops = [add("phone", "A"), add("phone", "B")]
      const first = yield* api.sync.push({ payload: new Sync.PushRequest({ operations: ops }) })
      assert.deepStrictEqual({ ...first }, { cursor: 2, accepted: 2 })
      const again = yield* api.sync.push({ payload: new Sync.PushRequest({ operations: ops }) })
      assert.deepStrictEqual({ ...again }, { cursor: 2, accepted: 0 })

      const pulled = yield* api.sync.pull({ query: { since: 0 } })
      assert.deepStrictEqual(order(pulled.snapshot as State.State), ["A", "B"])
    }).pipe(Effect.provide(serverAt(":memory:")))
  )

  it.effect("lets a Device catch up by replaying only the operations it has not seen", () =>
    Effect.gen(function* () {
      const api = yield* client
      yield* api.sync.push({ payload: new Sync.PushRequest({ operations: [add("phone", "A")] }) })
      const phoneView = yield* api.sync.pull({ query: { since: 0 } })

      // Meanwhile the Mac adds and reorders.
      yield* api.sync.push({
        payload: new Sync.PushRequest({
          operations: [
            add("mac", "B"),
            op("mac", { _tag: "MoveEntry", playlistId: "default", episodeId: "B", after: null })
          ]
        })
      })

      const delta = yield* api.sync.pull({ query: { since: phoneView.cursor } })
      assert.strictEqual(delta.snapshot, null)
      assert.strictEqual(delta.operations.length, 2)
      const replayed = State.applyOperations(
        phoneView.snapshot as State.State,
        delta.operations
      ).state
      const server = (yield* api.sync.pull({ query: { since: 0 } })).snapshot as State.State
      assert.deepStrictEqual(
        Schema.encodeSync(State.State)(replayed),
        Schema.encodeSync(State.State)(server)
      )
      assert.deepStrictEqual(order(server), ["B", "A"])
    }).pipe(Effect.provide(serverAt(":memory:")))
  )

  it.effect("keeps State on disk across restarts", () => {
    const file = join(mkdtempSync(join(tmpdir(), "podlist-")), "sync.db")
    return Effect.gen(function* () {
      yield* Effect.gen(function* () {
        const api = yield* client
        yield* api.sync.push({
          payload: new Sync.PushRequest({
            operations: [
              add("phone", "A"),
              op("phone", { _tag: "SetStar", episodeId: "A", starred: true })
            ]
          })
        })
      }).pipe(Effect.provide(serverAt(file)))

      const restarted = yield* Effect.gen(function* () {
        const api = yield* client
        return yield* api.sync.pull({ query: { since: 0 } })
      }).pipe(Effect.provide(serverAt(file)))
      assert.deepStrictEqual(order(restarted.snapshot as State.State), ["A"])
      assert.isTrue(restarted.snapshot?.episodeStates.A?.starred)
      assert.strictEqual(restarted.cursor, 2)
    })
  })
})
