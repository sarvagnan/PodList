import type { MenuItemConstructorOptions } from "electron"

// Native roles can show UI without going through our click callbacks. Allow only
// roles that operate on the hidden renderer, hide/close it, or quit. In particular,
// About, Services, Show All, the Window menu, fullscreen and DevTools stay disabled.
const quietRoles = new Set([
  "appMenu",
  "help",
  "undo",
  "redo",
  "cut",
  "copy",
  "paste",
  "selectAll",
  "hide",
  "close",
  "quit",
  "resetZoom",
  "zoomIn",
  "zoomOut",
  "reload"
])

export const hiddenMenu = (items: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] =>
  items.map((item) => ({
    ...item,
    ...(item.role && !quietRoles.has(item.role) ? { enabled: false } : {}),
    ...(Array.isArray(item.submenu) ? { submenu: hiddenMenu(item.submenu) } : {})
  }))
