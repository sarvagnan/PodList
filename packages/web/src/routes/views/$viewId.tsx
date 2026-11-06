import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { AsyncResult } from "effect/reactivity"
import { useLayoutEffect, useRef, useState } from "react"
import { viewEpisodesAtom } from "../../app/data.ts"
import { stateAtom } from "../../app/runtime.ts"
import { EpisodeRow, NextLastTarget } from "../../components/episodes/EpisodeRow.tsx"
import { EmptyState } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { describeView } from "../../lib/viewSummary.ts"

export const Route = createFileRoute("/views/$viewId")({ component: ViewDetail })

const rowHeight = 76

function ViewDetail() {
  const { viewId } = Route.useParams()
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
                aria-posinset={item.index + 1}
                aria-setsize={episodes.length}
                className="absolute inset-x-0 top-0"
                style={{
                  transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`
                }}
              >
                <EpisodeRow episode={episode} />
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
