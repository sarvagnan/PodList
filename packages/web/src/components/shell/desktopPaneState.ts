export const threePaneWidth = 950

export const paneWidths = {
  sidebar: { minimum: 180, initial: 225, maximum: 320 },
  inspector: { minimum: 260, initial: 270, maximum: 440 }
} as const

export type Pane = keyof typeof paneWidths

export type PaneState = {
  readonly sidebar: boolean
  readonly inspectorEnabled: boolean
  readonly inspectorExplicit: boolean
  readonly sidebarWidth: number
  readonly inspectorWidth: number
}

export const initialPanes: PaneState = {
  sidebar: true,
  inspectorEnabled: true,
  inspectorExplicit: false,
  sidebarWidth: paneWidths.sidebar.initial,
  inspectorWidth: paneWidths.inspector.initial
}

export const clampPaneWidth = (pane: Pane, width: number) => {
  const { minimum, maximum } = paneWidths[pane]
  return Math.min(maximum, Math.max(minimum, width))
}

export function restorePanes(saved: unknown): PaneState {
  const value = (saved ?? {}) as Partial<PaneState>
  return {
    sidebar: typeof value.sidebar === "boolean" ? value.sidebar : initialPanes.sidebar,
    inspectorEnabled:
      typeof value.inspectorEnabled === "boolean"
        ? value.inspectorEnabled
        : initialPanes.inspectorEnabled,
    inspectorExplicit: value.inspectorExplicit === true,
    sidebarWidth: Number.isFinite(value.sidebarWidth)
      ? clampPaneWidth("sidebar", Number(value.sidebarWidth))
      : initialPanes.sidebarWidth,
    inspectorWidth: Number.isFinite(value.inspectorWidth)
      ? clampPaneWidth("inspector", Number(value.inspectorWidth))
      : initialPanes.inspectorWidth
  }
}

export function inspectorPresentation(panes: PaneState, wide: boolean, hasSelection: boolean) {
  return {
    visible:
      panes.inspectorEnabled && (wide ? hasSelection : panes.inspectorExplicit && !panes.sidebar),
    canToggle: !wide || hasSelection || !panes.inspectorEnabled
  }
}

type PaneAction =
  | { readonly type: "layout" }
  | { readonly type: "sidebar" | "inspector"; readonly visible: boolean }

export function updatePanes(panes: PaneState, wide: boolean, action: PaneAction): PaneState {
  if (action.type === "inspector") {
    return {
      ...panes,
      inspectorEnabled: action.visible,
      inspectorExplicit: wide && action.visible ? panes.inspectorExplicit : action.visible,
      sidebar: !wide && action.visible ? false : panes.sidebar
    }
  }
  if (action.type === "sidebar") {
    if (!wide && action.visible && panes.inspectorExplicit) {
      return { ...panes, sidebar: true, inspectorExplicit: false, inspectorEnabled: false }
    }
    return { ...panes, sidebar: action.visible }
  }
  if (!wide && panes.sidebar && panes.inspectorExplicit) return { ...panes, sidebar: false }
  return panes
}
