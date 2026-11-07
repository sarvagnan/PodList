import { Protocol } from "@podlist/domain"
import { useEffect, useState } from "react"
import { inMacApp } from "../../lib/share.ts"

/**
 * Says so when this copy of PodList and the server speak different sync protocols, which
 * happens when the Mac app (a bundled copy) or a cached web app is older than the server,
 * or the server older than the app. Syncing waits until they match.
 */
export function VersionNotice() {
  const [server, setServer] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((health: { protocolVersion?: number } | null) => {
        if (!cancelled && typeof health?.protocolVersion === "number") {
          setServer(health.protocolVersion)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])
  if (server === null || server === Protocol.version) return null
  const appOlder = server > Protocol.version
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-accent px-4 py-2.5 text-row md:px-8"
    >
      <span className="min-w-0 flex-1">
        {appOlder
          ? inMacApp
            ? "Your server has a newer PodList. Update this app with pnpm desktop:install to keep syncing."
            : "A newer PodList is on your server. Reload to update."
          : "This PodList is newer than your server. Deploy the latest PodList to keep syncing."}
      </span>
      {appOlder && !inMacApp && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-9 rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Reload
        </button>
      )}
    </div>
  )
}
