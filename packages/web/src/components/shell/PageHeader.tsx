import { Link } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { type ReactNode, useEffect } from "react"

/** A screen title, with a back link on drill-down screens (phone). */
export function PageHeader({
  title,
  back,
  subtitle,
  actions,
  narrow = false,
  backOnDesktop = false,
  tabTitle,
  notice = true,
  stableActions = false
}: {
  readonly title: string
  readonly back?: { readonly to: string; readonly label: string }
  readonly subtitle?: string
  readonly actions?: ReactNode
  /** The screen's content stops at 960 px: so do the header's actions, above its edge. */
  readonly narrow?: boolean
  /** A screen opened from another (settings, a Subscription, Trash) keeps its way back on
   * desktop too; top-level lists rely on the sidebar. */
  readonly backOnDesktop?: boolean
  /** The browser tab's name, when the heading alone doesn't say which (BROWSER-03). */
  readonly tabTitle?: string
  /** False when the screen places the notice slot itself (a View: in its list column). */
  readonly notice?: boolean
  /** Reserve one scrollable action row while selection swaps its contents (APPEAR-11). */
  readonly stableActions?: boolean
}) {
  // The tab names the screen (BROWSER-03).
  useEffect(() => {
    document.title = `${tabTitle ?? title} · PodList`
  }, [title, tabTitle])
  return (
    <>
      <header
        className={`px-5 pt-4 pb-3 md:px-8 md:pt-8 short:md:pt-4 short:pb-2 ${narrow ? "max-w-[960px]" : ""}`}
      >
        {back && (
          <Link
            to={back.to}
            activeOptions={{ exact: true }}
            // Phone only: on desktop the way back is the title line's breadcrumb, below.
            className="-ml-2 mb-1 inline-flex h-11 items-center gap-0.5 pr-3 text-row font-medium text-primary md:hidden"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
            {back.label}
          </Link>
        )}
        {/* The actions swap (picker, bulk bar) without changing the header's height. */}
        <div
          className={`flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 ${stableActions ? "md:flex-col md:flex-nowrap md:items-stretch" : ""}`}
        >
          {/* Desktop: a screen opened from another names it before its own title
              ("Commute › Playlist settings"), so every heading sits at one height and the way
              back has room. */}
          <div
            className={`flex min-w-0 flex-wrap items-baseline gap-x-2 ${stableActions ? "md:min-h-11" : ""}`}
          >
            {back && backOnDesktop && (
              <Link
                to={back.to}
                activeOptions={{ exact: true }}
                className="hidden items-baseline gap-2 rounded font-heading text-3xl leading-tight font-semibold text-muted-foreground hover:text-foreground md:inline-flex"
              >
                {back.label}
                <ChevronRight aria-hidden="true" className="size-6 self-center" />
              </Link>
            )}
            <h1
              tabIndex={-1}
              className="font-heading outline-offset-4 text-title leading-tight font-semibold md:text-3xl"
            >
              {title}
            </h1>
          </div>
          {stableActions ? (
            <div className="min-w-0 md:flex md:h-[max(48px,2.75rem)] md:items-center md:overflow-x-auto">
              {actions}
            </div>
          ) : (
            actions
          )}
        </div>
        {subtitle && <p className="mt-1.5 text-small text-muted-foreground">{subtitle}</p>}
      </header>
      {/* Notices that belong under the screen's title, not above it (the welcome card). */}
      {notice && <div data-page-notice="" />}
    </>
  )
}
