import { Link, type LinkProps } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

/** A tappable row in a drill-down list (Views, Playlists): icon, text, trailing info, chevron. */
export function ListRow({
  link,
  icon,
  title,
  badge,
  lines,
  trailing
}: {
  readonly link: LinkProps
  /** Artwork or an icon; left out when it would only repeat on every row. */
  readonly icon?: ReactNode
  readonly title: string
  readonly badge?: ReactNode | undefined
  readonly lines: ReadonlyArray<string>
  readonly trailing?: string | undefined
}) {
  return (
    <Link
      {...link}
      className="flex min-h-16 items-center gap-3 border-b px-2 py-3 text-foreground last:border-b-0 hover:bg-secondary/60"
    >
      {icon !== undefined && icon}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-row font-medium">{title}</span>
          {badge}
        </span>
        {lines.map((line) => (
          <span key={line} className="mt-0.5 block truncate text-small text-muted-foreground">
            {line}
          </span>
        ))}
      </span>
      {trailing !== undefined && (
        <span className="text-small text-muted-foreground">{trailing}</span>
      )}
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/** The Active Playlist's state, in words as well as colour: "Playing" or "Paused". */
export function StatusBadge({ status }: { readonly status: "Playing" | "Paused" | "Active" }) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${status === "Playing" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}
    >
      {status}
    </span>
  )
}

/** Stands in for a list while it loads, so nothing claims to be empty before it knows. */
export function LoadingRows({ label }: { readonly label: string }) {
  return (
    <div role="status" aria-label={label} className="mx-5 space-y-3 py-2 md:mx-8">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-secondary" />
            <div className="h-2.5 w-1/3 rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  children,
  inPanel = false
}: {
  readonly title: string
  readonly children: ReactNode
  /** In a side panel: its own padding holds it, and less room above and below. */
  readonly inPanel?: boolean
}) {
  return (
    // Ends where the screen's 960 px content does, not at the window's edge.
    <div
      className={`h-fit self-start rounded-2xl border border-dashed px-5 text-center ${inPanel ? "py-6" : "mx-5 py-8 md:mx-8 md:max-w-[calc(960px-4rem)]"}`}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1.5 text-row text-muted-foreground">{children}</p>
    </div>
  )
}
