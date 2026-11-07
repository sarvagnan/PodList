import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, Exit, Fiber, Layer, Scope, SubscriptionRef } from "effect"
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

  it.live("waits a moment for a page that is unloading to let the lock go", () =>
    Effect.gen(function* () {
      const leaving = yield* Scope.make()
      const first = yield* tab().pipe(Scope.provide(leaving))
      expect(yield* first.claim({ takeOver: false })).toBe(true)
      const second = yield* Effect.scoped(
        Effect.gen(function* () {
          const second = yield* tab()
          const claimed = yield* Effect.forkChild(second.claim({ takeOver: false }))
          // The first page finishes unloading after the second has asked.
          yield* Effect.sleep("300 millis")
          yield* Scope.close(leaving, Exit.void)
          return yield* Fiber.join(claimed)
        })
      )
      expect(second).toBe(true)
    })
  )
})
