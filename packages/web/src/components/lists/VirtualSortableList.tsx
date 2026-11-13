import {
  defaultRangeExtractor,
  useVirtualizer,
  useWindowVirtualizer,
  type VirtualItem
} from "@tanstack/react-virtual"
import {
  memo,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from "react"
import { SortableList } from "./SortableRow.tsx"
import { KeyboardReorderContext, useKeyboardReorder } from "./useKeyboardReorder.ts"

export interface EntryScroller {
  readonly scrollToIndex: (index: number) => void
}

// Measuring and scrolling must not rebuild every row’s menus and tooltips.
const EntryContent = memo(
  function EntryContent({
    id,
    index,
    render
  }: {
    readonly id: string
    readonly index: number
    readonly render: (id: string, index: number) => ReactNode
    readonly version: ReadonlyArray<unknown>
  }) {
    return render(id, index)
  },
  (before, after) =>
    before.id === after.id &&
    before.index === after.index &&
    before.version.length === after.version.length &&
    before.version.every((value, i) => Object.is(value, after.version[i]))
)

/** Keep dragged and focused Entries mounted as the viewport moves (pod-b90, KEY-04). */
export function VirtualSortableList({
  ids: savedIds,
  memoryKey,
  rowVersion,
  label,
  onMove,
  children,
  scroller,
  drawer = false
}: {
  readonly ids: ReadonlyArray<string>
  readonly memoryKey: string
  /** Values read by the row and its commands: unrelated Position reports stay cheap. */
  readonly rowVersion: (id: string, index: number) => ReadonlyArray<unknown>
  readonly label: (id: string) => string
  readonly onMove: (id: string, after: string | null) => void
  readonly children: (id: string, index: number) => ReactNode
  readonly scroller?: Ref<EntryScroller>
  readonly drawer?: boolean
}) {
  const keyboard = useKeyboardReorder({ ids: savedIds, label, onMove, enabled: !drawer })
  const ids = keyboard.ids
  const root = useRef<HTMLDivElement>(null)
  const storageKey = () =>
    `podlist:entry-sizes:${drawer ? "drawer" : "page"}:${memoryKey}:${window.innerWidth}`
  const [initialMeasurementsCache] = useState<VirtualItem[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey()) ?? "[]")
    } catch {
      return []
    }
  })
  const [margin, setMargin] = useState(0)
  const [dragged, setDragged] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const scrollElement = () => root.current?.closest<HTMLElement>("[data-drawer-scroll]") ?? null
  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const update = () => {
      const scroll = element.closest<HTMLElement>("[data-drawer-scroll]")
      setMargin(
        drawer && scroll
          ? element.getBoundingClientRect().top -
              scroll.getBoundingClientRect().top +
              scroll.scrollTop
          : element.getBoundingClientRect().top + window.scrollY
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element.parentElement ?? element)
    return () => observer.disconnect()
  }, [drawer])
  const options = {
    count: ids.length,
    initialMeasurementsCache,
    estimateSize: () => (drawer ? 72 : 88),
    getItemKey: (index: number) => ids[index] ?? index,
    overscan: 2,
    directDomUpdates: true,
    useFlushSync: false,
    // ResizeObserver supplies real wrapped heights without forcing layout for each
    // newly mounted row; the estimate lasts only until its first observation.
    measureElement: (
      element: Element,
      entry: ResizeObserverEntry | undefined,
      instance: { readonly itemSizeCache: { readonly get: (key: string) => number | undefined } }
    ) =>
      entry?.borderBoxSize[0]?.blockSize ??
      entry?.contentRect.height ??
      instance.itemSizeCache.get(element.getAttribute("data-entry-id") ?? "") ??
      (drawer ? 72 : 88),
    scrollMargin: margin,
    rangeExtractor: (range: Parameters<typeof defaultRangeExtractor>[0]) => {
      const indexes = new Set(defaultRangeExtractor(range))
      for (const id of [dragged, keyboard.active, focused]) {
        const index = id === null ? -1 : ids.indexOf(id)
        if (index >= 0) indexes.add(index)
      }
      return [...indexes].sort((a, b) => a - b)
    }
  }
  const windowList = useWindowVirtualizer({
    ...options,
    enabled: !drawer,
    initialOffset: () => window.scrollY
  })
  const drawerList = useVirtualizer({
    ...options,
    enabled: drawer,
    getScrollElement: scrollElement
  })
  const list = drawer ? drawerList : windowList
  useLayoutEffect(() => {
    if (keyboard.active !== null)
      list.scrollToIndex(ids.indexOf(keyboard.active), { align: "auto" })
  }, [ids, keyboard.active, list])
  useEffect(() => {
    // Pixel restoration needs the same measured heights, including after a reload.
    const save = () => {
      try {
        sessionStorage.setItem(
          `podlist:entry-sizes:${drawer ? "drawer" : "page"}:${memoryKey}:${window.innerWidth}`,
          JSON.stringify(list.takeSnapshot())
        )
      } catch {
        /* Storage may be full. */
      }
    }
    window.addEventListener("pagehide", save)
    return () => {
      save()
      window.removeEventListener("pagehide", save)
    }
  }, [list, memoryKey, drawer])
  useImperativeHandle(scroller, () => ({
    scrollToIndex: (index) => list.scrollToIndex(index, { align: "auto" })
  }))
  return (
    <div
      ref={(element) => {
        root.current = element
        list.containerRef(element)
      }}
      className="relative"
      style={{ height: list.getTotalSize() }}
      onFocusCapture={(event) =>
        setFocused(
          (event.target as HTMLElement).closest<HTMLElement>("[data-entry-id]")?.dataset.entryId ??
            null
        )
      }
      // Portaled menus temporarily take focus: keep their Entry until focus returns.
      onContextMenuCapture={(event) =>
        setFocused(
          (event.target as HTMLElement).closest<HTMLElement>("[data-entry-id]")?.dataset.entryId ??
            null
        )
      }
    >
      {!drawer && (
        <>
          <span id={keyboard.instructions} className="sr-only">
            To move this Entry, press Space, then the up and down arrows, then Space to drop it, or
            Escape to cancel.
          </span>
          <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
            {keyboard.announcement}
          </div>
        </>
      )}
      <KeyboardReorderContext value={drawer ? null : keyboard.handle}>
        <SortableList ids={ids} label={label} onMove={onMove} onDragChange={setDragged}>
          {list.getVirtualItems().map((item) => {
            const id = ids[item.index]
            if (!id) return null
            return (
              <div
                key={id}
                ref={list.measureElement}
                data-index={item.index}
                data-entry-id={id}
                className="absolute inset-x-0 top-0 [contain:layout_style]"
                style={{ transform: `translateY(${item.start - margin}px)` }}
              >
                <EntryContent
                  id={id}
                  index={item.index}
                  render={children}
                  version={rowVersion(id, savedIds.indexOf(id))}
                />
              </div>
            )
          })}
        </SortableList>
      </KeyboardReorderContext>
    </div>
  )
}
