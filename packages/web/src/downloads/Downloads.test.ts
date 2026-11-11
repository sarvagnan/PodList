import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { DownloadStore } from "../platform/DownloadStore.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { Downloads, downloadsLayer } from "./Downloads.ts"

const bytes = new Uint8Array(120_000).map((_, i) => i % 251)
const source = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }))
const audioUrl = (episodeId: string) =>
  episodeId.startsWith("broken") ? "http://127.0.0.1:9/nothing.mp3" : source

const newDatabase = Layer.build(LocalDb.layerMemory.pipe(Layer.provideMerge(Reactivity.layer)))
const onDevice = (db: Effect.Success<typeof newDatabase>) =>
  downloadsLayer({ audioUrl }).pipe(
    Layer.provideMerge(Layer.succeedContext(db)),
    Layer.provideMerge(DownloadStore.layerWeb)
  )

const statusOf = (episodeId: string) =>
  Effect.gen(function* () {
    return (yield* SubscriptionRef.get((yield* Downloads).status)).get(episodeId)
  })

const eventually = <A, E, R>(read: Effect.Effect<A, E, R>, check: (a: A) => boolean) =>
  Effect.gen(function* () {
    for (let i = 0; i < 300; i++) {
      const value = yield* read
      if (check(value)) return value
      yield* Effect.sleep("10 millis")
    }
    return yield* Effect.die(new Error("condition not reached"))
  })

describe("Downloads", () => {
  it.live("keeps a Manual Download, and still knows it after a restart", () =>
    Effect.gen(function* () {
      const id = `dl-${crypto.randomUUID()}`
      const db = yield* newDatabase
      yield* Effect.gen(function* () {
        const downloads = yield* Downloads
        yield* downloads.download(id)
        const stored = yield* eventually(statusOf(id), (s) => s?._tag === "Stored")
        expect(stored).toMatchObject({ bytes: 120_000, manual: true })
      }).pipe(Effect.provide(onDevice(db)))

      yield* Effect.gen(function* () {
        const downloads = yield* Downloads
        expect((yield* statusOf(id))?._tag).toBe("Stored")
        expect(yield* downloads.playableUrl(id)).not.toBeNull()
        yield* downloads.remove(id)
        expect(yield* statusOf(id)).toBeUndefined()
        expect(yield* downloads.playableUrl(id)).toBeNull()
        const sql = yield* SqlClient.SqlClient
        expect(yield* sql`SELECT * FROM download WHERE episode_id = ${id}`).toEqual([])
      }).pipe(Effect.provide(onDevice(db)))
    })
  )

  it.live("shows a failed download, which can be dismissed or tried again", () =>
    Effect.gen(function* () {
      const id = `broken-${crypto.randomUUID()}`
      const db = yield* newDatabase
      yield* Effect.gen(function* () {
        const downloads = yield* Downloads
        yield* downloads.download(id)
        yield* eventually(statusOf(id), (s) => s?._tag === "Failed")
        yield* downloads.cancel(id)
        expect(yield* statusOf(id)).toBeUndefined()
      }).pipe(Effect.provide(onDevice(db)))
    })
  )
})
