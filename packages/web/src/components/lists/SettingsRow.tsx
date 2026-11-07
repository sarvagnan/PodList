import type { ReactNode } from "react"

// One settings row for every settings card (Settings, a Subscription, Playlist settings):
// label and hint leading, the control trailing, stacking under the label when narrow.

/** A select or text field in a settings row or form. */
export const fieldControl =
  // A minimum height, not a fixed one, so large text never overflows it (WTYPE-02).
  "min-h-10 w-full min-w-0 rounded-lg border border-field bg-card px-2.5 py-1.5 text-row text-foreground"

export function SettingsRow({
  label,
  htmlFor,
  help,
  children
}: {
  readonly label: string
  readonly htmlFor: string
  readonly help?: string
  readonly children: ReactNode
}) {
  return (
    // Beside its label where the card has room, else full width under it: decided by the
    // card's own width (a narrow side column too), not the window's.
    <div className="@container border-b last:border-b-0">
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
        <label htmlFor={htmlFor} className="min-w-40 flex-1 text-row font-medium">
          {label}
          {help && (
            <span className="block text-small font-normal text-muted-foreground">{help}</span>
          )}
        </label>
        <div className="w-full @min-[28rem]:w-56">{children}</div>
      </div>
    </div>
  )
}
