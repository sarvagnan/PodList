import type { MenuItemConstructorOptions } from "electron"
import { describe, expect, it } from "vitest"
import { hiddenMenu } from "./hidden-window.ts"

describe("hidden capture menus", () => {
  it("blocks native roles that can surface UI, including nested roles", () => {
    const roles = [
      "about",
      "services",
      "unhide",
      "hideOthers",
      "windowMenu",
      "front",
      "togglefullscreen",
      "toggleDevTools",
      "recentDocuments",
      "zoom"
    ] as const
    const source: MenuItemConstructorOptions[] = [
      {
        role: "appMenu",
        submenu: roles.map((role) => ({ role }))
      }
    ]
    const result = hiddenMenu(source)
    expect(result[0]?.enabled).toBeUndefined()
    expect(result[0]?.submenu).toEqual(roles.map((role) => ({ role, enabled: false })))
    // Building a capture menu must not alter the normal application's template.
    expect(source[0]?.submenu).toEqual(roles.map((role) => ({ role })))
  })

  it("preserves navigation callbacks, accelerators and quiet role state", () => {
    const click = () => {}
    const source: MenuItemConstructorOptions[] = [
      { label: "Settings…", accelerator: "CmdOrCtrl+,", click },
      { role: "copy", enabled: false },
      { role: "reload" },
      { role: "quit" }
    ]
    expect(hiddenMenu(source)).toEqual(source)
  })
})
