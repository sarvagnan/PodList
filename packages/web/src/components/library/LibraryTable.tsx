import { Link } from "@tanstack/react-router"
import { ArrowDown, ArrowUp, Settings, X } from "lucide-react"
import { useId, useState } from "react"
import type { SubscriptionSummary } from "../../app/data.ts"
import { ruleNames } from "../../lib/downloadRules.ts"
import { Tip } from "../feedback/Tip.tsx"
import { type RowCommand, RowMenu } from "../lists/RowMenu.tsx"
import { Artwork } from "../shell/Artwork.tsx"

// The Library on a wide screen (docs/design/ui-layout.md › Library, design C): a table with
// each podcast's Download Rule on this Device in its row, and ticked rows changed at once.

export type Mode = "never" | "onEntry" | "allNew"
export type SortKey = "title" | "unplayed" | "rule"
export interface LibrarySort {
  readonly key: SortKey
  readonly ascending: boolean
}
/** The URL's form of a sort ("unplayed-desc"); A–Z by name is the default, left out. */
export const sortParam = {
  parse: (value: unknown): LibrarySort | undefined => {
    const [key, direction] = typeof value === "string" ? value.split("-") : []
    return (key === "title" || key === "unplayed" || key === "rule") &&
      (direction === "asc" || direction === "desc")
      ? { key, ascending: direction === "asc" }
      : undefined
  },
  format: (sort: LibrarySort) => `${sort.key}-${sort.ascending ? "asc" : "desc"}`
}
const byName = (a: SubscriptionSummary, b: SubscriptionSummary) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base" })

/** The Download Rules as a select offers them. */
export const ruleOptions: ReadonlyArray<readonly [Mode, string]> = [
  ["never", ruleNames.never],
  ["onEntry", ruleNames.onEntry],
  ["allNew", ruleNames.allNew]
]

const select =
  "min-h-9 w-full min-w-0 rounded-lg border border-field bg-card px-2 py-1 text-row text-foreground"

/** Selected podcasts' Download Rule, changed at once: in the header, where Views keep theirs. */
export function LibraryBulkBar({
  chosen,
  setRules,
  onClear
}: {
  readonly chosen: ReadonlyArray<string>
  readonly setRules: (subscriptionIds: ReadonlyArray<string>, mode: Mode) => void
  readonly onClear: () => void
}) {
  const [bulkMode, setBulkMode] = useState<Mode>("onEntry")
  // The same pill as a View's bulk bar (components/episodes/BulkBar.tsx).
  return (
    <section
      aria-label={`${chosen.length} ${chosen.length === 1 ? "podcast" : "podcasts"} selected`}
      className="flex flex-wrap items-center gap-2 rounded-full border bg-card py-1 pr-1 pl-4 shadow-sm"
    >
      <span className="text-row font-semibold">{chosen.length} selected</span>
      <label className="flex items-center gap-2 text-small text-muted-foreground">
        Downloads
        <select
          value={bulkMode}
          onChange={(event) => setBulkMode(event.target.value as Mode)}
          className={`${select} w-auto`}
        >
          {ruleOptions.map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => {
          setRules(chosen, bulkMode)
          onClear()
        }}
        className="h-9 rounded-full bg-primary px-4 text-row font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
      >
        Apply to {chosen.length}
      </button>
      <Tip label="Clear selection">
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClear}
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </Tip>
    </section>
  )
}

export function LibraryTable({
  subscriptions,
  ruleOf,
  defaultSpeed,
  setRules,
  commandsFor,
  ticked,
  setTicked,
  sort,
  setSort,
  showExtras
}: {
  readonly subscriptions: ReadonlyArray<SubscriptionSummary>
  readonly ruleOf: (subscriptionId: string) => {
    readonly mode: Mode
    readonly keepAtMost: number | null
  }
  readonly defaultSpeed: number
  /** Changes the rule for these podcasts, as one step. */
  readonly setRules: (subscriptionIds: ReadonlyArray<string>, mode: Mode) => void
  readonly commandsFor: (subscription: SubscriptionSummary) => ReadonlyArray<RowCommand>
  readonly ticked: ReadonlySet<string>
  readonly setTicked: (ticked: ReadonlySet<string>) => void
  /** Kept in the URL, so a reload or Back keeps the order (DATA-06). */
  readonly sort: LibrarySort
  readonly setSort: (sort: LibrarySort) => void
  /** Keep at most and Speed, when there's room for them beside the podcast's name. */
  readonly showExtras: boolean
}) {
  const id = useId()
  // Keep at most and Speed where there's room for them beside the podcast's name.
  const roomy = showExtras
  // Sorted by a column's header, A–Z by name until one is chosen.
  const rank: Record<Mode, number> = { allNew: 0, onEntry: 1, never: 2 }
  const sorted = [...subscriptions].sort((a, b) => {
    const order =
      sort.key === "unplayed"
        ? a.unplayed - b.unplayed
        : sort.key === "rule"
          ? rank[ruleOf(a.id).mode] - rank[ruleOf(b.id).mode]
          : byName(a, b)
    // Equal by the chosen column: A–Z by name.
    return (sort.ascending ? order : -order) || byName(a, b)
  })
  const header = (key: SortKey, label: string, className: string, end = false) => {
    const active = sort.key === key
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.ascending ? "ascending" : "descending") : undefined}
        className={className}
      >
        <button
          type="button"
          onClick={() => setSort({ key, ascending: active ? !sort.ascending : key !== "unplayed" })}
          className={`-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase hover:text-foreground ${end ? "flex-row-reverse" : ""} ${active ? "text-foreground" : ""}`}
        >
          {label}
          {active ? (
            sort.ascending ? (
              <ArrowUp aria-hidden="true" className="size-3.5" />
            ) : (
              <ArrowDown aria-hidden="true" className="size-3.5" />
            )
          ) : (
            <span aria-hidden="true" className="size-3.5" />
          )}
        </button>
      </th>
    )
  }
  const all = subscriptions.length > 0 && subscriptions.every((s) => ticked.has(s.id))
  const tick = (subscriptionId: string, on: boolean) => {
    const next = new Set(ticked)
    if (on) next.add(subscriptionId)
    else next.delete(subscriptionId)
    setTicked(next)
  }
  return (
    <div className="px-3 pb-8 md:px-6">
      {/* At very large text the table scrolls sideways in its own box, not the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] table-fixed border-collapse text-row">
          <colgroup>
            {/* In rem, so the columns grow with the text (WTYPE-02). */}
            <col className="w-[3rem]" />
            <col />
            <col className="w-[7rem]" />
            <col className="w-[13rem]" />
            {roomy && <col className="w-[8rem]" />}
            {roomy && <col className="w-[5rem]" />}
            <col className="w-[3.5rem]" />
          </colgroup>
          <thead>
            <tr className="border-b text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              <th scope="col" className="py-2 pl-2">
                <input
                  type="checkbox"
                  aria-label="Select every podcast"
                  checked={all}
                  // Some, not all: the box says so (mixed), as the platform's do (CTRL-02).
                  ref={(box) => {
                    if (box) box.indeterminate = !all && subscriptions.some((s) => ticked.has(s.id))
                  }}
                  onChange={(event) =>
                    setTicked(new Set(event.target.checked ? subscriptions.map((s) => s.id) : []))
                  }
                  // Native inputs otherwise sit on the text baseline above the row centre (WTYPE-04).
                  className="size-4 align-middle accent-primary"
                />
              </th>
              {header("title", "Podcast", "py-2")}
              {header("unplayed", "Unplayed", "py-2 text-right", true)}
              {header("rule", "Downloads", "py-2 pl-6")}
              {roomy && (
                <>
                  <th scope="col" className="py-2 pl-4">
                    Keep at most
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Speed
                  </th>
                </>
              )}
              <th scope="col" className="py-2">
                <span className="sr-only">Settings</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const rule = ruleOf(s.id)
              const on = ticked.has(s.id)
              return (
                <RowMenu
                  key={s.id}
                  commands={commandsFor(s)}
                  link={`/library/${s.id}`}
                  render={
                    <tr
                      className={`border-b data-[popup-open]:bg-secondary ${on ? "bg-accent/60" : "hover:bg-secondary/60"}`}
                    />
                  }
                >
                  <td className="py-2 pl-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${s.title}`}
                      checked={on}
                      onChange={(event) => tick(s.id, event.target.checked)}
                      // Native inputs otherwise sit on the text baseline above the row centre (WTYPE-04).
                      className="size-4 align-middle accent-primary"
                    />
                  </td>
                  <td className="py-2">
                    <span className="flex min-w-0 items-center gap-3">
                      <Artwork url={s.artworkUrl} name={s.title} size={40} />
                      <span className="min-w-0">
                        <Link
                          to="/library/$subscriptionId"
                          params={{ subscriptionId: s.id }}
                          className="block truncate font-medium hover:underline"
                        >
                          {s.title}
                        </Link>
                        <span className="block truncate text-small text-muted-foreground">
                          {s.customSettings === 0
                            ? "All defaults"
                            : `${s.customSettings} ${s.customSettings === 1 ? "custom setting" : "custom settings"}`}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{s.unplayed}</td>
                  <td className="py-2 pl-6">
                    <select
                      id={`${id}-${s.id}`}
                      aria-label={`Downloads for ${s.title}`}
                      value={rule.mode}
                      onChange={(event) => setRules([s.id], event.target.value as Mode)}
                      className={select}
                    >
                      {ruleOptions.map(([mode, label]) => (
                        <option key={mode} value={mode}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {roomy && (
                    <>
                      <td className="py-2 pl-4 text-muted-foreground">
                        {rule.mode !== "allNew"
                          ? "—"
                          : rule.keepAtMost === null
                            ? "No limit"
                            : `${rule.keepAtMost} Episodes`}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${s.speed === null ? "text-muted-foreground" : ""}`}
                      >
                        {s.speed ?? defaultSpeed}×
                      </td>
                    </>
                  )}
                  <td className="py-2 text-right">
                    <Tip label={`Settings for ${s.title}`}>
                      <Link
                        to="/library/$subscriptionId"
                        params={{ subscriptionId: s.id }}
                        aria-label={`Settings for ${s.title}`}
                        className="inline-grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Settings aria-hidden="true" className="size-[18px]" />
                      </Link>
                    </Tip>
                  </td>
                </RowMenu>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
