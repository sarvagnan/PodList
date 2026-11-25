import { useEffect, useState } from "react"
import { desktopStandalone } from "../../lib/desktopSession.ts"
import { BringOverSettings } from "../library/DesktopBringOver.tsx"

const buttonClass =
  "rounded-full bg-secondary px-4 py-2 text-row font-medium hover:bg-input disabled:opacity-60"

export function DesktopConnectionSettings({ heading }: { readonly heading: string }) {
  const connection = window.podlistApp?.connection
  const [details, setDetails] = useState<{ address: string | null; managed: boolean } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  useEffect(() => {
    if (!connection) return
    let active = true
    void connection.settings().then(
      (value) => {
        if (active) setDetails(value)
      },
      () => {
        if (active)
          setProblem("Could not read your server connection. Reopen Settings to try again.")
      }
    )
    return () => {
      active = false
    }
  }, [connection])

  if (!connection) return null
  const change = (action: "changeServer" | "disconnect") => {
    setWorking(true)
    setProblem(null)
    void connection[action]().catch(() => {
      setProblem("Could not open the connection screen. Try again.")
      setWorking(false)
    })
  }
  return (
    <section aria-labelledby="server-connection-title">
      <h2 id="server-connection-title" className={heading}>
        Server Connection
      </h2>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        {details?.address && (
          <dl className="space-y-1 text-row">
            <dt className="font-medium">Server Address</dt>
            <dd className="break-all">{details.address}</dd>
          </dl>
        )}
        {desktopStandalone && (
          <div className="space-y-2">
            <p className="text-row">Standalone Device. Your Library is on this computer.</p>
            <button
              type="button"
              className={buttonClass}
              disabled={working}
              onClick={() => change("changeServer")}
            >
              Connect to a Server…
            </button>
          </div>
        )}
        {details && !details.managed && details.address && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={working}
              onClick={() => change("disconnect")}
            >
              Disconnect
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={working}
              onClick={() => change("changeServer")}
            >
              Change Server…
            </button>
          </div>
        )}
        <BringOverSettings />
        {problem && (
          <p role="alert" className="text-destructive">
            {problem}
          </p>
        )}
      </div>
    </section>
  )
}
