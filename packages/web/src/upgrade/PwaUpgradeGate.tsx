import { type ReactNode, useEffect, useState } from "react"
import { runPwaCarryOver } from "./PwaCarryOver.ts"

// Shared across StrictMode remounts. The Web Lock also serializes separate tabs.
let running: Promise<void> | undefined
const listeners = new Set<(pending: number) => void>()
let pendingCount: number | null = null

export function PwaUpgradeGate({ children }: { readonly children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(pendingCount)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry deliberately restarts the startup effect.
  useEffect(() => {
    let active = true
    let finished = false
    listeners.add(setPending)
    setError(null)
    running ??= runPwaCarryOver((count) => {
      pendingCount = count
      for (const listener of listeners) listener(count)
    }).finally(() => {
      running = undefined
    })
    void running.then(
      () => {
        finished = true
        if (active) setReady(true)
      },
      (cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause))
      }
    )
    const online = () => {
      if (!finished) setAttempt((value) => value + 1)
    }
    window.addEventListener("online", online)
    return () => {
      active = false
      listeners.delete(setPending)
      window.removeEventListener("online", online)
    }
  }, [attempt])

  if (ready) return <>{children}</>
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="font-heading text-2xl font-semibold">Opening PodList</h1>
        <p role="status" className="mt-3 text-muted-foreground">
          {error
            ? "Your saved changes have been kept. Retry to finish opening PodList."
            : pending === null
              ? "Checking for changes saved by the previous version…"
              : `Sending ${pending} changes saved by the previous version…`}
        </p>
        {error && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-6 h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </main>
  )
}
