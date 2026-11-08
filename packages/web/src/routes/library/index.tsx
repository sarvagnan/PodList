import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Operation } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { ChevronRight, Plus, Settings } from "lucide-react"
import type * as React from "react"
import { useEffect, useRef, useState } from "react"
import { type SubscriptionSummary, subscriptionsAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady } from "../../app/hooks.ts"
import { deviceIdAtom, recordAtom } from "../../app/runtime.ts"
import { useConfirm } from "../../components/feedback/useConfirm.ts"
import { useCopyText } from "../../components/feedback/useCopyLink.ts"
import { AddPodcastSheet } from "../../components/library/AddPodcastSheet.tsx"
import {
  LibraryBulkBar,
  LibraryTable,
  type Mode,
  ruleOptions,
  sortParam
} from "../../components/library/LibraryTable.tsx"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { type RowCommand, RowMenu } from "../../components/lists/RowMenu.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { ruleNames } from "../../lib/downloadRules.ts"
import { librarySort } from "../../lib/remembered.ts"
import { useMinWidth, useWidthInRem } from "../../lib/useWide.ts"

// The Library (docs/design/ui-layout.md › Library and Subscriptions): every Subscription,
// each opening its settings and Episodes; Add finds podcasts, takes a feed address or an
// OPML file. Grouping by Download Rule arrives with Download Rules (pod-g1v.5).

/** The Download Rules, as a row's menu offers them. */
const rules: ReadonlyArray<readonly [Mode, string]> = [
  ["allNew", ruleNames.allNew],
  ["onEntry", ruleNames.onEntry],
  ["never", ruleNames.never]
]
const decodeChange = Schema.decodeUnknownSync(Operation.Change)
/** A plain left click; modified clicks keep their browser meaning. */
const plainClick = (event: React.MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

export const Route = createFileRoute("/library/")({
  component: LibraryScreen,
  // ?add=true opens Add podcasts (the Mac app's File › Add Podcasts).
  validateSearch: (search: Record<string, unknown>): { add?: boolean; sort?: string } => {
    const sort = sortParam.parse(search.sort)
    return {
      ...(search.add === true || search.add === "true" ? { add: true } : {}),
      ...(sort ? { sort: sortParam.format(sort) } : {})
    }
  }
})

function LibraryScreen() {
  const result = useAtomValue(subscriptionsAtom)
  const subscriptions = AsyncResult.getOrElse(result, () => [])
  const ready = useLibraryReady()
  const [adding, setAdding] = useState(false)
  // ?add=true (File › Add Podcasts in the Mac app) opens the sheet once, then leaves the
  // URL so a reload doesn't open it again.
  const { add: addFromUrl, sort: sortFromUrl } = Route.useSearch()
  const sort = sortParam.parse(sortFromUrl) ?? { key: "title" as const, ascending: true }
  const navigate = Route.useNavigate()
  // The sort is remembered on this Device (DATA-06): coming back without one in the address
  // (the sidebar, a tab, ⌘3) puts the last one back, in the address too.
  useEffect(() => {
    if (sortFromUrl !== undefined) {
      librarySort.set(sortFromUrl)
      return
    }
    const last = sortParam.parse(librarySort.get() ?? undefined)
    if (last)
      void navigate({
        search: (rest) => ({ ...rest, sort: sortParam.format(last) }),
        replace: true
      })
  }, [sortFromUrl, navigate])
  useEffect(() => {
    if (!addFromUrl) return
    // Clean the URL first: the sheet's Back step must not lead back to ?add=true.
    void navigate({
      search: ({ add: _, ...rest }) => rest,
      replace: true
    }).then(() => setAdding(true))
  }, [addFromUrl, navigate])
  const state = useAppState()
  const deviceId = AsyncResult.getOrElse(useAtomValue(deviceIdAtom), () => "")
  const ruleOf = (subscriptionId: string) => {
    const rule = state?.downloadRules.find(
      (r) => r.subscriptionId === subscriptionId && r.deviceId === deviceId
    )
    return { mode: rule?.mode ?? ("never" as Mode), keepAtMost: rule?.keepAtMost ?? null }
  }
  const modeOf = (subscriptionId: string) => ruleOf(subscriptionId).mode
  const record = useAtomSet(recordAtom)
  const confirm = useConfirm()
  const ruleChange = (subscriptionId: string, mode: Mode, keepAtMost: number | null) =>
    decodeChange({
      _tag: "SetDownloadRule",
      rule: {
        subscriptionId,
        deviceId,
        mode,
        // Every new Episode keeps what the Subscription's screen last set.
        keepAtMost: mode === "allNew" ? keepAtMost : null
      }
    })
  /** Sets the rule for these podcasts; more than one at once is one step, with Undo. */
  const setRules = (subscriptionIds: ReadonlyArray<string>, mode: Mode) => {
    const before = subscriptionIds.map((id) => ({ id, ...ruleOf(id) }))
    const apply = () => {
      for (const { id, keepAtMost } of before) record(ruleChange(id, mode, keepAtMost))
    }
    apply()
    if (subscriptionIds.length < 2) return
    const label = ruleOptions.find(([m]) => m === mode)?.[1] ?? mode
    const step = {
      message: `Downloads on this Device set to “${label}” for ${subscriptionIds.length} podcasts`,
      undo: before.map((b) => ruleChange(b.id, b.mode, b.keepAtMost))
    }
    confirm(step, async () => {
      apply()
      return step
    })
  }
  const copy = useCopyText()
  // The table where its columns and a readable name fit at the text's size (in rem: the
  // fixed columns are 26.5rem, a name wants 14rem, the extras 13rem more); else the list.
  const contentRef = useRef<HTMLDivElement>(null)
  const contentRem = useWidthInRem(contentRef)
  const wide = useMinWidth("64rem") && contentRem >= 44
  // Ticked rows of the desktop table; only podcasts still in the Library count.
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set())
  const chosen = wide ? subscriptions.filter((s) => ticked.has(s.id)).map((s) => s.id) : []
  // Esc clears the ticks, as in a View.
  const anyTicked = chosen.length > 0
  useEffect(() => {
    if (!anyTicked) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      if (document.querySelector('[data-sheet], [role="alertdialog"], [role="menu"]')) return
      setTicked(new Set())
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [anyTicked])
  const commandsFor = (s: SubscriptionSummary): ReadonlyArray<RowCommand> => [
    {
      label: "Open",
      run: () => void navigate({ to: "/library/$subscriptionId", params: { subscriptionId: s.id } })
    },
    { separator: true },
    ...rules.map(([ruleMode, label]) => ({
      label,
      checked: modeOf(s.id) === ruleMode,
      run: () => setRules([s.id], ruleMode)
    })),
    { separator: true },
    { label: "Copy feed address", run: () => void copy(() => s.feedUrl, "Feed address") }
  ]
  const groups = (
    [
      ["allNew", ruleNames.allNew],
      ["onEntry", ruleNames.onEntry],
      ["never", ruleNames.never]
    ] as const
  ).map(([mode, title]) => ({
    mode,
    title,
    items: subscriptions.filter((s) => modeOf(s.id) === mode)
  }))
  const add = (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-row font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
    >
      <Plus aria-hidden="true" className="size-4" />
      Add podcasts
    </button>
  )
  return (
    // Measured for the table-or-list choice (and the table's extra columns).
    <div ref={contentRef} className="max-w-[960px]">
      <PageHeader
        narrow
        title="Library"
        {...(subscriptions.length > 0
          ? {
              subtitle: `${subscriptions.length} ${subscriptions.length === 1 ? "Subscription" : "Subscriptions"}${wide ? " · downloads and settings for this Device" : ""}`
            }
          : {})}
        actions={
          chosen.length > 0 ? (
            <LibraryBulkBar
              chosen={chosen}
              setRules={setRules}
              onClear={() => setTicked(new Set())}
            />
          ) : (
            <div className="flex items-center gap-2">
              {/* The phone has no sidebar: Settings lives here. */}
              <Link
                to="/settings"
                aria-label="Settings"
                className="grid size-11 place-items-center rounded-full bg-secondary hover:bg-input active:bg-input/70 md:hidden"
              >
                <Settings aria-hidden="true" className="size-5" />
              </Link>
              {add}
            </div>
          )
        }
      />
      {AsyncResult.isInitial(result) || (subscriptions.length === 0 && !ready) ? (
        <LoadingRows label="Loading your Library" />
      ) : subscriptions.length === 0 ? (
        <EmptyState title="No Subscriptions yet">
          Add podcasts by name, by feed address, or from another app’s OPML file. Their Episodes
          then appear in your Views.
        </EmptyState>
      ) : wide && state !== null ? (
        <LibraryTable
          subscriptions={subscriptions}
          ruleOf={ruleOf}
          defaultSpeed={state.playbackSettings.speed}
          setRules={setRules}
          commandsFor={commandsFor}
          ticked={ticked}
          setTicked={setTicked}
          showExtras={contentRem >= 57}
          sort={sort}
          setSort={(next) =>
            void navigate({
              search: ({ sort: _, ...rest }) => {
                const plain = next.key === "title" && next.ascending
                // A–Z is the default: forgotten, so it stays the default next time.
                if (plain) librarySort.set(null)
                return plain ? rest : { ...rest, sort: sortParam.format(next) }
              },
              replace: true
            })
          }
        />
      ) : (
        // Grouped by what this Device stores for each podcast (design C).
        <div className="space-y-5 px-3 md:px-6">
          {groups.map(({ mode, title, items }) =>
            items.length === 0 ? null : (
              <section key={mode} aria-labelledby={`group-${mode}`}>
                <h2
                  id={`group-${mode}`}
                  className="px-2 pb-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
                >
                  {title} · {items.length}
                </h2>
                <ul>
                  {items.map((s) => (
                    <RowMenu
                      key={s.id}
                      commands={commandsFor(s)}
                      link={`/library/${s.id}`}
                      render={
                        // biome-ignore lint/a11y/useKeyWithClickEvents: the title link is the keyboard way in; this only widens the mouse target.
                        <li
                          onClick={(event: React.MouseEvent) => {
                            if (
                              !plainClick(event) ||
                              !window.matchMedia("(min-width: 64rem)").matches
                            )
                              return
                            if ((event.target as Element).closest("a, button")) return
                            if (window.getSelection()?.isCollapsed === false) return
                            void navigate({
                              to: "/library/$subscriptionId",
                              params: { subscriptionId: s.id }
                            })
                          }}
                          className="relative flex min-h-16 items-center gap-3 border-b px-2 py-2.5 last:border-b-0 hover:bg-secondary/60 data-[popup-open]:bg-secondary lg:cursor-pointer"
                        />
                      }
                    >
                      <Artwork url={s.artworkUrl} name={s.title} size={48} />
                      <span className="min-w-0 flex-1">
                        {/* The whole row on the phone; on desktop only the title is the link,
                            so the rest keeps the row's own menu (BROWSER-06). */}
                        <Link
                          to="/library/$subscriptionId"
                          params={{ subscriptionId: s.id }}
                          className="block truncate text-row font-medium hover:underline max-lg:after:absolute max-lg:after:inset-0 max-lg:after:rounded-lg max-lg:after:content-['']"
                        >
                          {s.title}
                        </Link>
                        {/* The count shares the second line, so a long name keeps the row's
                            width at large text sizes. */}
                        <span className="mt-0.5 block truncate text-small text-muted-foreground">
                          {[s.author, `${s.unplayed} unplayed`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                    </RowMenu>
                  ))}
                </ul>
              </section>
            )
          )}
        </div>
      )}
      {adding && <AddPodcastSheet open={adding} onOpenChange={setAdding} />}
    </div>
  )
}
