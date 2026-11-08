import { useAtomValue } from "@effect/atom-react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { ChevronRight, Search as SearchIcon, X } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { filterEpisodesAtom } from "../app/data.ts"
import { BulkBar } from "../components/episodes/BulkBar.tsx"
import { EpisodeDetail } from "../components/episodes/EpisodeDetail.tsx"
import { EpisodeList } from "../components/episodes/EpisodeList.tsx"
import { EmptyState } from "../components/lists/ListRow.tsx"
import { PageHeader } from "../components/shell/PageHeader.tsx"
import { SaveSearchDialog } from "../components/views/SaveSearchDialog.tsx"
import { ViewFormFields } from "../components/views/ViewForm.tsx"
import { isReturn } from "../lib/returnFocus.ts"
import { useMinWidth } from "../lib/useWide.ts"
import type { Filter, ViewData } from "../lib/viewEdit.ts"

// Search (CONTEXT.md, docs/design/ui-layout.md variant R): an unsaved View with Mentions
// filled in by its field. The rest of the View form narrows it (Played, Podcasts, and the
// rest), and it can be saved as a View with a name. Its words and conditions are in the
// address, so Back and reload keep them.

interface Refinement {
  readonly filter: Omit<Filter, "text">
  readonly sort: ViewData["sort"]
  readonly limit: number | null
}

const none: Refinement = { filter: {}, sort: "publishedDesc", limit: null }

/** An older address kept the conditions as one JSON value (`f`); still read. */
const readLegacy = (value: unknown): Refinement => {
  if (value === null || value === undefined) return none
  try {
    const parsed = (typeof value === "string" ? JSON.parse(value) : value) as Partial<Refinement>
    return {
      filter: (parsed.filter ?? {}) as Refinement["filter"],
      sort: parsed.sort ?? "publishedDesc",
      limit: parsed.limit ?? null
    }
  } catch {
    return none
  }
}

// The conditions as plain words in the address, so it reads and shares as what it is:
// ?q=rice&played=unplayed&max=30&sort=shortest (lengths in minutes, dates as days).
const sortWords = {
  publishedDesc: "newest",
  publishedAsc: "oldest",
  durationAsc: "shortest",
  durationDesc: "longest"
} as const
type SortWord = (typeof sortWords)[keyof typeof sortWords]
const sortOf = Object.fromEntries(
  Object.entries(sortWords).map(([sort, word]) => [word, sort])
) as Record<SortWord, ViewData["sort"]>

interface RefineParams {
  played?: "unplayed" | "inProgress" | "played"
  starred?: "yes" | "no"
  unqueued?: "yes"
  min?: number
  max?: number
  days?: number
  dates?: "between"
  from?: string
  to?: string
  podcasts?: string
  without?: string
  sort?: SortWord
  limit?: number
}

const day = (millis: number) => {
  const date = new Date(millis)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
const atDay = (value: unknown, time: string) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const at = new Date(`${value}T${time}`).getTime()
  return Number.isNaN(at) ? null : at
}
const count = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const toParams = (r: Refinement): RefineParams => {
  const f = r.filter
  const p: RefineParams = {}
  if (f.played) p.played = f.played
  if (f.starred !== undefined) p.starred = f.starred ? "yes" : "no"
  if (f.notInAnyPlaylist) p.unqueued = "yes"
  if (f.minDuration) p.min = f.minDuration / 60
  if (f.maxDuration) p.max = f.maxDuration / 60
  if (f.published?._tag === "LastDays") p.days = f.published.days
  if (f.published?._tag === "Between") {
    // The date picker stays open even before either bound is filled (CTRL-04).
    p.dates = "between"
    if (f.published.from !== null) p.from = day(f.published.from)
    if (f.published.to !== null) p.to = day(f.published.to)
  }
  if (f.podcasts)
    p[f.podcasts.mode === "include" ? "podcasts" : "without"] = f.podcasts.subscriptionIds.join(",")
  if (r.sort !== "publishedDesc") p.sort = sortWords[r.sort]
  if (r.limit) p.limit = r.limit
  return p
}

const fromParams = (search: Record<string, unknown>): Refinement => {
  const filter: Record<string, unknown> = {}
  const played = search.played
  if (played === "unplayed" || played === "inProgress" || played === "played")
    filter.played = played
  if (search.starred === "yes" || search.starred === "no") filter.starred = search.starred === "yes"
  if (search.unqueued === "yes") filter.notInAnyPlaylist = true
  const min = count(search.min)
  const max = count(search.max)
  if (min) filter.minDuration = Math.round(min * 60)
  if (max) filter.maxDuration = Math.round(max * 60)
  const days = count(search.days)
  const from = atDay(search.from, "00:00")
  const to = atDay(search.to, "23:59")
  if (days) filter.published = { _tag: "LastDays", days: Math.round(days) }
  else if (search.dates === "between" || from !== null || to !== null)
    filter.published = { _tag: "Between", from, to }
  for (const [key, mode] of [
    ["podcasts", "include"],
    ["without", "exclude"]
  ] as const) {
    const ids =
      typeof search[key] === "string" ? (search[key] as string).split(",").filter(Boolean) : []
    if (ids.length > 0) filter.podcasts = { mode, subscriptionIds: ids }
  }
  const sort = typeof search.sort === "string" ? sortOf[search.sort as SortWord] : undefined
  const limit = count(search.limit)
  return {
    filter: filter as Refinement["filter"],
    sort: sort ?? "publishedDesc",
    limit: limit ? Math.round(limit) : null
  }
}
const paramKeys = [
  "played",
  "starred",
  "unqueued",
  "min",
  "max",
  "days",
  "dates",
  "from",
  "to",
  "podcasts",
  "without",
  "sort",
  "limit"
] as const
const withoutRefinement = (search: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(search).filter(
      ([key]) => key !== "f" && !(paramKeys as ReadonlyArray<string>).includes(key)
    )
  )

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (
    search: Record<string, unknown>
  ): { q?: string; episode?: string } & RefineParams => ({
    ...(typeof search.q === "string" && search.q !== "" ? { q: search.q } : {}),
    // The conditions, each its own word in the address (an older `f` is read once).
    ...toParams(
      search.f !== undefined && search.f !== "" ? readLegacy(search.f) : fromParams(search)
    ),
    ...(typeof search.episode === "string" ? { episode: search.episode } : {})
  })
})

function SearchPage() {
  const search = Route.useSearch()
  const { q = "", episode: selected } = search
  const navigate = Route.useNavigate()
  const router = useRouter()
  const id = useId()
  const wide = useMinWidth("64rem")
  const [text, setText] = useState(q)
  const [saving, setSaving] = useState(false)
  // Open when the search is already narrowed (a reload, a shared link).
  const [refining, setRefining] = useState(
    () => Object.keys(fromParams(search as Record<string, unknown>).filter).length > 0
  )
  const [checked, setCheckedState] = useState<ReadonlySet<string>>(new Set())
  const input = useRef<HTMLInputElement>(null)
  const words = q.trim()
  const refinement = fromParams(search as Record<string, unknown>)
  const narrowed = Object.keys(refinement.filter).length > 0
  // The draft View: Mentions from the field, the rest from the form.
  const draft: ViewData = {
    id: "search",
    name: "Search",
    filter: { ...refinement.filter, ...(words ? { text: words } : {}) } as Filter,
    sort: refinement.sort,
    limit: refinement.limit
  }
  const active = words !== "" || narrowed
  const result = useAtomValue(
    filterEpisodesAtom(
      JSON.stringify(
        active
          ? { filter: draft.filter, sort: draft.sort, limit: draft.limit }
          : { filter: { text: "\u0000" }, sort: "publishedDesc", limit: null }
      )
    )
  )
  const episodes = active ? AsyncResult.getOrElse(result, () => []) : []

  // The address follows the words a moment after typing stops, so Back and reload keep them.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text.trim() !== q)
        void navigate({
          search: ({ q: _, ...rest }) => (text.trim() ? { ...rest, q: text.trim() } : rest),
          replace: true
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [text, q, navigate])
  // A fresh Search starts in its field; coming back to one (Back from an Episode) puts focus
  // on the Episode that was opened instead, as other lists do (KEY-04).
  useEffect(() => {
    if (!isReturn(router.history.location.state.__TSR_key ?? "initial")) input.current?.focus()
  }, [router])

  const refine = (next: ViewData) => {
    const { text: _, ...filter } = next.filter
    const value: Refinement = { filter, sort: next.sort, limit: next.limit }
    void navigate({
      search: (previous) => ({
        ...withoutRefinement(previous as Record<string, unknown>),
        ...toParams(value)
      }),
      replace: true
    })
  }
  const form = <ViewFormFields data={draft} onChange={refine} unsaved />

  const count = `${episodes.length} ${episodes.length === 1 ? "Episode" : "Episodes"}`
  return (
    <>
      <PageHeader
        title="Search"
        stableActions
        back={{ to: "/views", label: "Views" }}
        actions={
          checked.size > 0 ? (
            <BulkBar selected={[...checked]} onClear={() => setCheckedState(new Set())} />
          ) : active ? (
            <button
              type="button"
              onClick={() => setSaving(true)}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-secondary px-4 text-row font-medium hover:bg-input active:bg-input/70"
            >
              Save as View
            </button>
          ) : undefined
        }
      />
      <div className="px-5 pb-3 md:px-8">
        <label htmlFor={`${id}-q`} className="sr-only">
          Search the Library
        </label>
        {/* As wide as the results under it (beside the panel on a wide screen). */}
        <div className="relative max-w-xl lg:max-w-[calc(100%-400px+1rem)]">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={input}
            id={`${id}-q`}
            type="search"
            value={text}
            placeholder="Titles, show notes, podcasts"
            aria-describedby={`${id}-count`}
            onChange={(event) => setText(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-field bg-card py-2 pr-3 pl-10 text-row"
          />
        </div>
        {/* What is searched stays in view; the count joins it once there are words. */}
        <p id={`${id}-count`} className="mt-2 text-small text-muted-foreground">
          <span aria-live="polite">{active ? `${count} · ` : ""}</span>
          Every word must appear in the title, the show notes or the podcast’s name.
        </p>
        {/* Narrow screens: the rest of the View form, folded under the field. */}
        {!wide && (
          <div className="mt-2">
            <button
              type="button"
              aria-expanded={refining}
              aria-controls={`${id}-refine`}
              onClick={() => setRefining(!refining)}
              className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-row font-medium text-primary hover:bg-secondary/60"
            >
              <ChevronRight
                aria-hidden="true"
                className={`size-4 transition-transform motion-reduce:transition-none ${refining ? "rotate-90" : ""}`}
              />
              {narrowed ? "Refine (narrowed)" : "Refine"}
            </button>
            <div id={`${id}-refine`} hidden={!refining} className="mt-2">
              {form}
            </div>
          </div>
        )}
      </div>
      {/* As on a View: the results, with the form (or the open Episode) beside them. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px]">
        {!active ? (
          // A starting point, not a blank page.
          <EmptyState title="Search your Library">
            Type words above, or narrow by Played, Podcasts, Length and more with Refine.
          </EmptyState>
        ) : active && !AsyncResult.isInitial(result) && episodes.length === 0 ? (
          <EmptyState title="Nothing matches">
            Try fewer or different words{narrowed ? ", or set a condition back to Any" : ""}.
          </EmptyState>
        ) : (
          <EpisodeList
            episodes={episodes}
            label="Search results"
            ready={!AsyncResult.isInitial(result)}
            selected={selected}
            onOpen={(episodeId, how) =>
              navigate({
                search: (previous) => ({ ...previous, episode: episodeId }),
                replace: how?.replace ?? false
              })
            }
            checked={checked}
            setChecked={(update) => setCheckedState((previous) => update(previous))}
          />
        )}
        <aside
          aria-label={selected ? "Episode" : "Refine"}
          className="sticky top-0 hidden max-h-dvh self-start overflow-y-auto border-l pt-2 pr-4 pb-28 lg:block"
        >
          {selected ? (
            <>
              <div className="flex justify-end px-3">
                <button
                  type="button"
                  aria-label="Close Episode"
                  onClick={() => void navigate({ search: ({ episode: _, ...rest }) => rest })}
                  className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
              <EpisodeDetail episodeId={selected} />
            </>
          ) : (
            <div className="px-4 pt-2">
              <h2 className="pb-3 font-heading text-xl font-semibold">Refine</h2>
              {form}
            </div>
          )}
        </aside>
      </div>
      {saving && <SaveSearchDialog view={draft} open={saving} onOpenChange={setSaving} />}
    </>
  )
}
