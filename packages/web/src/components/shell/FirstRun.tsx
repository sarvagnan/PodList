import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useRouterState } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { subscriptionsAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady } from "../../app/hooks.ts"
import { recordAtom } from "../../app/runtime.ts"
import { focusAfterRemoval } from "../../lib/focusAfterRemoval.ts"
import { firstRunDone, starterViewsMade } from "../../lib/remembered.ts"
import { useMinWidth } from "../../lib/useWide.ts"
import { blankView, saveViewChange } from "../../lib/viewEdit.ts"
import { AddPodcastSheet } from "../library/AddPodcastSheet.tsx"

// First run: starter Views, made once for a new Library, and a skippable introduction.
// See docs/design/product-behaviour.md › First run.

const starterViews = [
  {
    ...blankView("starter-new-this-week", "New this week"),
    filter: { published: { _tag: "LastDays", days: 7 }, played: "unplayed" }
  },
  {
    ...blankView("starter-under-30", "Under 30 minutes"),
    filter: { played: "unplayed", maxDuration: 30 * 60 },
    sort: "durationAsc" as const
  },
  { ...blankView("starter-starred", "Starred"), filter: { starred: true } }
]

/** Reopens the introduction on Views until the person dismisses it. */
export const showGettingStarted = (navigate: (to: string) => Promise<unknown>) => {
  firstRunDone.clear()
  void navigate("/views").then(() => {
    document.dispatchEvent(new Event("podlist:getting-started"))
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("#first-run-title")?.focus({ preventScroll: true })
    )
  })
}

export function FirstRun() {
  const state = useAppState()
  const ready = useLibraryReady()
  const subscriptionsResult = useAtomValue(subscriptionsAtom)
  // Not while the list is re-reading after a sync: it may be about to fill (APPEAR-11).
  const subscriptions = AsyncResult.isWaiting(subscriptionsResult)
    ? null
    : AsyncResult.getOrElse(subscriptionsResult, () => null)
  const record = useAtomSet(recordAtom)
  const [hidden, setHidden] = useState(firstRunDone.get)
  const [reopened, setReopened] = useState(false)
  const [adding, setAdding] = useState(false)
  // Wide clients open the first View; narrow clients open the Views overview.
  const wide = useMinWidth("44rem")
  const path = useRouterState({ select: (r) => r.location.pathname })
  const first = state?.views[0]?.id
  const overview = path === "/views" || path === "/views/"
  const onLanding =
    overview || (wide && first !== undefined && path === `/views/${encodeURIComponent(first)}`)
  // The current screen's notice slot (under its title), followed as screens come and go.
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const main = document.querySelector("main")
    if (main === null) return
    const find = () =>
      setSlot((current) =>
        current?.isConnected ? current : main.querySelector<HTMLElement>("[data-page-notice]")
      )
    find()
    const observer = new MutationObserver(find)
    observer.observe(main, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const reopen = () => {
      setHidden(false)
      setReopened(true)
    }
    document.addEventListener("podlist:getting-started", reopen)
    return () => document.removeEventListener("podlist:getting-started", reopen)
  }, [])
  const fresh = ready && state !== null && subscriptions !== null && subscriptions.length === 0
  // Retain the last loaded decision during re-reads, and while Add holds its input.
  const [automatic, setAutomatic] = useState(false)
  const nextAutomatic =
    ready && state !== null && subscriptions !== null ? fresh || (adding && automatic) : automatic
  if (nextAutomatic !== automatic) setAutomatic(nextAutomatic)

  // A new Library starts with Views to find Episodes in (decided 7 Nov 2026).
  const noViews = state !== null && state.views.length === 0
  useEffect(() => {
    if (fresh && noViews && !firstRunDone.get() && !starterViewsMade.get()) {
      starterViewsMade.set()
      for (const view of starterViews) {
        record(saveViewChange(view as unknown as Parameters<typeof saveViewChange>[0]))
      }
    }
  }, [fresh, noViews, record])

  const sheet = adding && <AddPodcastSheet open={adding} onOpenChange={setAdding} />
  // Keep the Add sheet mounted independently of the card, including when skipped.
  if (!(automatic || reopened) || hidden || !onLanding)
    return (
      <>
        {null}
        {sheet}
      </>
    )
  const hide = (event?: { readonly currentTarget: HTMLElement }) => {
    // The card goes: focus to the screen's heading, not the page (WKEY-03).
    if (event) focusAfterRemoval(event.currentTarget)
    firstRunDone.set()
    setHidden(true)
    setReopened(false)
  }
  const point = (n: number, title: string, body: string) => (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground"
      >
        {n}
      </span>
      <span>
        <span className="block text-row font-medium">{title}</span>
        <span className="block text-small text-muted-foreground">{body}</span>
      </span>
    </li>
  )
  const card = (
    <section
      aria-labelledby="first-run-title"
      className="mx-4 mt-4 mb-2 rounded-2xl border bg-card p-5 md:mx-8 md:max-w-[640px]"
    >
      <div className="flex items-start justify-between gap-4">
        <h2
          id="first-run-title"
          tabIndex={-1}
          className="font-heading text-xl font-semibold outline-none"
        >
          Welcome to PodList
        </h2>
        {/* One way to dismiss it: Skip for now (or Done), below. */}
      </div>
      <ol className="mt-3 space-y-3">
        {point(
          1,
          "Add your podcasts",
          "Search by name, paste a feed address, or import an OPML file from another app."
        )}
        {point(
          2,
          "Views find Episodes for you",
          "Three to start with: New this week, Under 30 minutes and Starred. Edit them or make your own."
        )}
        {point(
          3,
          "Playlists hold what you’ll listen to",
          "Use Next or Last on an Episode; the Default Playlist is ready."
        )}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-10 rounded-full bg-primary px-4 text-row font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Add podcasts
        </button>
        <button
          type="button"
          onClick={hide}
          className="h-10 rounded-full px-4 text-row font-medium hover:bg-secondary"
        >
          {reopened ? "Done" : "Skip for now"}
        </button>
      </div>
    </section>
  )
  // Under the screen's title (PageHeader's notice slot), so the heading stays first.
  return (
    <>
      {slot ? createPortal(card, slot) : card}
      {sheet}
    </>
  )
}
