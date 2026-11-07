import { Link } from "@tanstack/react-router"
import { SlidersHorizontal } from "lucide-react"
import { useId, useState } from "react"
import type { SubscriptionSummary } from "../../app/data.ts"
import { useMinWidth } from "../../lib/useWide.ts"
import { Tip } from "../feedback/Tip.tsx"
import { type RowCommand, RowMenu } from "../lists/RowMenu.tsx"
import { Artwork } from "../shell/Artwork.tsx"

// The Library on a wide screen (docs/design/ui-layout.md › Library, design C): a table with
// each podcast's Download Rule on this Device in its row, and ticked rows changed at once.

export type Mode = "never" | "onEntry" | "allNew"

/** The Download Rules as a select offers them. */
export const ruleOptions: ReadonlyArray<readonly [Mode, string]> = [
  ["never", "Stream"],
  ["onEntry", "Entries"],
  ["allNew", "Every new Episode"]
]

const select =
  "h-9 w-full min-w-0 rounded-lg border border-field bg-card px-2 text-row text-foreground"

/** Ticked podcasts' Download Rule, changed at once: in the header, where Views keep theirs. */
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
  return (
    <section aria-label="Change ticked podcasts" className="flex flex-wrap items-center gap-2">
      <span className="text-row font-semibold">{chosen.length} ticked</span>
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
        className="h-10 rounded-full bg-primary px-4 text-row font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
      >
        Apply to {chosen.length}
      </button>
      <button
        type="button"
        onClick={onClear}
        className="h-10 rounded-full px-3 text-row font-medium hover:bg-secondary active:bg-input"
      >
        Clear
      </button>
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
  setTicked
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
}) {
  const id = useId()
  // Keep at most and Speed where there's room for them beside the podcast's name.
  const roomy = useMinWidth("80rem")
  const all = subscriptions.length > 0 && subscriptions.every((s) => ticked.has(s.id))
  const tick = (subscriptionId: string, on: boolean) => {
    const next = new Set(ticked)
    if (on) next.add(subscriptionId)
    else next.delete(subscriptionId)
    setTicked(next)
  }
  return (
    <div className="max-w-[960px] px-3 pb-8 md:px-6">
      <table className="w-full table-fixed border-collapse text-row">
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-24" />
          <col className="w-52" />
          {roomy && <col className="w-32" />}
          {roomy && <col className="w-20" />}
          <col className="w-14" />
        </colgroup>
        <thead>
          <tr className="border-b text-left text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            <th scope="col" className="py-2 pl-2">
              <input
                type="checkbox"
                aria-label="Tick every podcast"
                checked={all}
                onChange={(event) =>
                  setTicked(new Set(event.target.checked ? subscriptions.map((s) => s.id) : []))
                }
                className="size-4 accent-primary"
              />
            </th>
            <th scope="col" className="py-2">
              Podcast
            </th>
            <th scope="col" className="py-2 text-right">
              Unplayed
            </th>
            <th scope="col" className="py-2 pl-6">
              Downloads
            </th>
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
          {subscriptions.map((s) => {
            const rule = ruleOf(s.id)
            const on = ticked.has(s.id)
            return (
              <RowMenu
                key={s.id}
                commands={commandsFor(s)}
                link={`/library/${s.id}`}
                render={
                  <tr className={`border-b ${on ? "bg-accent/60" : "hover:bg-secondary/60"}`} />
                }
              >
                <td className="py-2 pl-2">
                  <input
                    type="checkbox"
                    aria-label={`Tick ${s.title}`}
                    checked={on}
                    onChange={(event) => tick(s.id, event.target.checked)}
                    className="size-4 accent-primary"
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
                      <SlidersHorizontal aria-hidden="true" className="size-[18px]" />
                    </Link>
                  </Tip>
                </td>
              </RowMenu>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
