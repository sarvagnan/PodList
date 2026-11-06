import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { DownloadStore } from "./DownloadStore.ts"

describe("DownloadStore (OPFS)", () => {
  it.effect("saves, lists, plays from and removes a download", () =>
    Effect.gen(function* () {
      const store = yield* DownloadStore
      const bytes = new Uint8Array(200_000).map((_, i) => i % 251)
      const source = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }))
      const progress: Array<number> = []

      const saved = yield* store.save("ep/1", source, (received) => progress.push(received))
      expect(saved).toEqual({ episodeId: "ep/1", bytes: 200_000 })
      expect(progress.at(-1)).toBe(200_000)
      expect(yield* store.has("ep/1")).toBe(true)
      expect(yield* store.list).toContainEqual({ episodeId: "ep/1", bytes: 200_000 })

      const url = yield* store.playableUrl("ep/1")
      const response = yield* Effect.promise(() => fetch(url ?? ""))
      // Typed, or Chrome's media player stalls on a file from OPFS.
      expect(response.headers.get("content-type")).toBe("audio/mpeg")
      const roundTrip = new Uint8Array(yield* Effect.promise(() => response.arrayBuffer()))
      expect(roundTrip).toEqual(bytes)

      yield* store.remove("ep/1")
      expect(yield* store.has("ep/1")).toBe(false)
      expect(yield* store.playableUrl("ep/1")).toBeNull()
    }).pipe(Effect.provide(DownloadStore.layerWeb))
  )

  it.effect("keeps nothing when a download fails", () =>
    Effect.gen(function* () {
      const store = yield* DownloadStore
      const error = yield* store.save("ep/2", "http://127.0.0.1:9/nothing-here").pipe(Effect.flip)
      expect(error._tag).toBe("DownloadError")
      expect(yield* store.has("ep/2")).toBe(false)
    }).pipe(Effect.provide(DownloadStore.layerWeb))
  )
})
