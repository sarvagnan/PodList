import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { useLayoutEffect, useRef, useState } from "react"
import type { ViewEpisode } from "../../app/data.ts"
import { useRowGrid } from "../../lib/rowGrid.ts"
import { useScrollMemory } from "../../lib/scrollMemory.ts"
import { useCopyEpisodeLink } from "../feedback/useCopyLink.ts"
import { EpisodeRow } from "./EpisodeRow.tsx"

/** A row's height at the default font size; rows are measured as they render. */
const rowHeight = 76

/**
 * The Episodes a View or Search matches, as a keyboard grid (lib/rowGrid.ts). Lists can
 * hold thousands of Episodes, so only the rows on screen are rendered. Ticks for bulk
 * actions belong to the page, which shows the bulk bar.
 */
export function EpisodeList({
  episodes,
  label,
  ready,
  selected,
  onOpen,
  checked,
  setChecked,
  showPodcast = true
}: {
  readonly episodes: ReadonlyArray<ViewEpisode>
  readonly label: string
  /** The list has loaded, so a saved scroll position can be restored. */
  readonly ready: boolean
  /** The Episode open beside the list. */
  readonly selected?: string | undefined
  /** Opens an Episode; `replace` when the keyboard moves the open one along the list. */
  readonly onOpen: (episodeId: string, how?: { readonly replace: boolean }) => void
  readonly checked: ReadonlySet<string>
  readonly setChecked: (update: (current: ReadonlySet<string>) => ReadonlySet<string>) => void
  /** Off on a podcast's own page, whose title already names it. */
  readonly showPodcast?: boolean
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    setScrollMargin(listRef.current?.offsetTop ?? 0)
  }, [])
  const virtualizer = useWindowVirtualizer({
    count: episodes.length,
    estimateSize: () => rowHeight,
    overscan: 8,
    scrollMargin,
    // Start where the page is, not at the top: a list that mounts after Back has restored
    // the scroll must not send it back to 0.
    initialOffset: () => (typeof window === "undefined" ? 0 : window.scrollY)
  })
  useScrollMemory(ready)
  const copyLink = useCopyEpisodeLink()
  const grid = useRowGrid(listRef, {
    count: episodes.length,
    scrollToIndex: (index) => virtualizer.scrollToIndex(index, { align: "auto" }),
    titleAt: (index) => episodes[index]?.title ?? "",
    onSelectAll: () => setChecked(() => new Set(episodes.map((e) => e.id))),
    onCopy: (index) => {
      const id = episodes[index]?.id
      if (id !== undefined) void copyLink(id)
    },
    // With an Episode open beside the list, the arrows carry it along (LIST-07).
    onRowMove: (index) => {
      const id = episodes[index]?.id
      if (selected !== undefined && id !== undefined && id !== selected)
        onOpen(id, { replace: true })
    }
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
  return (
    // biome-ignore lint/a11y/useSemanticElements: a virtualised grid of flex rows (components/lists/Grid.tsx).
    <div
      ref={listRef}
      role="grid"
      aria-label={label}
      aria-rowcount={episodes.length}
      aria-multiselectable="true"
      onKeyDown={grid.onKeyDown}
      onFocus={grid.onFocus}
      onBlur={grid.onBlur}
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
            style={{ transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }}
          >
            <EpisodeRow
              episode={episode}
              checked={checked.has(episode.id)}
              onCheck={(on, range) => tick(item.index, on, range)}
              selected={episode.id === selected}
              onOpen={onOpen}
              showPodcast={showPodcast}
            />
          </div>
        )
      })}
    </div>
  )
}
