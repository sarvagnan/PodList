import { describe, expect, test } from "vitest"
import {
  initialPanes,
  inspectorPresentation,
  restorePanes,
  updatePanes
} from "./desktopPaneState.ts"

describe("Electron Library panes", () => {
  test("wide selection controls presentation without overwriting the preference", () => {
    expect(inspectorPresentation(initialPanes, true, false)).toEqual({
      visible: false,
      canToggle: false
    })
    expect(inspectorPresentation(initialPanes, true, true).visible).toBe(true)
    expect(inspectorPresentation(initialPanes, true, false).visible).toBe(false)
    const hidden = updatePanes(initialPanes, true, { type: "inspector", visible: false })
    expect(inspectorPresentation(hidden, true, true).visible).toBe(false)
    expect(inspectorPresentation(hidden, true, false).canToggle).toBe(true)
    const enabled = updatePanes(hidden, true, { type: "inspector", visible: true })
    expect(enabled).toEqual(initialPanes)
  })

  test("narrow selection never swaps panes and explicit open works on an empty list", () => {
    expect(inspectorPresentation(initialPanes, false, true).visible).toBe(false)
    const open = updatePanes(initialPanes, false, { type: "inspector", visible: true })
    expect(open.sidebar).toBe(false)
    expect(inspectorPresentation(open, false, false).visible).toBe(true)
    expect(inspectorPresentation(open, false, true).visible).toBe(true)
    const closed = updatePanes(open, false, { type: "inspector", visible: false })
    expect(closed.sidebar).toBe(false)
    expect(inspectorPresentation(closed, false, true).visible).toBe(false)
  })

  test("showing the sidebar wins a narrow pane swap without re-enabling on resize", () => {
    const open = updatePanes(initialPanes, false, { type: "inspector", visible: true })
    const restoredSidebar = updatePanes(open, false, { type: "sidebar", visible: true })
    expect(restoredSidebar).toMatchObject({
      sidebar: true,
      inspectorExplicit: false,
      inspectorEnabled: false
    })
    expect(inspectorPresentation(restoredSidebar, true, true).visible).toBe(false)
  })

  test("resize gives an explicitly opened Inspector priority and keeps the sidebar choice", () => {
    expect(inspectorPresentation(initialPanes, false, true).visible).toBe(false)
    const narrow = updatePanes(initialPanes, false, { type: "inspector", visible: true })
    const wide = updatePanes(narrow, true, { type: "layout" })
    expect(wide.sidebar).toBe(false)
    expect(inspectorPresentation(wide, true, false).visible).toBe(false)
    expect(inspectorPresentation(wide, true, true).visible).toBe(true)
    const both = updatePanes(wide, true, { type: "sidebar", visible: true })
    expect(inspectorPresentation(both, true, true).visible).toBe(true)
    expect(updatePanes(both, false, { type: "layout" })).toEqual(narrow)
  })

  test("older or malformed saved data keeps defaults and valid widths are bounded", () => {
    expect(restorePanes(null)).toEqual(initialPanes)
    expect(
      restorePanes({
        sidebar: false,
        inspectorEnabled: false,
        sidebarWidth: 1,
        inspectorWidth: 999
      })
    ).toEqual({
      ...initialPanes,
      sidebar: false,
      inspectorEnabled: false,
      sidebarWidth: 180,
      inspectorWidth: 440
    })
  })
})
