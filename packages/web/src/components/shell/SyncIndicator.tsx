import { useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { CloudOff } from "lucide-react"
import { syncStatusAtom } from "../../app/runtime.ts"
import { serverUnavailable } from "../../lib/connectionMessage.ts"
import { useOnline } from "../../lib/useOnline.ts"

/**
 * Says so when this Device can't reach the server, and that edits are kept: edits
 * still work offline (ADR 0003), so it is a quiet note, not an error.
 */
export function SyncIndicator({ variant }: { readonly variant: "phone" | "desktop" }) {
  const status = AsyncResult.getOrElse(useAtomValue(syncStatusAtom), () => null)
  const online = useOnline()
  const unreachable = !online || (status?.error ?? null) !== null
  if (!unreachable) return null
  const pending = status?.pending ?? 0
  const title = online ? serverUnavailable : "Offline"
  const detail = `${pending > 0 ? `${pending} ${pending === 1 ? "change is" : "changes are"} kept. ` : "Edits are kept. "}They’ll sync when your server is reachable. ${online ? "Episodes can stream directly or play from downloads." : "Downloaded Episodes still play."} Searching and adding podcasts need the server.`
  if (variant === "desktop") {
    return (
      <p
        role="status"
        className="flex items-start gap-2 px-2.5 py-2 text-small text-muted-foreground"
      >
        <CloudOff aria-hidden="true" className="mt-px size-4 shrink-0" />
        <span>
          <span className="block font-semibold text-foreground">{title}</span>
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
      <span className="min-w-0">
        <span className="font-semibold text-foreground">{title}</span> {detail}
      </span>
    </p>
  )
}
