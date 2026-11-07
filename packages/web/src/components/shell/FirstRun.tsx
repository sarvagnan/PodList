import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { Check, X } from "lucide-react"
import { useEffect, useState } from "react"
import { subscriptionsAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady } from "../../app/hooks.ts"
import { recordAtom } from "../../app/runtime.ts"
import { firstRunDone, starterViewsMade } from "../../lib/remembered.ts"
import { blankView, saveViewChange } from "../../lib/viewEdit.ts"
import { AddPodcastSheet } from "../library/AddPodcastSheet.tsx"

// First run (docs/design/ui-layout.md › Library): starter Views, made once for a new
// Library, and a short checklist that can be skipped. It goes when the person has
// podcasts or hides it.

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

/** Opens the welcome checklist again (Settings, the Mac app's Help menu): at the top of
 * Views, with the steps already done ticked (START-02). */
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
  useEffect(() => {
    const reopen = () => {
      setHidden(false)
      setReopened(true)
    }
    document.addEventListener("podlist:getting-started", reopen)
    return () => document.removeEventListener("podlist:getting-started", reopen)
  }, [])
  const fresh = ready && subscriptions !== null && subscriptions.length === 0

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
  // Adding the first podcast ends first run, but the sheet stays open for more: it sits
  // outside the card, in one place, so it keeps what was typed.
  if (!(fresh || reopened) || hidden)
    return (
      <>
        {null}
        {sheet}
      </>
    )
  const hide = () => {
    firstRunDone.set()
    setHidden(true)
    setReopened(false)
  }
  const hasPodcasts = (subscriptions?.length ?? 0) > 0
  const hasEntries = state?.playlists.some((p) => p.entries.length > 0) ?? false
  // A step number, not an empty circle (which reads as a radio button); a tick once done.
  const step = (n: number, done: boolean, title: string, body: string) => (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
      >
        {done ? <Check className="size-4" /> : n}
      </span>
      <span>
        <span className="block text-row font-medium">
          {title}
          {done && <span className="sr-only"> (done)</span>}
        </span>
        <span className="block text-small text-muted-foreground">{body}</span>
      </span>
    </li>
  )
  return (
    <>
      <section
        aria-labelledby="first-run-title"
        className="mx-4 mt-4 mb-2 rounded-2xl border bg-card p-5 md:mx-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="first-run-title"
            tabIndex={-1}
            className="font-heading text-xl font-semibold outline-none"
          >
            Welcome to PodList
          </h2>
          <button
            type="button"
            onClick={hide}
            aria-label="Hide getting started"
            className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <ol className="mt-3 space-y-3">
          {step(
            1,
            hasPodcasts,
            "Add your podcasts",
            "Search by name, paste a feed address, or import an OPML file from another app."
          )}
          {step(
            2,
            !noViews,
            "Views find Episodes for you",
            "Three to start with: New this week, Under 30 minutes and Starred. Edit them or make your own."
          )}
          {step(
            3,
            hasEntries,
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
      {sheet}
    </>
  )
}
