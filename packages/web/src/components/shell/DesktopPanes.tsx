import { PanelLeft, PanelRight } from "lucide-react"
import {
  createContext,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { createPortal } from "react-dom"
import { deferredWrite } from "../../lib/deferredWrite.ts"
import { useMinWidth } from "../../lib/useWide.ts"
import { Tip } from "../feedback/Tip.tsx"
import {
  clampPaneWidth,
  initialPanes,
  inspectorPresentation,
  type Pane,
  paneWidths,
  restorePanes,
  threePaneWidth,
  updatePanes
} from "./desktopPaneState.ts"

const storageKey = "podlist:desktop-panes"
const inspectorId = "episode-inspector"
const sidebarId = "library-sidebar"

type Inspector = {
  readonly selectionKey: string | null
  readonly clearSelection: () => void
}

export const desktopBuild = import.meta.env.MODE === "desktop"

function readPanes() {
  try {
    return restorePanes(JSON.parse(localStorage.getItem(storageKey) ?? "null"))
  } catch {
    return initialPanes
  }
}

function useDesktopPanesState() {
  const wide = useMinWidth(`${threePaneWidth}px`)
  const [panes, setPanes] = useState(() => updatePanes(readPanes(), wide, { type: "layout" }))
  const [inspector, setInspector] = useState<Inspector | null>(null)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const presentation = inspectorPresentation(panes, wide, inspector?.selectionKey != null)
  const visible = inspector !== null && presentation.visible
  const canToggle = inspector !== null && presentation.canToggle
  const activePane = useRef<Pane | null>(null)

  useLayoutEffect(() => {
    setPanes((state) => updatePanes(state, wide, { type: "layout" }))
  }, [wide])
  const [storage] = useState(() =>
    deferredWrite((saved: typeof panes) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(saved))
      } catch {
        // The window can still keep its pane choices in memory.
      }
    })
  )
  useLayoutEffect(() => {
    storage.set(panes)
  }, [panes, storage])
  useLayoutEffect(() => {
    window.addEventListener("pagehide", storage.flush)
    return () => {
      window.removeEventListener("pagehide", storage.flush)
      storage.flush()
    }
  }, [storage])

  // Track focus while it is still mounted, including when a resize removes a pane.
  useEffect(() => {
    const track = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return
      activePane.current = event.target.closest(`#${inspectorId}`)
        ? "inspector"
        : event.target.closest(`#${sidebarId}`)
          ? "sidebar"
          : null
    }
    document.addEventListener("focusin", track)
    return () => document.removeEventListener("focusin", track)
  }, [])
  useLayoutEffect(() => {
    const closed =
      (activePane.current === "inspector" && !visible) ||
      (activePane.current === "sidebar" && !panes.sidebar)
    if (!closed) return
    const pane = activePane.current
    activePane.current = null
    const selected =
      document.querySelector<HTMLElement>('main [aria-selected="true"] [data-episode-title]') ??
      document.querySelector<HTMLElement>('main [data-episode-title][aria-current="true"]')
    const fallback = document.querySelector<HTMLElement>(
      pane === "inspector" ? "[data-inspector-toggle]:enabled" : "[data-sidebar-toggle]"
    )
    ;(selected ?? fallback ?? document.querySelector<HTMLElement>("main h1"))?.focus({
      preventScroll: true
    })
  }, [visible, panes.sidebar])

  const toggle = (pane: Pane) => {
    if (pane === "inspector" && !canToggle) return
    setPanes((state) =>
      updatePanes(state, wide, {
        type: pane,
        visible: pane === "sidebar" ? !state.sidebar : !visible
      })
    )
  }
  const showRef = useRef(() => {})
  showRef.current = () =>
    setPanes((state) => updatePanes(state, wide, { type: "inspector", visible: true }))
  const toggleRef = useRef(toggle)
  toggleRef.current = toggle
  const inspectorRef = useRef(inspector)
  inspectorRef.current = inspector
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  useEffect(() => {
    const command = (event: Event) => {
      switch ((event as CustomEvent).detail) {
        case "showInspector":
          showRef.current()
          break
        case "toggleSidebar":
          toggleRef.current("sidebar")
          break
        case "toggleInspector":
          toggleRef.current("inspector")
          break
      }
    }
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (
        document.querySelector('[data-sheet], [role="dialog"], [role="alertdialog"], [role="menu"]')
      )
        return
      if (event.key === "Escape") {
        const current = inspectorRef.current
        if (
          !current ||
          (event.target instanceof Element &&
            event.target.closest("input, textarea, [contenteditable]"))
        )
          return
        if (
          visibleRef.current &&
          (activePane.current === "inspector" || current.selectionKey === null)
        )
          toggleRef.current("inspector")
        else if (current.selectionKey !== null) current.clearSelection()
        return
      }
      const mac = /Mac/.test(navigator.platform)
      const character = event.key.toLowerCase()
      if (
        character === "i" &&
        event.altKey &&
        !event.shiftKey &&
        (mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
      ) {
        event.preventDefault()
        toggleRef.current("inspector")
      }
      // On Mac the native menu also handles this accelerator. CDP and assistive
      // technology can deliver it directly to the renderer.
      if (
        character === "s" &&
        event.ctrlKey &&
        !event.altKey &&
        (mac ? event.metaKey && !event.shiftKey : event.shiftKey && !event.metaKey)
      ) {
        event.preventDefault()
        toggleRef.current("sidebar")
      }
    }
    document.addEventListener("podlist:command", command)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("podlist:command", command)
      document.removeEventListener("keydown", key)
    }
  }, [])

  useEffect(() => {
    window.podlistApp?.setPaneMenu?.(panes.sidebar, visible, canToggle)
  }, [panes.sidebar, visible, canToggle])

  const setWidth = (pane: Pane, width: number) => {
    const property = pane === "sidebar" ? "sidebarWidth" : "inspectorWidth"
    setPanes((state) => ({ ...state, [property]: clampPaneWidth(pane, width) }))
  }
  return { panes, visible, canToggle, inspector, toggle, setInspector, host, setHost, setWidth }
}

const PaneContext = createContext<ReturnType<typeof useDesktopPanesState> | null>(null)

export function DesktopPanes({ children }: { readonly children: ReactNode }) {
  const state = useDesktopPanesState()
  return <PaneContext.Provider value={state}>{children}</PaneContext.Provider>
}

export function useDesktopPanes() {
  return useContext(PaneContext)
}

export function DesktopPaneToolbar() {
  const state = useDesktopPanes()
  if (!state) return null
  const sidebarLabel = state.panes.sidebar ? "Hide Sidebar" : "Show Sidebar"
  const inspectorLabel = state.visible ? "Hide Inspector" : "Show Inspector"
  const style =
    "grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
  return (
    // biome-ignore lint/a11y/useSemanticElements: label these controls without nesting another form fieldset.
    <div
      role="group"
      aria-label="Library panes"
      className="flex justify-between border-b px-3 py-1"
    >
      <Tip label={sidebarLabel}>
        <button
          type="button"
          data-sidebar-toggle=""
          aria-label={sidebarLabel}
          aria-expanded={state.panes.sidebar}
          aria-controls={state.panes.sidebar ? sidebarId : undefined}
          className={style}
          onClick={() => state.toggle("sidebar")}
        >
          <PanelLeft aria-hidden="true" className="size-5" />
        </button>
      </Tip>
      {state.inspector !== null && (
        <Tip label={inspectorLabel}>
          <button
            type="button"
            data-inspector-toggle=""
            aria-label={inspectorLabel}
            aria-expanded={state.visible}
            aria-controls={state.visible ? inspectorId : undefined}
            disabled={!state.canToggle}
            className={style}
            onClick={() => state.toggle("inspector")}
          >
            <PanelRight aria-hidden="true" className="size-5" />
          </button>
        </Tip>
      )}
    </div>
  )
}

export function DesktopSidebar({ children }: { readonly children: ReactNode }) {
  const state = useDesktopPanes()
  if (!state) return null
  return (
    <div
      id={sidebarId}
      hidden={!state.panes.sidebar}
      className="sticky top-0 w-(--desktop-sidebar-width) shrink-0 self-start"
    >
      {children}
      {state.panes.sidebar && <PaneDivider pane="sidebar" controls={sidebarId} />}
    </div>
  )
}

export function DesktopInspector({
  selectionKey,
  clearSelection,
  children
}: Inspector & { readonly children: ReactNode }) {
  const state = useDesktopPanes()
  const setInspector = state?.setInspector
  const host = state?.host
  const scroll = useRef<HTMLElement>(null)
  const clear = useRef(clearSelection)
  clear.current = clearSelection
  const inspector = useMemo<Inspector>(
    () => ({ selectionKey, clearSelection: () => clear.current() }),
    [selectionKey]
  )
  useLayoutEffect(() => {
    setInspector?.(inspector)
    return () => setInspector?.((previous) => (previous === inspector ? null : previous))
  }, [setInspector, inspector])
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset scroll when a different selection replaces the content.
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0
  }, [selectionKey])
  if (!state?.visible || !host) return null
  return createPortal(
    <aside
      id={inspectorId}
      aria-label="Episode Inspector"
      className="sticky top-0 self-start border-l"
    >
      <section
        ref={scroll}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard access to scrollable show notes.
        tabIndex={0}
        aria-label="Inspector content"
        className="h-[calc(100dvh-max(112px,var(--desktop-player,0px)))] overflow-y-auto overscroll-contain pt-2 pb-6"
      >
        {children ?? (
          <div className="px-5 py-8">
            <h2 className="font-heading text-xl font-semibold">Select an Episode</h2>
            <p className="mt-2 text-small text-muted-foreground">
              Its details and Playlists appear here.
            </p>
          </div>
        )}
      </section>
      <PaneDivider pane="inspector" controls={inspectorId} />
    </aside>,
    host
  )
}

function PaneDivider({ pane, controls }: { readonly pane: Pane; readonly controls: string }) {
  const state = useDesktopPanes()
  const drag = useRef<{ x: number; width: number } | null>(null)
  if (!state) return null
  const sidebar = pane === "sidebar"
  const width = sidebar ? state.panes.sidebarWidth : state.panes.inspectorWidth
  const bounds = paneWidths[pane]
  const start = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      x: event.clientX,
      width: event.currentTarget.parentElement?.offsetWidth ?? width
    }
  }
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current) {
      const change = (event.clientX - drag.current.x) * (sidebar ? 1 : -1)
      state.setWidth(pane, drag.current.width + change)
    }
  }
  const key = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = (sidebar ? 1 : -1) * 10
    const next =
      event.key === "ArrowLeft"
        ? width - step
        : event.key === "ArrowRight"
          ? width + step
          : event.key === "Home"
            ? bounds.minimum
            : event.key === "End"
              ? bounds.maximum
              : null
    if (next === null) return
    event.preventDefault()
    state.setWidth(pane, next)
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable, draggable window splitter.
    <div
      role="separator"
      aria-label={sidebar ? "Sidebar width" : "Inspector width"}
      aria-orientation="vertical"
      aria-controls={controls}
      aria-valuemin={bounds.minimum}
      aria-valuemax={bounds.maximum}
      aria-valuenow={width}
      tabIndex={0}
      className={`absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none hover:bg-primary/30 focus-visible:bg-primary/30 ${sidebar ? "-right-1" : "-left-1"}`}
      onKeyDown={key}
      onPointerDown={start}
      onPointerMove={move}
      onLostPointerCapture={() => {
        drag.current = null
      }}
    />
  )
}
