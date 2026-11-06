import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
  shell
} from "electron"

// The Mac app: a window onto the PodList server. It loads the same web build the
// phone installs, from the server's origin, so the local database (SQLite on OPFS),
// the service worker's offline copy and every UI change come with no rebuild of the
// app. Only this shell needs the local build-and-install command (ADR 0005).

// A separate profile (local database, saved server) for tests.
if (process.env.PODLIST_USER_DATA) app.setPath("userData", process.env.PODLIST_USER_DATA)

const configFile = () => join(app.getPath("userData"), "config.json")

interface Config {
  readonly serverUrl?: string
  readonly bounds?: { x: number; y: number; width: number; height: number }
}

const readConfig = (): Config => {
  try {
    return JSON.parse(readFileSync(configFile(), "utf8")) as Config
  } catch {
    return {}
  }
}
const writeConfig = (config: Config) => writeFileSync(configFile(), JSON.stringify(config, null, 2))

/** PODLIST_URL wins (development and tests), then the saved address. */
const serverUrl = () => process.env.PODLIST_URL ?? readConfig().serverUrl

const setupPage = join(import.meta.dirname, "setup.html")
const offlinePage = join(import.meta.dirname, "offline.html")

let window: BrowserWindow | undefined

const open = (win: BrowserWindow) => {
  const url = serverUrl()
  if (url === undefined) return win.loadFile(setupPage)
  return win.loadURL(url).catch(() => undefined)
}

const createWindow = () => {
  const { bounds } = readConfig()
  const win = new BrowserWindow({
    ...(bounds ?? { width: 1280, height: 820 }),
    // The zoomed-desktop layout is the narrowest the app is designed for.
    minWidth: 720,
    minHeight: 450,
    title: "PodList",
    backgroundColor: "#f6f5f2",
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: join(import.meta.dirname, "preload.cjs")
    }
  })
  window = win
  win.once("ready-to-show", () => win.show())
  win.on("close", () => writeConfig({ ...readConfig(), bounds: win.getBounds() }))

  // The server is unreachable and nothing is cached yet: say so, with a way to retry.
  win.webContents.on("did-fail-load", (_event, code, _description, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && !url.startsWith("file:")) {
      void win.loadFile(offlinePage, { query: { url: serverUrl() ?? "" } })
    }
  })

  // Links away from the server open in the default browser; the app stays on its origin.
  const sameOrigin = (url: string) => {
    const server = serverUrl()
    return server !== undefined && new URL(url).origin === new URL(server).origin
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: "deny" }
  })
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file:") || sameOrigin(url)) return
    event.preventDefault()
    if (/^https?:/.test(url)) void shell.openExternal(url)
  })

  void open(win)
  return win
}

/** Saves a server address from the setup page after checking it answers. */
const connect = async (address: string): Promise<string | null> => {
  let url: URL
  try {
    url = new URL(/^https?:\/\//.test(address) ? address : `https://${address}`)
  } catch {
    return "That doesn't look like a web address."
  }
  try {
    const response = await fetch(new URL("/api/health", url), { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return `The server answered ${response.status}. Is this your PodList server?`
  } catch {
    return `Couldn't reach ${url.host}. Check the address, and that Tailscale is connected.`
  }
  writeConfig({ ...readConfig(), serverUrl: url.origin })
  if (window) await open(window)
  return null
}

const changeServer = async () => {
  if (!window) return
  const { response } = await dialog.showMessageBox(window, {
    type: "question",
    message: "Connect to a different PodList server?",
    detail: "Listening on this Mac carries on from the new server's Library.",
    buttons: ["Change Server…", "Cancel"],
    defaultId: 0,
    cancelId: 1
  })
  if (response === 0) await window.loadFile(setupPage)
}

const menu = (): MenuItemConstructorOptions[] => [
  {
    role: "appMenu",
    submenu: [
      { role: "about" },
      { type: "separator" },
      { label: "Change Server…", click: () => void changeServer() },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit" }
    ]
  },
  { role: "editMenu" },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
      ...(app.isPackaged ? [] : [{ role: "toggleDevTools" } as const])
    ]
  },
  { role: "windowMenu" }
]

// One window, one owner of the local database: a second launch focuses the first.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (window?.isMinimized()) window.restore()
    window?.focus()
  })
  app.whenReady().then(() => {
    Menu.setApplicationMenu(Menu.buildFromTemplate(menu()))
    ipcMain.handle("podlist:connect", (_event, address: string) => connect(address))
    ipcMain.handle("podlist:server", () => serverUrl() ?? null)
    createWindow()
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })
}
