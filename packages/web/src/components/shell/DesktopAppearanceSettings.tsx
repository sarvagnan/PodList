import { useEffect, useState } from "react"
import type { DesktopAppearance } from "../../lib/share.ts"
import { fieldControl, SettingsRow } from "../lists/SettingsRow.tsx"

export function DesktopAppearanceSettings({ heading }: { readonly heading: string }) {
  const connection = window.podlistApp?.appearance
  const [appearance, setAppearance] = useState<DesktopAppearance>("system")
  const [pending, setPending] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!connection) return
    let active = true
    void connection.get().then(
      (value) => {
        if (active) {
          setAppearance(value)
          setPending(false)
        }
      },
      () => {
        if (active) {
          setError(true)
          setPending(false)
        }
      }
    )
    return () => {
      active = false
    }
  }, [connection])
  if (!connection) return null

  return (
    <section aria-labelledby="appearance-title">
      <h2 id="appearance-title" className={heading}>
        Appearance
      </h2>
      <div className="rounded-xl border bg-card">
        <SettingsRow label="Appearance" htmlFor="desktop-appearance">
          <select
            id="desktop-appearance"
            className={fieldControl}
            value={appearance}
            disabled={pending}
            onChange={(event) => {
              const value = event.currentTarget.value
              if (value !== "system" && value !== "light" && value !== "dark") return
              setPending(true)
              setError(false)
              void connection
                .set(value)
                .then(
                  () => setAppearance(value),
                  () => setError(true)
                )
                .finally(() => setPending(false))
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </SettingsRow>
        {error && (
          <p role="alert" className="px-4 pb-2 text-small text-destructive">
            Could not save Appearance. Try again.
          </p>
        )}
      </div>
    </section>
  )
}
