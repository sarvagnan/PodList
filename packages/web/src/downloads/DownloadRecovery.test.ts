import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { DownloadError, DownloadStore } from "../platform/DownloadStore.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { Downloads, downloadsLayer } from "./Downloads.ts"

const stored = new Map<string, number>()
const store = Layer.succeed(DownloadStore, {
  save: (episodeId) =>
    episodeId === "failure"
      ? Effect.fail(new DownloadError({ episodeId, message: "The host is unavailable." }))
      : Effect.sync(() => {
          stored.set(episodeId, 8)
          return { episodeId, bytes: 8 }
        }),
  has: (episodeId) => Effect.sync(() => stored.has(episodeId)),
  remove: (episodeId) =>
    Effect.sync(() => {
      stored.delete(episodeId)
    }),
  list: Effect.sync(() => [...stored].map(([episodeId, bytes]) => ({ episodeId, bytes }))),
  readPrefix: () => Effect.succeed(null),
  playableUrl: () => Effect.succeed(null)
})

const db = Layer.build(LocalDb.layerMemory.pipe(Layer.provideMerge(Reactivity.layer)))
const downloads = downloadsLayer({ audioUrl: (id) => `https://test.invalid/${id}` })

const waitFor = (episodeId: string, tag: "Stored" | "Failed") =>
  Effect.gen(function* () {
    const service = yield* Downloads
    for (let i = 0; i < 50; i++) {
      const state = yield* SubscriptionRef.get(service.status)
      if (state.get(episodeId)?._tag === tag) return
      yield* Effect.sleep("5 millis")
    }
    throw new Error(`Expected ${episodeId} to reach ${tag}`)
  })

describe("Download recovery", () => {
  it.live("resumes pending requests and repairs an already published file on startup", () =>
    Effect.gen(function* () {
      const database = yield* db
      const local = Layer.succeedContext(database)
      stored.set("published", 16)
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO download_request (episode_id, manual)
          VALUES ('pending', 1), ('published', 0)`
      }).pipe(Effect.provide(local))

      yield* Effect.gen(function* () {
        yield* waitFor("pending", "Stored")
        const service = yield* Downloads
        const state = yield* SubscriptionRef.get(service.status)
        expect(state.get("pending")).toMatchObject({ bytes: 8, manual: true })
        expect(state.get("published")).toMatchObject({ bytes: 16, manual: false })
        const sql = yield* SqlClient.SqlClient
        expect(yield* sql`SELECT * FROM download_request`).toEqual([])
      }).pipe(Effect.provide(downloads.pipe(Layer.provideMerge(local), Layer.provide(store))))
    })
  )

  it.live("retains failures across reopening until the user dismisses them", () =>
    Effect.gen(function* () {
      const database = yield* db
      const onDevice = downloads.pipe(
        Layer.provideMerge(Layer.succeedContext(database)),
        Layer.provide(store)
      )
      yield* Effect.scoped(
        Effect.gen(function* () {
          const service = yield* Downloads
          yield* service.download("failure")
          yield* waitFor("failure", "Failed")
        }).pipe(Effect.provide(onDevice))
      )
      yield* Effect.gen(function* () {
        const service = yield* Downloads
        const state = yield* SubscriptionRef.get(service.status)
        expect(state.get("failure")).toMatchObject({ message: "The host is unavailable." })
        yield* service.cancel("failure")
        expect((yield* SubscriptionRef.get(service.status)).has("failure")).toBe(false)
        const sql = yield* SqlClient.SqlClient
        expect(yield* sql`SELECT * FROM download_request`).toEqual([])
      }).pipe(Effect.provide(onDevice))
    })
  )
})
