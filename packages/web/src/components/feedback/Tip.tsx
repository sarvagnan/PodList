import { Tooltip } from "@base-ui/react/tooltip"
import type * as React from "react"

/**
 * A short label for an icon-only control, shown on hover and on keyboard focus (PTR-04).
 * The control keeps its own accessible name; this only shows it.
 */
export function Tip({
  label,
  children
}: {
  readonly label: string
  /** The control: a button element, whose props and ref the tooltip merges with its own. */
  readonly children: React.ReactElement
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6} className="z-50">
          <Tooltip.Popup
            role="tooltip"
            className="max-w-64 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md"
          >
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
