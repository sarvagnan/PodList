import { Link } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import { type ReactNode, useEffect } from "react"

/** A screen title, with a back link on drill-down screens (phone). */
export function PageHeader({
  title,
  back,
  subtitle,
  actions
}: {
  readonly title: string
  readonly back?: { readonly to: string; readonly label: string }
  readonly subtitle?: string
  readonly actions?: ReactNode
}) {
  // The tab names the screen (BROWSER-03).
  useEffect(() => {
    document.title = `${title} · PodList`
  }, [title])
  return (
    <header className="px-5 pt-4 pb-3 md:px-8 md:pt-8">
      {back && (
        <Link
          to={back.to}
          activeOptions={{ exact: true }}
          className="-ml-2 mb-1 inline-flex h-11 items-center gap-0.5 pr-3 text-row font-medium text-primary md:hidden"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <h1
          tabIndex={-1}
          className="font-heading outline-offset-4 text-title leading-tight font-semibold md:text-3xl"
        >
          {title}
        </h1>
        {actions}
      </div>
      {subtitle && <p className="mt-1.5 text-small text-muted-foreground">{subtitle}</p>}
    </header>
  )
}
