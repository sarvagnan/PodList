import { useEffect, useId, useState } from "react"

export interface AutomationStatus {
  enabled: boolean
  error: string | null
  command: string
  configuration: string
}
export function AutomationSettings() {
  const api = window.podlistApp?.automation
  const id = useId()
  const [status, setStatus] = useState<AutomationStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void api
      ?.status()
      .then(setStatus)
      .catch((e: Error) => setError(e.message))
  }, [api])
  if (!api) return null
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
      >
        Automation
      </h2>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <label className="flex items-center gap-3 font-medium">
          <input
            type="checkbox"
            checked={status?.enabled ?? false}
            disabled={busy || !status}
            onChange={async (event) => {
              setBusy(true)
              setError(null)
              try {
                setStatus(await api.setEnabled(event.target.checked))
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
              } finally {
                setBusy(false)
              }
            }}
          />
          Enable MCP server
        </label>
        <p className="text-small text-muted-foreground">
          Any app running as this user on this computer can then read the Library and control
          playback
        </p>
        <p className="text-small text-muted-foreground">
          Off by default. This setting stays on this computer and is not synced. Open PodList before
          connecting an MCP client.
        </p>
        {(error || status?.error) && <p role="alert">{error || status?.error}</p>}
        {status?.enabled && (
          <>
            <p className="text-small font-medium">Bridge command</p>
            <pre className="overflow-auto whitespace-pre-wrap break-all text-small">
              {status.command}
            </pre>
            <p className="text-small font-medium">MCP client configuration</p>
            <pre className="overflow-auto whitespace-pre-wrap break-all text-small">
              {status.configuration}
            </pre>
            <button
              type="button"
              className="rounded-full bg-secondary px-4 py-2 font-medium"
              onClick={() => {
                void navigator.clipboard
                  .writeText(status.configuration)
                  .catch((e: Error) => setError(e.message))
              }}
            >
              Copy configuration
            </button>
          </>
        )}
      </div>
    </section>
  )
}
