import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { Search as SearchIcon } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { filterEpisodesAtom } from "../app/data.ts"
import { BulkBar } from "../components/episodes/BulkBar.tsx"
import { EpisodeDetail } from "../components/episodes/EpisodeDetail.tsx"
import { EpisodeList } from "../components/episodes/EpisodeList.tsx"
import { EmptyState } from "../components/lists/ListRow.tsx"
import { PageHeader } from "../components/shell/PageHeader.tsx"
import { SaveSearchDialog } from "../components/views/SaveSearchDialog.tsx"

// Search (CONTEXT.md): an unsaved, one-off View over the Library, here by its words
// (titles, show notes, podcast names). It can be saved as a View with a name.

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): { q?: string; episode?: string } => ({
    ...(typeof search.q === "string" && search.q !== "" ? { q: search.q } : {}),
    ...(typeof search.episode === "string" ? { episode: search.episode } : {})
  })
})

const keyFor = (text: string) =>
  JSON.stringify({ filter: { text }, sort: "publishedDesc", limit: null })

function SearchPage() {
  const { q = "", episode: selected } = Route.useSearch()
  const navigate = Route.useNavigate()
  const id = useId()
  const [text, setText] = useState(q)
  const [saving, setSaving] = useState(false)
  const [checked, setCheckedState] = useState<ReadonlySet<string>>(new Set())
  const input = useRef<HTMLInputElement>(null)
  const words = q.trim()
  const result = useAtomValue(filterEpisodesAtom(keyFor(words || "\u0000")))
  const episodes = words ? AsyncResult.getOrElse(result, () => []) : []

  // The address follows the words a moment after typing stops, so Back and reload keep them.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text.trim() !== q) void navigate({ search: { q: text.trim() }, replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [text, q, navigate])
  useEffect(() => {
    input.current?.focus()
  }, [])

  const count = `${episodes.length} ${episodes.length === 1 ? "Episode" : "Episodes"}`
  return (
    <>
      <PageHeader
        title="Search"
        back={{ to: "/views", label: "Views" }}
        actions={
          checked.size > 0 ? (
            <BulkBar selected={[...checked]} onClear={() => setCheckedState(new Set())} />
          ) : words ? (
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
      <div className="px-4 pb-3 md:px-8">
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
            className="h-12 w-full rounded-xl border border-field bg-card pr-3 pl-10 text-row"
          />
        </div>
        {/* What is searched stays in view; the count joins it once there are words. */}
        <p id={`${id}-count`} className="mt-2 text-small text-muted-foreground">
          <span aria-live="polite">{words ? `${count} · ` : ""}</span>
          Every word must appear in the title, the show notes or the podcast’s name.
        </p>
      </div>
      <div className={selected ? "lg:grid lg:grid-cols-[minmax(0,1fr)_400px]" : ""}>
        {words && !AsyncResult.isInitial(result) && episodes.length === 0 ? (
          <EmptyState title="Nothing matches">Try fewer or different words.</EmptyState>
        ) : (
          <EpisodeList
            episodes={episodes}
            label="Search results"
            ready={!AsyncResult.isInitial(result)}
            selected={selected}
            onOpen={(episodeId) => navigate({ search: { q, episode: episodeId } })}
            checked={checked}
            setChecked={(update) => setCheckedState(update(checked))}
          />
        )}
        {selected && (
          <aside
            aria-label="Episode"
            className="sticky top-0 hidden max-h-dvh self-start overflow-y-auto border-l pt-4 pb-28 lg:block"
          >
            <EpisodeDetail episodeId={selected} />
          </aside>
        )}
      </div>
      {saving && <SaveSearchDialog text={words} open={saving} onOpenChange={setSaving} />}
    </>
  )
}
