import { useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { CloudOff } from "lucide-react"
import { useEffect, useState } from "react"
import { syncStatusAtom } from "../../app/runtime.ts"

/** Whether the browser thinks it is online, kept up to date. */
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])
  return online
}

/**
 * Says so when this Device can't reach the server, and that edits are kept: everything
 * still works offline (ADR 0003), so it is a quiet note, not an error.
 */
export function SyncIndicator({ variant }: { readonly variant: "phone" | "desktop" }) {
  const status = AsyncResult.getOrElse(useAtomValue(syncStatusAtom), () => null)
  const online = useOnline()
  const unreachable = !online || (status?.error ?? null) !== null
  if (!unreachable) return null
  const pending = status?.pending ?? 0
  const detail =
    pending > 0
      ? `${pending} ${pending === 1 ? "change" : "changes"} will sync when you’re back online`
      : "Changes will sync when you’re back online"
  if (variant === "desktop") {
    return (
      <p
        role="status"
        className="flex items-start gap-2 px-2.5 py-2 text-small text-muted-foreground"
      >
        <CloudOff aria-hidden="true" className="mt-px size-4 shrink-0" />
        <span>
          <span className="block font-semibold text-foreground">Offline</span>
          {detail}
        </span>
      </p>
    )
  }
  return (
    <p
      role="status"
      className="mx-2.5 mb-1.5 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-small text-muted-foreground"
    >
      <CloudOff aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">
        <span className="font-semibold text-foreground">Offline.</span> {detail}
      </span>
    </p>
  )
}
