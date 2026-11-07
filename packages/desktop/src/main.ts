import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, sep } from "node:path"
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
  net,
  protocol,
  session,
  shell
} from "electron"

// The Mac app carries its own copy of the web app (ADR 0005), served from
// app://podlist so it opens without the server. Requests for /api/… are passed on to
// the PodList server by this process, so the web app talks to its own origin exactly
// as it does on the phone. Each server gets its own browser profile, and so its own
// local database.

// A separate profile (local database, saved server) for tests.
if (process.env.PODLIST_USER_DATA) app.setPath("userData", process.env.PODLIST_USER_DATA)

const scheme = "app"
const appOrigin = `${scheme}://podlist`

// A secure, standard origin: OPFS, Web Locks and media streaming work as on https.
protocol.registerSchemesAsPrivileged([
  {
    scheme,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

/** The built web app: inside the app bundle, or packages/web/dist when run from source. */
const webRoot = normalize(
  process.env.PODLIST_WEB_ROOT ??
    (app.isPackaged
      ? join(process.resourcesPath, "web")
      : join(import.meta.dirname, "../../web/dist"))
)

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

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
}

/** A file from the web build; any other path is a route, so it gets index.html. */
const serveFile = async (pathname: string) => {
  const wanted = normalize(join(webRoot, decodeURIComponent(pathname)))
  const inside = wanted.startsWith(webRoot + sep)
  const isFile = inside && (await stat(wanted).catch(() => null))?.isFile() === true
  const file = isFile ? wanted : join(webRoot, "index.html")
  return new Response(await readFile(file), {
    headers: {
      "content-type": contentTypes[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-cache"
    }
  })
}

/** Passes an API request to the server. Unreachable, it fails like a network error. */
const forward = async (request: Request, server: string) => {
  const url = new URL(request.url)
  const hasBody = request.method !== "GET" && request.method !== "HEAD"
  let upstream: Response
  try {
    upstream = await net.fetch(new URL(url.pathname + url.search, server).href, {
      method: request.method,
      headers: request.headers,
      ...(hasBody ? { body: await request.arrayBuffer() } : {})
    })
  } catch {
    return Response.error()
  }
  // net.fetch has already decoded the body.
  const headers = new Headers(upstream.headers)
  if (headers.has("content-encoding")) {
    headers.delete("content-encoding")
    headers.delete("content-length")
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  })
}

/** One browser profile per server, so each server's Library has its own local database. */
const profileFor = (server: string) => {
  const partition = `persist:${createHash("sha256").update(new URL(server).origin).digest("hex").slice(0, 16)}`
  const profile = session.fromPartition(partition)
  if (!profile.protocol.isProtocolHandled(scheme)) {
    profile.protocol.handle(scheme, (request) => {
      const { pathname } = new URL(request.url)
      return pathname.startsWith("/api/") ? forward(request, server) : serveFile(pathname)
    })
  }
  return partition
}

const setupPage = join(import.meta.dirname, "setup.html")

/** The Controls menu: the web app plays, skips and moves between Chapters. */
const sendControl = (command: string) =>
  void window?.webContents.executeJavaScript(
    `document.dispatchEvent(new CustomEvent("podlist:control", { detail: ${JSON.stringify(command)} }))`
  )

/** File menu commands the web app carries out ("podlist:command"). */
const sendCommand = (command: string) =>
  void window?.webContents.executeJavaScript(
    `document.dispatchEvent(new CustomEvent("podlist:command", { detail: ${JSON.stringify(command)} }))`
  )

/** Go menu destinations: the web app's own screens. */
const goTo = (path: string) => {
  if (window === undefined) return
  void window.webContents.executeJavaScript(
    `document.dispatchEvent(new CustomEvent("podlist:go", { detail: ${JSON.stringify(path)} }))`
  )
}

const goBack = (win: BrowserWindow) => {
  if (win.webContents.navigationHistory.canGoBack()) win.webContents.navigationHistory.goBack()
}
const goForward = (win: BrowserWindow) => {
  if (win.webContents.navigationHistory.canGoForward())
    win.webContents.navigationHistory.goForward()
}

/** The steps Edit › Undo and Redo will act on, as the web app reports them. */
/** The page's next Undo and Redo steps, and whether a text field (with its own undo) has
 * focus: with neither, Edit › Undo and Redo are dimmed. */
const undoLabels: { undo: string | null; redo: string | null; editing: boolean } = {
  undo: null,
  redo: null,
  editing: false
}

/**
 * Edit › Undo and Redo: text fields keep their own; elsewhere the web app takes back (or
 * redoes) its last step through its Cmd-Z handler, which the menu would otherwise swallow.
 */
const undo = async (win: BrowserWindow, redo: boolean) => {
  const editing = (await win.webContents.executeJavaScript(`(() => {
    const el = document.activeElement
    const editing = !!el && (el.isContentEditable || el.tagName === "TEXTAREA" ||
      (el.tagName === "INPUT" && !["checkbox", "radio", "range", "button"].includes(el.type)))
    if (!editing) document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, shiftKey: ${redo}, bubbles: true, cancelable: true }))
    return editing
  })()`)) as boolean
  if (editing) {
    if (redo) win.webContents.redo()
    else win.webContents.undo()
  }
}

/** What a row tells the shell for its right-click menu (data-row-menu; the web app's
 * components/lists/RowMenu.tsx). */
interface RowMenu {
  readonly id: string
  readonly items: ReadonlyArray<{ readonly label: string; readonly checked?: boolean } | null>
  /** The row's page in the app, offered as a link to the server. */
  readonly link?: string
}

const rowMenu = (win: BrowserWindow, row: RowMenu): MenuItemConstructorOptions[] => {
  const send = (label: string) => () =>
    void win.webContents.executeJavaScript(
      `document.dispatchEvent(new CustomEvent("podlist:row-menu", { detail: ${JSON.stringify({ id: row.id, label })} }))`
    )
  const server = serverUrl()
  const shared =
    row.link === undefined || server === undefined ? undefined : new URL(row.link, server).href
  return [
    ...row.items.map(
      (item): MenuItemConstructorOptions =>
        item === null
          ? { type: "separator" }
          : item.checked === undefined
            ? { label: item.label, click: send(item.label) }
            : {
                label: item.label,
                type: "checkbox",
                checked: item.checked,
                click: send(item.label)
              }
    ),
    ...(shared === undefined
      ? []
      : ([
          { type: "separator" },
          { label: "Open in Browser", click: () => void shell.openExternal(shared) },
          { label: "Copy Link", click: () => clipboard.writeText(shared) }
        ] satisfies MenuItemConstructorOptions[]))
  ]
}

/** Right-click: what a Mac app offers for links, selected text and text fields (BROWSER-06). */
const contextMenu = (
  win: BrowserWindow,
  params: Electron.ContextMenuParams
): MenuItemConstructorOptions[] => {
  const items: MenuItemConstructorOptions[] = []
  const link = params.linkURL
  if (link) {
    if (/^https?:/.test(link))
      items.push({ label: "Open Link in Browser", click: () => shell.openExternal(link) })
    // An in-app link is copied as the same page on the server, which opens anywhere.
    const server = serverUrl()
    const shared =
      link.startsWith(`${appOrigin}/`) && server !== undefined
        ? new URL(link.slice(appOrigin.length), server).href
        : link
    items.push({ label: "Copy Link", click: () => clipboard.writeText(shared) })
  }
  if (params.isEditable) {
    items.push(
      ...(items.length > 0 ? [{ type: "separator" } as const] : []),
      { role: "cut", enabled: params.editFlags.canCut },
      { role: "copy", enabled: params.editFlags.canCopy },
      { role: "paste", enabled: params.editFlags.canPaste },
      { role: "selectAll" }
    )
  } else if (params.selectionText.trim()) {
    const text = params.selectionText.trim()
    items.push(
      ...(items.length > 0 ? [{ type: "separator" } as const] : []),
      { role: "copy" },
      {
        label: `Look Up “${text.length > 24 ? `${text.slice(0, 24)}…` : text}”`,
        click: () => win.webContents.showDefinitionForSelection()
      }
    )
  }
  if (items.length === 0) {
    const history = win.webContents.navigationHistory
    items.push(
      { label: "Back", enabled: history.canGoBack(), click: () => goBack(win) },
      { label: "Forward", enabled: history.canGoForward(), click: () => goForward(win) },
      { type: "separator" },
      { label: "Reload", click: () => win.webContents.reload() }
    )
  }
  return items
}

let window: BrowserWindow | undefined

const createWindow = () => {
  const server = serverUrl()
  const { bounds } = readConfig()
  const win = new BrowserWindow({
    ...(window?.getBounds() ?? bounds ?? { width: 1280, height: 820 }),
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
      preload: join(import.meta.dirname, "preload.cjs"),
      ...(server === undefined ? {} : { partition: profileFor(server) })
    }
  })
  window = win
  win.once("ready-to-show", () => win.show())
  win.on("close", () => {
    if (window === win) writeConfig({ ...readConfig(), bounds: win.getBounds() })
  })

  // Links away from the app open in the default browser.
  const inApp = (url: string) => url.startsWith(`${appOrigin}/`) || url.startsWith("file:")
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: "deny" }
  })
  win.webContents.on("will-navigate", (event, url) => {
    if (inApp(url)) return
    event.preventDefault()
    if (/^https?:/.test(url)) void shell.openExternal(url)
  })
  win.webContents.on("context-menu", (_event, params) => {
    void (async () => {
      // On a row (an Episode, an Entry, a Subscription), its commands as a native menu.
      const row = (await win.webContents
        .executeJavaScript(
          `(() => { const el = document.elementFromPoint(${params.x}, ${params.y})?.closest("[data-row-menu]"); return el ? JSON.parse(el.dataset.rowMenu) : null })()`
        )
        .catch(() => null)) as RowMenu | null
      const items = row ? rowMenu(win, row) : contextMenu(win, params)
      Menu.buildFromTemplate(items).popup({ window: win })
    })()
  })
  // Three-finger swipes and mouse back/forward buttons walk history (BROWSER-09).
  win.on("swipe", (_event, direction) => {
    if (direction === "right") goBack(win)
    if (direction === "left") goForward(win)
  })
  win.on("app-command", (_event, command) => {
    if (command === "browser-backward") goBack(win)
    if (command === "browser-forward") goForward(win)
  })

  void (server === undefined ? win.loadFile(setupPage) : win.loadURL(`${appOrigin}/`))
  return win
}

/** Replaces the window, for a new server and so a new profile. */
const reopen = () => {
  const previous = window
  createWindow()
  previous?.destroy()
}

/** Saves a server address from the setup page after checking it answers. */
const connect = async (address: string): Promise<string | null> => {
  let url: URL
  try {
    url = new URL(/^https?:\/\//.test(address) ? address : `https://${address}`)
  } catch {
    return "That doesn’t look like a web address."
  }
  try {
    const response = await net.fetch(new URL("/api/health", url).href, {
      signal: AbortSignal.timeout(8000)
    })
    if (!response.ok) return `The server answered ${response.status}. Is this your PodList server?`
  } catch {
    return `Couldn’t reach ${url.host}. Check the address, and that Tailscale is connected.`
  }
  writeConfig({ ...readConfig(), serverUrl: url.origin })
  reopen()
  return null
}

const changeServer = async () => {
  if (!window) return
  const { response } = await dialog.showMessageBox(window, {
    type: "question",
    message: "Connect to a different PodList server?",
    detail:
      "Each server keeps its own Library on this Mac. Switching back later picks up where you left off.",
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
      { label: "Settings…", accelerator: "CmdOrCtrl+,", click: () => goTo("/settings") },
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
  {
    label: "File",
    submenu: [
      {
        label: "New Playlist…",
        accelerator: "CmdOrCtrl+N",
        click: () => sendCommand("newPlaylist")
      },
      { label: "New View", accelerator: "Shift+CmdOrCtrl+N", click: () => sendCommand("newView") },
      {
        label: "Add Podcasts…",
        accelerator: "Shift+CmdOrCtrl+A",
        click: () => goTo("/library?add=true")
      },
      { type: "separator" },
      { role: "close", label: "Close Window" }
    ]
  },
  {
    label: "Edit",
    submenu: [
      {
        label: undoLabels.undo ? `Undo “${undoLabels.undo}”` : "Undo",
        enabled: undoLabels.editing || undoLabels.undo !== null,
        accelerator: "CmdOrCtrl+Z",
        click: () => {
          if (window) void undo(window, false)
        }
      },
      {
        label: undoLabels.redo ? `Redo “${undoLabels.redo}”` : "Redo",
        enabled: undoLabels.editing || undoLabels.redo !== null,
        accelerator: "Shift+CmdOrCtrl+Z",
        click: () => {
          if (window) void undo(window, true)
        }
      },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" }
    ]
  },
  {
    label: "View",
    submenu: [
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
      // Reload and the developer tools only when run from source.
      ...(app.isPackaged
        ? []
        : [
            { type: "separator" } as const,
            { role: "reload" } as const,
            { role: "toggleDevTools" } as const
          ])
    ]
  },
  {
    label: "Controls",
    submenu: [
      // Space is the web app's own key; shown here, not taken from text fields.
      {
        label: "Play/Pause",
        accelerator: "Space",
        registerAccelerator: false,
        click: () => sendControl("toggle")
      },
      { type: "separator" },
      { label: "Back 15 Seconds", accelerator: "CmdOrCtrl+Left", click: () => sendControl("back") },
      {
        label: "Forward 30 Seconds",
        accelerator: "CmdOrCtrl+Right",
        click: () => sendControl("forward")
      },
      { type: "separator" },
      {
        label: "Previous Chapter",
        accelerator: "Alt+CmdOrCtrl+Left",
        click: () => sendControl("previousChapter")
      },
      {
        label: "Next Chapter",
        accelerator: "Alt+CmdOrCtrl+Right",
        click: () => sendControl("nextChapter")
      }
    ]
  },
  {
    label: "Go",
    submenu: [
      { label: "Views", accelerator: "CmdOrCtrl+1", click: () => goTo("/views") },
      { label: "Playlists", accelerator: "CmdOrCtrl+2", click: () => goTo("/playlists") },
      { label: "Library", accelerator: "CmdOrCtrl+3", click: () => goTo("/library") },
      { label: "Search", accelerator: "CmdOrCtrl+K", click: () => goTo("/search") },
      { type: "separator" },
      {
        label: "Back",
        accelerator: "CmdOrCtrl+[",
        click: () => {
          if (window) goBack(window)
        }
      },
      {
        label: "Forward",
        accelerator: "CmdOrCtrl+]",
        click: () => {
          if (window) goForward(window)
        }
      }
    ]
  },
  { role: "windowMenu" },
  {
    role: "help",
    submenu: [
      { label: "Getting Started", click: () => sendCommand("gettingStarted") },
      {
        label: "Keyboard Shortcuts",
        accelerator: "CmdOrCtrl+/",
        click: () =>
          void window?.webContents.executeJavaScript(
            `document.dispatchEvent(new CustomEvent("podlist:shortcuts"))`
          )
      }
    ]
  }
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
    ipcMain.handle("podlist:cancel", () => window?.loadURL(`${appOrigin}/`))
    ipcMain.on("podlist:undo-redo", (_event, undoStep: unknown, redoStep: unknown, editing) => {
      undoLabels.undo = typeof undoStep === "string" ? undoStep : null
      undoLabels.redo = typeof redoStep === "string" ? redoStep : null
      undoLabels.editing = editing === true
      Menu.setApplicationMenu(Menu.buildFromTemplate(menu()))
    })
    createWindow()
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })
}
