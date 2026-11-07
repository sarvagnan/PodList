import { Effect, ManagedRuntime } from "effect"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { TabLock } from "../platform/TabLock.ts"

// Only one tab may own the local database (Q52). This gate claims it before the app's
// runtime is built; other tabs offer "Use here".

const tabRuntime = ManagedRuntime.make(TabLock.layerWeb)
const claim = (takeOver: boolean) =>
  tabRuntime.runPromise(
    Effect.gen(function* () {
      const lock = yield* TabLock
      const owner = yield* lock.claim({ takeOver })
      // Losing the database to another tab: start over as a tab that doesn't own it.
      if (owner)
        Effect.runFork(lock.lost.pipe(Effect.andThen(Effect.sync(() => location.reload()))))
      return owner
    })
  )

export function TabGate({ children }: { readonly children: ReactNode }) {
  const [owner, setOwner] = useState<boolean | null>(null)
  useEffect(() => {
    void claim(false).then(setOwner)
  }, [])
  const useHere = useCallback(() => void claim(true).then(setOwner), [])

  if (owner === null) return null
  if (owner) return <>{children}</>
  document.title = "Open in another tab · PodList"
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="font-heading text-2xl font-semibold">PodList is open in another tab</h1>
        <p className="mt-3 text-muted-foreground">
          Only one tab at a time can use your Library on this Device.
        </p>
        <button
          type="button"
          onClick={useHere}
          className="mt-6 h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground"
        >
          Use here
        </button>
      </div>
    </main>
  )
}
