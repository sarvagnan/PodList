import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { AsyncResult } from "effect/reactivity"
import { X } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { viewEpisodesAtom } from "../../app/data.ts"
import { stateAtom } from "../../app/runtime.ts"
import { EpisodeDetail } from "../../components/episodes/EpisodeDetail.tsx"
import { EpisodeRow, NextLastTarget } from "../../components/episodes/EpisodeRow.tsx"
import { EmptyState } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
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
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const result = useAtomValue(viewEpisodesAtom(viewId))
  const episodes = AsyncResult.getOrElse(result, () => [])
  const view = state?.views.find((v) => v.id === viewId)

  // Views can match thousands of Episodes: only the rows on screen are rendered.
  const listRef = useRef<HTMLOListElement>(null)
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
        actions={<NextLastTarget />}
      />
      <div className={selected ? "lg:grid lg:grid-cols-[minmax(0,1fr)_26rem]" : ""}>
        {!loading && episodes.length === 0 ? (
          <EmptyState title="No Episodes match this View">
            New Episodes appear here as your podcasts publish them.
          </EmptyState>
        ) : (
          <ol
            ref={listRef}
            aria-label={`${view.name} Episodes`}
            className="relative mx-3 md:mx-6"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const episode = episodes[item.index]
              if (episode === undefined) return null
              return (
                <li
                  key={episode.id}
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  aria-posinset={item.index + 1}
                  aria-setsize={episodes.length}
                  className="absolute inset-x-0 top-0"
                  style={{
                    transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`
                  }}
                >
                  <EpisodeRow
                    episode={episode}
                    selected={episode.id === selected}
                    onOpen={(episodeId) => navigate({ search: { episode: episodeId } })}
                  />
                </li>
              )
            })}
          </ol>
        )}
        {selected && (
          <aside
            aria-label="Episode"
            className="sticky top-0 hidden max-h-dvh self-start overflow-y-auto border-l pt-2 pb-28 lg:block"
          >
            <div className="flex justify-end px-3">
              <button
                type="button"
                aria-label="Close Episode"
                title="Close"
                onClick={() => navigate({ search: {} })}
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
