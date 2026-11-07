import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, sep } from "node:path"
import {
  app,
  BrowserWindow,
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
    return "That doesn't look like a web address."
  }
  try {
    const response = await net.fetch(new URL("/api/health", url).href, {
      signal: AbortSignal.timeout(8000)
    })
    if (!response.ok) return `The server answered ${response.status}. Is this your PodList server?`
  } catch {
    return `Couldn't reach ${url.host}. Check the address, and that Tailscale is connected.`
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
    ipcMain.handle("podlist:cancel", () => window?.loadURL(`${appOrigin}/`))
    createWindow()
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })
}
