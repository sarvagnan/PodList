import { Context, Deferred, Effect, Layer, SubscriptionRef } from "effect"

// Single-tab ownership of the local database (Q52, ADR 0005). The OPFS access-handle
// VFS gives one tab exclusive use, and a second tab would otherwise hang at open.
// The owning tab holds a Web Lock; another tab sees "elsewhere" and can take over
// ("Use here"), which tells the previous owner it has lost the database.

export type Ownership = "unknown" | "owner" | "elsewhere"

const lockName = "podlist-local-database"

export class TabLock extends Context.Service<
  TabLock,
  {
    readonly ownership: SubscriptionRef.SubscriptionRef<Ownership>
    /** Takes ownership if no other tab has it; with `takeOver`, takes it regardless. */
    readonly claim: (options: { readonly takeOver: boolean }) => Effect.Effect<boolean>
    /** Completes when this tab, having owned the database, loses it to another tab. */
    readonly lost: Effect.Effect<void>
  }
>()("@podlist/web/TabLock") {
  static readonly layerWeb = Layer.effect(
    TabLock,
    Effect.gen(function* () {
      const ownership = yield* SubscriptionRef.make<Ownership>("unknown")
      let lost = yield* Deferred.make<void>()
      let release: (() => void) | undefined
      yield* Effect.addFinalizer(() => Effect.sync(() => release?.()))

      const claim = ({ takeOver }: { readonly takeOver: boolean }) =>
        Effect.gen(function* () {
          if ((yield* SubscriptionRef.get(ownership)) === "owner") return true
          const acquired = yield* Deferred.make<boolean>()
          const lostNow = yield* Deferred.make<void>()
          lost = lostNow
          navigator.locks
            .request(lockName, takeOver ? { steal: true } : { ifAvailable: true }, (lock) => {
              if (lock === null) {
                Deferred.doneUnsafe(acquired, Effect.succeed(false))
                return undefined
              }
              Deferred.doneUnsafe(acquired, Effect.succeed(true))
              // Hold the lock until released here, or stolen by another tab.
              return new Promise<void>((resolve) => {
                release = resolve
              })
            })
            .catch(() => {
              // Another tab took over with `steal`.
              release = undefined
              Effect.runFork(SubscriptionRef.set(ownership, "elsewhere"))
              Deferred.doneUnsafe(lostNow, Effect.void)
            })
          const owner = yield* Deferred.await(acquired)
          yield* SubscriptionRef.set(ownership, owner ? "owner" : "elsewhere")
          return owner
        })

      return TabLock.of({
        ownership,
        claim,
        lost: Effect.suspend(() => Deferred.await(lost))
      })
    })
  )
}
