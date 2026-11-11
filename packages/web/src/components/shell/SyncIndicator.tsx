import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { CloudOff } from "lucide-react"
import { localClient } from "#client"
import { retrySyncAtom, syncStatusAtom } from "../../app/runtime.ts"
import { serverUnavailable } from "../../lib/connectionMessage.ts"
import { useOnline } from "../../lib/useOnline.ts"

export function SyncIndicator({ variant }: { readonly variant: "phone" | "desktop" }) {
  const status = AsyncResult.getOrElse(useAtomValue(syncStatusAtom), () => null)
  const retry = useAtomSet(retrySyncAtom)
  const online = useOnline()
  const unreachable = !online || (status?.error ?? null) !== null
  const pending = status?.pending ?? 0
  if (!unreachable && (localClient || pending === 0)) return null
  const title = unreachable ? (online ? serverUnavailable : "Offline") : "Saving changes…"
  const detail = localClient
    ? `${pending > 0 ? `${pending} ${pending === 1 ? "change is" : "changes are"} kept. ` : "Edits are kept. "}${pending === 1 ? "It’ll" : "They’ll"} sync when your server is reachable. ${online ? "Episodes can stream directly or play from downloads." : "Downloaded Episodes still play."} Searching and adding podcasts need the server.`
    : `${pending ? `${pending} ${pending === 1 ? "change is" : "changes are"} pending in this tab. Closing it drops unsent changes. ` : ""}${unreachable ? "New edits need a connection to your server." : ""}`
  return (
    <div
      role="status"
      className={
        variant === "desktop"
          ? "flex items-start gap-2 px-2.5 py-2 text-small text-muted-foreground"
          : "mx-2.5 mb-1.5 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-small text-muted-foreground"
      }
    >
      <CloudOff aria-hidden="true" className="mt-px size-4 shrink-0" />
      <div>
        <span className="block font-semibold text-foreground">{title}</span>
        {detail}
        {!localClient && (unreachable || pending > 0) && (
          <button
            type="button"
            onClick={() => retry()}
            className="ml-2 rounded px-2 py-1 font-semibold text-primary underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
