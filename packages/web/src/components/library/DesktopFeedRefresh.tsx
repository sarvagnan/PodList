import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useEffect } from "react"
import { feedRefreshAtom, refreshFeedsAtom } from "../../app/feedRefresh.ts"

const buttonClass =
  "rounded-md px-2 py-1 text-row font-medium text-primary hover:bg-secondary disabled:opacity-60"

export function DesktopFeedRefreshSettings({ heading }: { readonly heading: string }) {
  const refresh = useAtomSet(refreshFeedsAtom)
  const running = useAtomValue(feedRefreshAtom).kind === "running"
  return (
    <section aria-labelledby="publisher-feeds-title">
      <h2 id="publisher-feeds-title" className={heading}>
        Publisher Feeds
      </h2>
      <div className="rounded-xl border bg-card p-3">
        <button
          type="button"
          className={buttonClass}
          disabled={running}
          onClick={() => refresh("start")}
        >
          Refresh Now
        </button>
      </div>
    </section>
  )
}

export function DesktopFeedRefreshStatus() {
  const status = useAtomValue(feedRefreshAtom)
  const refresh = useAtomSet(refreshFeedsAtom)
  const running = status.kind === "running"
  useEffect(() => {
    window.podlistApp?.setFeedRefreshMenu?.(running)
    const command = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      if (!running && event.detail === "refreshFeeds") refresh("start")
      if (running && event.detail === "cancelFeedRefresh") refresh("cancel")
    }
    document.addEventListener("podlist:command", command)
    return () => document.removeEventListener("podlist:command", command)
  }, [refresh, running])
  if (status.kind === "idle") return null
  const message =
    status.kind === "finished"
      ? status.message
      : status.checked === status.total
        ? "Refreshing feeds…"
        : `Checking feed ${status.checked + 1} of ${status.total}…`
  const error = status.kind === "finished" && status.error
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-1 md:px-8">
      <p
        role={error ? "alert" : "status"}
        className={`text-row ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {message}
      </p>
      {running && (
        <button type="button" className={buttonClass} onClick={() => refresh("cancel")}>
          Cancel Feed Refresh
        </button>
      )}
      {error && (
        <button type="button" className={buttonClass} onClick={() => refresh("start")}>
          Retry
        </button>
      )}
    </div>
  )
}
