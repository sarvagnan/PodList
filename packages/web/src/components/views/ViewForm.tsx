import { useAtomSet, useAtomValue } from "@effect/atom-react"
import type { View } from "@podlist/domain"
import { AsyncResult } from "effect/reactivity"
import { Trash2 } from "lucide-react"
import { type ReactNode, useId, useState } from "react"
import { subscriptionsAtom } from "../../app/data.ts"
import { recordAtom } from "../../app/runtime.ts"
import { useDebounced } from "../../lib/useDebounced.ts"
import {
  type Filter,
  type PublishedChoice,
  publishedChoice,
  saveViewChange,
  type ViewData,
  viewData,
  withCondition,
  withPublished
} from "../../lib/viewEdit.ts"
import { useConfirm } from "../feedback/useConfirm.ts"
import { fieldControl } from "../lists/SettingsRow.tsx"

// The View editor's form (docs/design/ui-layout.md › View editor): every condition is a
// row, "Any" until changed, so the "all must match" rule is plain to see. Edits save as
// they are made; each is one step that Undo takes back.

const minutes = [10, 20, 30, 45, 60, 90, 120]
const limits = [10, 20, 50, 100]
const sorts: ReadonlyArray<readonly [View.ViewSort, string]> = [
  ["publishedDesc", "Newest first"],
  ["publishedAsc", "Oldest first"],
  ["durationAsc", "Shortest first"],
  ["durationDesc", "Longest first"]
]

const control = fieldControl

function Row({
  label,
  htmlFor,
  children
}: {
  readonly label: string
  readonly htmlFor?: string
  readonly children: ReactNode
}) {
  return (
    // The label column is in rem, so it grows with the text; with no room left, the field
    // goes under its label (WTYPE-02).
    <div className="flex min-h-14 flex-wrap items-start gap-x-3 gap-y-1 border-b px-3 py-2 last:border-b-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="w-[6rem] shrink-0 pt-2.5 text-row font-medium">
          {label}
        </label>
      ) : (
        <span className="w-[6rem] shrink-0 pt-2.5 text-row font-medium">{label}</span>
      )}
      <div className="min-w-[min(12rem,100%)] flex-1">{children}</div>
    </div>
  )
}

/** A saved View's form: each change is recorded at once, as one step Undo takes back. */
export function ViewForm({
  view,
  onDelete
}: {
  readonly view: View.View
  readonly onDelete: () => void
}) {
  const record = useAtomSet(recordAtom, { mode: "promise" })
  const confirm = useConfirm()
  const save = (next: ViewData) => {
    const before = viewData(view)
    if (JSON.stringify(before) === JSON.stringify(next)) return
    const message = `Edited “${next.name}”`
    const step = { message, undo: [saveViewChange(before)] }
    void record(saveViewChange(next))
    // An Undo you can see and tap, as every other edit has (DATA-04); a run of changes
    // made together is one step.
    confirm(
      step,
      async () => {
        await record(saveViewChange(next))
        return step
      },
      () => document.querySelector<HTMLElement>("[data-edit-heading], main h1"),
      `view:${view.id}`
    )
  }
  return <ViewFormFields data={viewData(view)} onChange={save} onDelete={onDelete} />
}

/**
 * The View form (docs/design/ui-layout.md, variant R): every condition always a row. For a
 * saved View (above), or an unsaved one: Search, which has its words in its own field and
 * no name until it is saved.
 */
export function ViewFormFields({
  data,
  onChange,
  onDelete,
  unsaved = false
}: {
  readonly data: ViewData
  readonly onChange: (next: ViewData) => void
  readonly onDelete?: () => void
  /** Search: no Name row, no Mentions row (its field is above), no Delete. */
  readonly unsaved?: boolean
}) {
  const subscriptions = AsyncResult.getOrElse(useAtomValue(subscriptionsAtom), () => [])
  const current = data
  const id = useId()
  const [name, setName] = useState(current.name)
  const [text, setText] = useState(current.filter.text ?? "")
  const [nameError, setNameError] = useState(false)
  // "Only these" or "All except" chosen before any podcast is ticked.
  const [podcastMode, setPodcastMode] = useState<"all" | "include" | "exclude">(
    current.filter.podcasts?.mode ?? "all"
  )

  const save = (next: ViewData) => {
    if (JSON.stringify(data) !== JSON.stringify(next)) onChange(next)
  }
  const setFilter = (filter: Filter) => save({ ...data, filter })

  const nameCommit = useDebounced((value) => {
    const trimmed = value.trim()
    setNameError(trimmed === "")
    if (trimmed !== "") save({ ...data, name: trimmed })
  })
  const textCommit = useDebounced((value) =>
    setFilter(withCondition(data.filter, "text", value.trim() || undefined))
  )

  const f = current.filter
  const podcastIds: ReadonlyArray<string> = f.podcasts?.subscriptionIds ?? []
  const togglePodcast = (subscriptionId: string, on: boolean) => {
    const ids = on
      ? [...podcastIds, subscriptionId]
      : podcastIds.filter((x) => x !== subscriptionId)
    const mode = podcastMode === "all" ? "include" : podcastMode
    setFilter(
      withCondition(
        f,
        "podcasts",
        ids.length === 0
          ? undefined
          : ({ mode, subscriptionIds: ids } as unknown as Filter["podcasts"])
      )
    )
  }
  const setMode = (mode: "all" | "include" | "exclude") => {
    setPodcastMode(mode)
    if (mode === "all") setFilter(withCondition(f, "podcasts", undefined))
    else if (podcastIds.length > 0) {
      setFilter(
        withCondition(f, "podcasts", {
          mode,
          subscriptionIds: podcastIds
        } as unknown as Filter["podcasts"])
      )
    }
  }
  const asDate = (millis: number | null) =>
    millis === null ? "" : new Date(millis).toISOString().slice(0, 10)
  const between = f.published?._tag === "Between" ? f.published : null
  const setBetween = (key: "from" | "to", value: string) => {
    const at =
      value === "" ? null : new Date(`${value}T${key === "from" ? "00:00" : "23:59"}`).getTime()
    setFilter(
      withCondition(f, "published", {
        _tag: "Between",
        from: key === "from" ? at : (between?.from ?? null),
        to: key === "to" ? at : (between?.to ?? null)
      } as unknown as Filter["published"])
    )
  }

  return (
    <div className="space-y-5">
      {!unsaved && (
        <div className="rounded-xl border bg-card">
          <Row label="Name" htmlFor={`${id}-name`}>
            <input
              id={`${id}-name`}
              data-view-name=""
              type="text"
              value={name}
              required
              aria-invalid={nameError}
              aria-describedby={nameError ? `${id}-name-error` : undefined}
              onChange={(event) => {
                setName(event.target.value)
                nameCommit.schedule(event.target.value)
              }}
              onBlur={(event) => nameCommit.now(event.target.value)}
              className={control}
            />
            {nameError && (
              <p id={`${id}-name-error`} className="mt-1 text-small text-destructive">
                A View needs a name.
              </p>
            )}
          </Row>
        </div>
      )}

      <section aria-labelledby={`${id}-where`}>
        <h3
          id={`${id}-where`}
          className="pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
        >
          Show Episodes where
        </h3>
        <div className="rounded-xl border bg-card">
          <Row label="Published" htmlFor={`${id}-published`}>
            <select
              id={`${id}-published`}
              value={publishedChoice(f)}
              onChange={(event) =>
                setFilter(withPublished(f, event.target.value as PublishedChoice))
              }
              className={control}
            >
              <option value="any">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="between">Between two dates</option>
            </select>
            {between && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-small text-muted-foreground">
                  From
                  <input
                    type="date"
                    value={asDate(between.from)}
                    onChange={(event) => setBetween("from", event.target.value)}
                    className={`${control} mt-1`}
                  />
                </label>
                <label className="text-small text-muted-foreground">
                  To
                  <input
                    type="date"
                    value={asDate(between.to)}
                    onChange={(event) => setBetween("to", event.target.value)}
                    className={`${control} mt-1`}
                  />
                </label>
              </div>
            )}
          </Row>
          <Row label="Podcasts" htmlFor={`${id}-podcasts`}>
            <select
              id={`${id}-podcasts`}
              value={podcastMode}
              onChange={(event) => setMode(event.target.value as "all" | "include" | "exclude")}
              className={control}
            >
              <option value="all">All podcasts</option>
              <option value="include">Only these</option>
              <option value="exclude">All except these</option>
            </select>
            {podcastMode !== "all" && (
              <fieldset className="mt-2">
                <legend className="sr-only">Podcasts</legend>
                {podcastIds.length === 0 && (
                  <p className="pb-1 text-small text-muted-foreground">Choose the podcasts.</p>
                )}
                {subscriptions.map((s) => (
                  <label key={s.id} className="flex min-h-10 items-center gap-2.5 text-row">
                    <input
                      type="checkbox"
                      checked={podcastIds.includes(s.id)}
                      onChange={(event) => togglePodcast(s.id, event.target.checked)}
                      className="size-4 accent-primary"
                    />
                    <span className="truncate">{s.title}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </Row>
          {!unsaved && (
            <Row label="Mentions" htmlFor={`${id}-text`}>
              <input
                id={`${id}-text`}
                type="search"
                value={text}
                placeholder="Any words"
                aria-describedby={`${id}-text-help`}
                onChange={(event) => {
                  setText(event.target.value)
                  textCommit.schedule(event.target.value)
                }}
                onBlur={(event) => textCommit.now(event.target.value)}
                className={control}
              />
              <p id={`${id}-text-help`} className="mt-1 text-small text-muted-foreground">
                Titles, show notes and podcast names.
              </p>
            </Row>
          )}
          <Row label="Played" htmlFor={`${id}-played`}>
            <select
              id={`${id}-played`}
              value={f.played ?? "any"}
              onChange={(event) =>
                setFilter(
                  withCondition(
                    f,
                    "played",
                    event.target.value === "any"
                      ? undefined
                      : (event.target.value as Filter["played"])
                  )
                )
              }
              className={control}
            >
              <option value="any">Any</option>
              <option value="unplayed">Unplayed</option>
              <option value="inProgress">In progress</option>
              <option value="played">Played</option>
            </select>
          </Row>
          <Row label="Starred" htmlFor={`${id}-starred`}>
            <select
              id={`${id}-starred`}
              value={f.starred === undefined ? "any" : String(f.starred)}
              onChange={(event) =>
                setFilter(
                  withCondition(
                    f,
                    "starred",
                    event.target.value === "any" ? undefined : event.target.value === "true"
                  )
                )
              }
              className={control}
            >
              <option value="any">Any</option>
              <option value="true">Starred</option>
              <option value="false">Not Starred</option>
            </select>
          </Row>
          <Row label="In a Playlist" htmlFor={`${id}-entry`}>
            <select
              id={`${id}-entry`}
              value={f.notInAnyPlaylist ? "not" : "any"}
              onChange={(event) =>
                setFilter(
                  withCondition(
                    f,
                    "notInAnyPlaylist",
                    event.target.value === "not" ? true : undefined
                  )
                )
              }
              className={control}
            >
              <option value="any">Any</option>
              <option value="not">Not in any Playlist</option>
            </select>
          </Row>
          <Row label="Length">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-small text-muted-foreground">
                At least
                <select
                  value={f.minDuration === undefined ? "" : String(f.minDuration / 60)}
                  onChange={(event) =>
                    setFilter(
                      withCondition(
                        f,
                        "minDuration",
                        event.target.value === ""
                          ? undefined
                          : ((Number(event.target.value) * 60) as Filter["minDuration"])
                      )
                    )
                  }
                  className={`${control} mt-1`}
                >
                  <option value="">Any</option>
                  {minutes.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-small text-muted-foreground">
                At most
                <select
                  value={f.maxDuration === undefined ? "" : String(f.maxDuration / 60)}
                  onChange={(event) =>
                    setFilter(
                      withCondition(
                        f,
                        "maxDuration",
                        event.target.value === ""
                          ? undefined
                          : ((Number(event.target.value) * 60) as Filter["maxDuration"])
                      )
                    )
                  }
                  className={`${control} mt-1`}
                >
                  <option value="">Any</option>
                  {minutes.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Row>
        </div>
        <p className="px-1 pt-1.5 text-small text-muted-foreground">
          Every row must match. Rows left at “Any” don’t narrow anything.
        </p>
      </section>

      <section aria-labelledby={`${id}-order`}>
        <h3
          id={`${id}-order`}
          className="pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
        >
          Order
        </h3>
        <div className="rounded-xl border bg-card">
          <Row label="Sort" htmlFor={`${id}-sort`}>
            <select
              id={`${id}-sort`}
              value={current.sort}
              onChange={(event) => save({ ...data, sort: event.target.value as View.ViewSort })}
              className={control}
            >
              {sorts.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Show" htmlFor={`${id}-limit`}>
            <select
              id={`${id}-limit`}
              value={current.limit === null ? "" : String(current.limit)}
              onChange={(event) =>
                save({
                  ...data,
                  limit: event.target.value === "" ? null : Number(event.target.value)
                })
              }
              className={control}
            >
              <option value="">All that match</option>
              {limits.map((n) => (
                <option key={n} value={n}>
                  The first {n}
                </option>
              ))}
            </select>
          </Row>
        </div>
      </section>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-row font-medium text-destructive hover:bg-secondary active:bg-input"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Delete View
        </button>
      )}
    </div>
  )
}
