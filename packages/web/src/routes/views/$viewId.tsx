import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { AsyncResult } from "effect/reactivity"
import { X } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { viewEpisodesAtom } from "../../app/data.ts"
import { stateAtom } from "../../app/runtime.ts"
import { BulkBar } from "../../components/episodes/BulkBar.tsx"
import { EpisodeDetail } from "../../components/episodes/EpisodeDetail.tsx"
import { EpisodeRow, NextLastTarget } from "../../components/episodes/EpisodeRow.tsx"
import { EmptyState } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { useRowGrid } from "../../lib/rowGrid.ts"
import { describeView } from "../../lib/viewSummary.ts"

export const Route = createFileRoute("/views/$viewId")({
  component: ViewDetail,
  // Wide screens show an Episode beside the list; the URL keeps it across reloads.
  validateSearch: (search: Record<string, unknown>): { episode?: string } =>
    typeof search.episode === "string" ? { episode: search.episode } : {}
})

/** A row's height at the default font size; rows are measured as they render. */
const rowHeight = 76

function ViewDetail() {
  const { viewId } = Route.useParams()
  const { episode: selected } = Route.useSearch()
  const navigate = Route.useNavigate()
  // Desktop bulk selection, kept per View: another View starts with none. Escape clears it.
  const [selection, setSelection] = useState<{
    readonly viewId: string
    readonly ids: ReadonlySet<string>
  }>({ viewId, ids: new Set() })
  const checked: ReadonlySet<string> = selection.viewId === viewId ? selection.ids : new Set()
  const setChecked = (
    next: ReadonlySet<string> | ((current: ReadonlySet<string>) => ReadonlySet<string>)
  ) => setSelection({ viewId, ids: typeof next === "function" ? next(checked) : next })
  useEffect(() => {
    if (checked.size === 0) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection({ viewId, ids: new Set() })
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [checked.size, viewId])
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const result = useAtomValue(viewEpisodesAtom(viewId))
  const episodes = AsyncResult.getOrElse(result, () => [])
  const view = state?.views.find((v) => v.id === viewId)

  // Views can match thousands of Episodes: only the rows on screen are rendered.
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    setScrollMargin(listRef.current?.offsetTop ?? 0)
  }, [])
  const virtualizer = useWindowVirtualizer({
    count: episodes.length,
    estimateSize: () => rowHeight,
    overscan: 8,
    scrollMargin
  })
  const grid = useRowGrid(listRef, {
    count: episodes.length,
    scrollToIndex: (index) => virtualizer.scrollToIndex(index, { align: "auto" }),
    titleAt: (index) => episodes[index]?.title ?? "",
    onSelectAll: () => setChecked(new Set(episodes.map((e) => e.id)))
  })
  // Shift-click ticks the range from the last row ticked or unticked.
  const lastTicked = useRef<number | null>(null)
  const tick = (index: number, on: boolean, range: boolean) => {
    const from = range && lastTicked.current !== null ? lastTicked.current : index
    lastTicked.current = index
    setChecked((current) => {
      const next = new Set(current)
      for (let i = Math.min(from, index); i <= Math.max(from, index); i++) {
        const id = episodes[i]?.id
        if (id === undefined) continue
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }
  // Closing the panel puts focus back on the row it showed (WKEY-03).
  const closePanel = () => {
    const shown = selected
    void navigate({ search: {} }).then(() =>
      document.querySelector<HTMLElement>(`[data-episode-title="${shown}"]`)?.focus()
    )
  }

  if (state === null) return null
  if (view === undefined) {
    return (
      <>
        <PageHeader title="View" back={{ to: "/views", label: "Views" }} />
        <EmptyState title="This View no longer exists">
          It was deleted on another device.
        </EmptyState>
      </>
    )
  }
  const loading = AsyncResult.isInitial(result)
  const count = `${episodes.length} ${episodes.length === 1 ? "Episode" : "Episodes"}`
  return (
    <>
      <PageHeader
        title={view.name}
        back={{ to: "/views", label: "Views" }}
        subtitle={loading ? describeView(view) : `${count} · ${describeView(view)}`}
        actions={
          checked.size > 0 ? (
            <BulkBar selected={[...checked]} onClear={() => setChecked(new Set())} />
          ) : (
            <NextLastTarget />
          )
        }
      />
      <div className={selected ? "lg:grid lg:grid-cols-[minmax(0,1fr)_26rem]" : ""}>
        {!loading && episodes.length === 0 ? (
          <EmptyState title="No Episodes match this View">
            New Episodes appear here as your podcasts publish them.
          </EmptyState>
        ) : (
          // biome-ignore lint/a11y/useSemanticElements: a virtualised grid of flex rows (components/lists/Grid.tsx).
          <div
            ref={listRef}
            role="grid"
            aria-label={`${view.name} Episodes`}
            aria-rowcount={episodes.length}
            aria-multiselectable="true"
            onKeyDown={grid.onKeyDown}
            onFocus={grid.onFocus}
            className="relative mx-3 md:mx-6"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const episode = episodes[item.index]
              if (episode === undefined) return null
              return (
                // biome-ignore lint/a11y/useSemanticElements lint/a11y/useFocusableInteractive: a row of the grid above.
                <div
                  key={episode.id}
                  ref={virtualizer.measureElement}
                  role="row"
                  data-index={item.index}
                  data-row={item.index}
                  aria-rowindex={item.index + 1}
                  aria-selected={checked.has(episode.id)}
                  aria-current={episode.id === selected ? "true" : undefined}
                  className="absolute inset-x-0 top-0"
                  style={{
                    transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`
                  }}
                >
                  <EpisodeRow
                    episode={episode}
                    checked={checked.has(episode.id)}
                    onCheck={(on, range) => tick(item.index, on, range)}
                    selected={episode.id === selected}
                    onOpen={(episodeId) => navigate({ search: { episode: episodeId } })}
                  />
                </div>
              )
            })}
          </div>
        )}
        {selected && (
          <aside
            aria-label="Episode"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !event.defaultPrevented) closePanel()
            }}
            className="sticky top-0 hidden max-h-dvh self-start overflow-y-auto border-l pt-2 pb-28 lg:block"
          >
            <div className="flex justify-end px-3">
              <button
                type="button"
                aria-label="Close Episode"
                onClick={closePanel}
                className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <EpisodeDetail episodeId={selected} />
          </aside>
        )}
      </div>
    </>
  )
}
