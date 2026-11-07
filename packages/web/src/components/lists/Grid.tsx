import type * as React from "react"

// APG grid parts for long lists of rows with several controls each (lib/rowGrid.ts).
// Rows are flex layouts and may be virtualised, so these are ARIA roles on plain
// elements rather than a table. Focus goes to the one control inside each cell, not to
// the cell, which is the APG pattern for cells holding a single widget.

export function GridCell({
  block = false,
  className,
  children
}: {
  /** A div, for cells holding block content; a span otherwise. */
  readonly block?: boolean
  readonly className?: string
  readonly children: React.ReactNode
}) {
  return block ? (
    // biome-ignore lint/a11y/useFocusableInteractive lint/a11y/useSemanticElements: the control inside takes focus; a flex row, not a table.
    <div role="gridcell" className={className}>
      {children}
    </div>
  ) : (
    // biome-ignore lint/a11y/useFocusableInteractive lint/a11y/useSemanticElements: the control inside takes focus; a flex row, not a table.
    <span role="gridcell" className={className}>
      {children}
    </span>
  )
}
