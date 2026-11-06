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
  readonly icon: ReactNode
  readonly title: string
  readonly badge?: ReactNode
  readonly lines: ReadonlyArray<string>
  readonly trailing?: string
}) {
  return (
    <Link
      {...link}
      className="flex min-h-16 items-center gap-3 border-b px-2 py-3 text-foreground last:border-b-0 hover:bg-secondary/60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-base font-medium">{title}</span>
          {badge}
        </span>
        {lines.map((line) => (
          <span key={line} className="mt-0.5 block truncate text-xs text-muted-foreground">
            {line}
          </span>
        ))}
      </span>
      {trailing !== undefined && (
        <span className="text-[13px] text-muted-foreground">{trailing}</span>
      )}
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

export function PlayingBadge() {
  return (
    <span className="rounded-md bg-positive-tint px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-positive">
      PLAYING
    </span>
  )
}

export function EmptyState({
  title,
  children
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <div className="mx-5 rounded-2xl border border-dashed px-5 py-8 text-center md:mx-8">
      <p className="font-medium">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
