import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, Layer, SubscriptionRef } from "effect"
import { TabLock } from "./TabLock.ts"

// Two TabLock instances in one page stand in for two tabs: Web Locks are per origin.
const tab = () => Layer.build(TabLock.layerWeb).pipe(Effect.map((ctx) => Context.get(ctx, TabLock)))

describe("TabLock (Web Locks)", () => {
  it.effect("lets one tab own the database and another take over", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const first = yield* tab()
        const second = yield* tab()

        expect(yield* first.claim({ takeOver: false })).toBe(true)
        expect(yield* second.claim({ takeOver: false })).toBe(false)
        expect(yield* SubscriptionRef.get(second.ownership)).toBe("elsewhere")

        expect(yield* second.claim({ takeOver: true })).toBe(true)
        yield* first.lost.pipe(Effect.timeout("2 seconds"))
        expect(yield* SubscriptionRef.get(first.ownership)).toBe("elsewhere")
        expect(yield* SubscriptionRef.get(second.ownership)).toBe("owner")
      })
    )
  )
})
