import { Ids } from "@podlist/domain"
import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"

describe("server workspace", () => {
  it("imports the domain package through the workspace", () => {
    const id = Effect.runSync(Schema.decodeUnknownEffect(Ids.EpisodeId)("ep-1"))
    expect(id).toBe("ep-1")
  })
})
