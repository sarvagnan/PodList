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

/** The conditions other than the words, as the address keeps them (`f`). */
const readRefinement = (value: unknown): Refinement => {
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

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (
    search: Record<string, unknown>
  ): { q?: string; f?: Refinement; episode?: string } => ({
    ...(typeof search.q === "string" && search.q !== "" ? { q: search.q } : {}),
    // An object, which the router writes into the address once (not JSON in JSON).
    ...(search.f !== undefined && search.f !== "" ? { f: readRefinement(search.f) } : {}),
    ...(typeof search.episode === "string" ? { episode: search.episode } : {})
  })
})

function SearchPage() {
  const { q = "", f, episode: selected } = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const id = useId()
  const wide = useMinWidth("64rem")
  const [text, setText] = useState(q)
  const [saving, setSaving] = useState(false)
  // Open when the search is already narrowed (a reload, a shared link).
  const [refining, setRefining] = useState(() => readRefinement(f) !== none && f !== undefined)
  const [checked, setCheckedState] = useState<ReadonlySet<string>>(new Set())
  const input = useRef<HTMLInputElement>(null)
  const words = q.trim()
  const refinement = readRefinement(f)
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
    const empty = Object.keys(filter).length === 0 && next.sort === "publishedDesc" && !next.limit
    void navigate({
      search: ({ f: _f, ...rest }) => (empty ? rest : { ...rest, f: value }),
      replace: true
    })
  }
  const form = <ViewFormFields data={draft} onChange={refine} unsaved />

  const count = `${episodes.length} ${episodes.length === 1 ? "Episode" : "Episodes"}`
  return (
    <>
      <PageHeader
        title="Search"
        back={{ to: "/views", label: "Views" }}
        actions={
          checked.size > 0 ? (
            <BulkBar selected={[...checked]} onClear={() => setCheckedState(new Set())} />
          ) : active ? (
            <button
              type="button"
              onClick={() => setSaving(true)}
              className="inline-flex h-10 shrink-0 items-center rounded-full bg-secondary px-4 text-row font-medium hover:bg-input active:bg-input/70"
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
        <div className="relative max-w-xl">
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
        {active && !AsyncResult.isInitial(result) && episodes.length === 0 ? (
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
            setChecked={(update) => setCheckedState(update(checked))}
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
