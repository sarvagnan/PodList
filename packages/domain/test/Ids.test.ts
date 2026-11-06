import { describe, expect, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Ids } from "../src/index.ts"

describe("Ids", () => {
  it.effect("decodes a branded EpisodeId", () =>
    Effect.gen(function* () {
      const id = yield* Schema.decodeUnknownEffect(Ids.EpisodeId)("ep-1")
      expect(id).toBe("ep-1")
    })
  )
})
