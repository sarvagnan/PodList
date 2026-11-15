/// <reference lib="dom" />
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page
} from "@playwright/test"
// @ts-expect-error: shared plain-JS screen walks; importing does not launch a browser
import { createFlows, settle } from "../../web/ui-flows/screens.mjs"
import { startFocusGuard } from "./focus-guard.ts"

if (process.env.ELECTRON_RUN_AS_NODE)
  throw new Error(
    "Run outside Codex: env -u ELECTRON_RUN_AS_NODE pnpm --filter @podlist/desktop ui:capture [outDir]"
  )
if (process.platform !== "darwin") throw new Error("The frontmost-app guard requires macOS.")

// Set this before importing the demo: its relative-date Views must match today.
process.env.PODLIST_TEST_DEMO_NOW = String(Date.now())
// @ts-expect-error: same demo server used by the existing desktop app tests
const { startDemo } = await import("../../web/ui-flows/demo.mjs")
const appDir = resolve(import.meta.dirname, "..")
process.env.PODLIST_TEST_WEB_ROOT = resolve(appDir, "../web/dist-desktop")
const out = resolve(
  process.argv[2] ?? `/tmp/podlist-desktop-ui/${new Date().toISOString().replace(/[:.]/g, "-")}`
)
mkdirSync(out, { recursive: true })
const temporary = mkdtempSync(join(tmpdir(), "podlist-capture-"))
const rows: {
  flow: string
  theme: string
  step: number
  label: string
  url: string
  screenshot: string
  accessibility: string
}[] = []
const goto = (page: Page, path: string) => page.goto(`app://podlist${path}`)

/** Observe every show/focus event, not just the window's state at each screenshot. */
const installWindowGuard = (app: ElectronApplication) =>
  app.evaluate(({ app, BrowserWindow }) => {
    const violations: string[] = []
    ;(globalThis as { captureViolations?: string[] }).captureViolations = violations
    const watch = (win: Electron.BrowserWindow) => {
      if (win.isVisible()) violations.push(`Window ${win.id} was visible`)
      if (win.isFocused()) violations.push(`Window ${win.id} was focused`)
      win.on("show", () => {
        violations.push(`Window ${win.id} shown`)
      })
      win.on("focus", () => {
        violations.push(`Window ${win.id} focused`)
      })
    }
    app.on("browser-window-created", (_event, win) => watch(win))
    BrowserWindow.getAllWindows().forEach(watch)
  })

const assertHidden = async (app: ElectronApplication) => {
  const state = await app.evaluate(({ BrowserWindow }) => ({
    hidden: BrowserWindow.getAllWindows().every((win) => !win.isVisible()),
    unthrottled: BrowserWindow.getAllWindows().every(
      (win) => !win.webContents.getBackgroundThrottling()
    ),
    violations: (globalThis as { captureViolations?: string[] }).captureViolations ?? []
  }))
  assert.equal(state.hidden, true, "Every native BrowserWindow must remain hidden")
  assert.equal(state.unthrottled, true, "Hidden renderers must keep painting")
  assert.deepEqual(state.violations, [], "A hidden window was shown or focused")
}

let guard: Awaited<ReturnType<typeof startFocusGuard>> | undefined
class Recorder {
  private n = 0
  readonly page: Page
  readonly app: ElectronApplication
  readonly flow: string
  readonly theme: string
  constructor(page: Page, app: ElectronApplication, flow: string, theme: string) {
    this.page = page
    this.app = app
    this.flow = flow
    this.theme = theme
  }
  async step(
    label: string,
    action?: ((page: Page) => unknown) | null,
    options: { wait?: (page: Page) => Promise<unknown>; caused?: boolean } = {}
  ) {
    guard?.assert()
    await assertHidden(this.app)
    if (action) await action(this.page)
    await (options.wait ?? settle)(this.page)
    await this.page.evaluate(() => document.fonts.ready)
    await assertHidden(this.app)
    guard?.assert()
    const dir = join("strips", this.flow, `desktop-${this.theme}`)
    mkdirSync(join(out, dir), { recursive: true })
    const name = `${String(++this.n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
    const screenshot = join(dir, `${name}.png`)
    const accessibility = join(dir, `${name}.aria.txt`)
    const scale = await this.page.evaluate(() => window.devicePixelRatio)
    assert.equal(scale, 2, "Capture must use device scale 2")
    await this.page.screenshot({ path: join(out, screenshot), scale: "device" })
    writeFileSync(join(out, accessibility), `${await this.page.locator("body").ariaSnapshot()}\n`)
    await assertHidden(this.app)
    guard?.assert()
    rows.push({
      flow: this.flow,
      theme: this.theme,
      step: this.n,
      label,
      url: this.page.url(),
      screenshot,
      accessibility
    })
    writeFileSync(join(out, "measurements.json"), JSON.stringify(rows, null, 2))
    console.log(`${this.theme}/${this.flow}: ${label}`)
  }
}

const desktopScreens = async (rec: Recorder) => {
  const { page } = rec
  await rec.step("Playlists", (p) => goto(p, "/playlists"))
  await rec.step("New Playlist", async (p) => {
    // The page's text button; the navigation rail has an icon-only "New Playlist" too.
    await p
      .getByRole("button", { name: "New Playlist", exact: true })
      .filter({ hasText: "New Playlist" })
      .click()
    await p.getByRole("dialog", { name: "New Playlist" }).waitFor()
  })
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click()
  await rec.step("Playlist settings", (p) => goto(p, "/playlists/default/settings"))
  await rec.step("Trash", (p) => goto(p, "/playlists/trash"))
  await rec.step("Search", (p) => goto(p, "/search"))
  await rec.step("Search results and Refine", (p) => goto(p, "/search?q=rice"))
  await rec.step("View editor", (p) => goto(p, "/views/new-this-week?edit=true"))
  await rec.step("Library", (p) => goto(p, "/library"))
  await rec.step("Podcast and its settings", async (p) => {
    await p.getByRole("main").getByRole("link", { name: "Deep Field", exact: true }).click()
    await p.getByRole("heading", { name: "Deep Field", level: 1 }).waitFor()
  })
  await rec.step("Episode details", async (p) => {
    await p
      .getByRole("link", { name: "The quiet edge of the solar system", exact: true })
      .first()
      .click()
    await p.getByRole("heading", { name: "The quiet edge of the solar system" }).waitFor()
  })
  await rec.step("Add podcasts", (p) => goto(p, "/library?add=true"))
  const add = page.getByRole("dialog", { name: "Add podcasts" })
  await rec.step("Add podcast search results", async () => {
    await add.getByRole("searchbox", { name: "Podcast name" }).fill("Deep Field")
    await add.getByText("Subscribed", { exact: true }).waitFor()
  })
  await rec.step("Add podcast feed address", () =>
    add.getByRole("button", { name: "Feed address", exact: true }).click()
  )
  await add.getByRole("button", { name: "Close", exact: true }).click()
  await rec.step("Desktop Settings", async (p) => {
    await goto(p, "/settings")
    await p.getByRole("checkbox", { name: "Enable MCP server" }).waitFor()
  })
  await rec.step("Settings import and export controls", (p) =>
    p.getByRole("region", { name: "OPML import and export" }).scrollIntoViewIfNeeded()
  )
  const automation = page.getByRole("region", { name: "Automation", exact: true })
  await rec.step("Automation MCP disabled", () => automation.scrollIntoViewIfNeeded())
  await rec.step("Automation MCP enabled", async (p) => {
    await p.getByRole("checkbox", { name: "Enable MCP server" }).check()
    await p.getByRole("button", { name: "Copy configuration" }).waitFor()
    await expect(automation.getByRole("alert")).toHaveCount(0)
    await automation.scrollIntoViewIfNeeded()
  })
  // Never click Copy configuration: the owner's clipboard is not a capture fixture.
  await page.getByRole("checkbox", { name: "Enable MCP server" }).uncheck()
  await rec.step("Listening Stats", (p) => goto(p, "/listening-stats"))
  await rec.step("Keyboard Shortcuts", async () => {
    await chooseMenu(rec.app, "Keyboard Shortcuts")
    await page.getByRole("dialog").waitFor()
  })
  await page.keyboard.press("Escape")
  await rec.step("Getting Started", async () => {
    await chooseMenu(rec.app, "Getting Started")
    await page.getByRole("heading", { name: "Welcome to PodList" }).waitFor()
  })
}

const setupScreens = async (rec: Recorder) => {
  await rec.step("Connect to your PodList server")
  await rec.step("Invalid server address", async (page) => {
    await page.getByRole("textbox", { name: "Server address" }).fill("http://[")
    await page.getByRole("button", { name: "Connect", exact: true }).click()
    await expect(page.getByRole("alert")).toContainText("doesn’t look like a web address")
  })
}

const chooseMenu = (app: ElectronApplication, label: string) =>
  app.evaluate(({ Menu }, label) => {
    const find = (menu: Electron.Menu): Electron.MenuItem | undefined => {
      for (const item of menu.items) {
        if (item.label === label) return item
        const found = item.submenu && find(item.submenu)
        if (found) return found
      }
    }
    const menu = Menu.getApplicationMenu()
    const item = menu && find(menu)
    if (!item) throw new Error(`Missing menu command: ${label}`)
    item.click()
  }, label)

const dumpMenus = (app: ElectronApplication) =>
  app.evaluate(({ Menu }) => {
    const walk = (menu: Electron.Menu, depth = 0): string[] =>
      menu.items.flatMap((item) => {
        if (item.role === "services") return []
        const line = `${"  ".repeat(depth)}${item.type === "separator" ? "---" : item.label} | accelerator=${item.accelerator ?? "-"} | enabled=${item.enabled} | checked=${item.checked}`
        return [line, ...(item.submenu ? walk(item.submenu, depth + 1) : [])]
      })
    const menu = Menu.getApplicationMenu()
    if (!menu) throw new Error("No native application menu")
    return walk(menu).join("\n")
  })

const shared = createFlows(Recorder, goto) as Record<string, (rec: Recorder) => Promise<void>>
const flows = new Map<string, (rec: Recorder) => Promise<void>>([
  ...["browse", "listen", "now playing"].map((name) => {
    const run = shared[name]
    assert(run, `Missing shared flow: ${name}`)
    return [name, run] as const
  }),
  ["desktop", desktopScreens],
  ["setup", setupScreens]
])
let succeeded = false
let failure: unknown
writeFileSync(
  join(out, "README.md"),
  `# Hidden Electron UI capture

Run date: ${new Date(Number(process.env.PODLIST_TEST_DEMO_NOW)).toISOString()}
Desktop renderer: 1440×900 CSS pixels, device scale 2, light and dark via nativeTheme.themeSource.
Each flow uses a fresh profile and the web ui-flows demo server (local fictional podcasts).
PNG screenshots and body ariaSnapshot text are paired in strips/<flow>/desktop-<theme>/.
measurements.json indexes the screens; menus.txt records native menu labels, accelerators and state.
focus.json contains only PIDs: frontmost before, all activation events, and frontmost after.
window-guard.json records per-launch visibility/focus guard results.

Not captured: native window frame, native dialogs (Open/Save, OPML import/export,
Change Server, About, Services), native context-menu popups, OS notifications and tray
(the app currently has neither notifications nor a tray).
OPML controls are shown in Settings but never invoked. No owner files or clipboard are read.
Native UI roles are disabled in hidden mode; menus.txt reflects this test-mode state.
The web-only second-tab takeover is omitted: the desktop app enforces a single window.
The held-catalogue fresh-device flow is omitted: Electron syncs through its main process
into its own local database, rather than the web client's fetch path. Startup sync is
awaited on each fresh profile. The shared browse/listen/now-playing walks are unchanged.
The desktop connection page and inline address error are included. Both the current
web UI and setup page use fixed light palettes (with a dark player); native dark
appearance is captured as implemented, so many light/dark images will look identical.

A successful run must end with PASS in summary.md. Partial output is retained on failure.
`
)

const windowChecks: { theme: string; flow: string; passed: boolean }[] = []
try {
  guard = await startFocusGuard(out, temporary)
  for (const theme of ["light", "dark"] as const) {
    for (const [flow, run] of flows) {
      guard.assert()
      const demo = await startDemo()
      let app: ElectronApplication | undefined
      try {
        const profile = mkdtempSync(join(temporary, "profile-"))
        const env = { ...(process.env as Record<string, string>) }
        delete env.PODLIST_URL
        // No foreground/show/bringToFront calls, no native menu popup, no emulated color scheme.
        app = await electron.launch({
          cwd: appDir,
          args: ["--force-device-scale-factor=2", "."],
          colorScheme: null,
          env: {
            ...env,
            PODLIST_HIDDEN_WINDOW: "1",
            PODLIST_USER_DATA: profile,
            ...(flow === "setup" ? {} : { PODLIST_URL: demo.base }),
            PODLIST_WEB_ROOT: resolve(appDir, "../web/dist-desktop")
          }
        })
        const pid = app.process().pid
        assert(pid, "Electron must have a process ID")
        guard.addElectron(pid)
        await installWindowGuard(app)
        await assertHidden(app)
        await app.evaluate(({ nativeTheme }, theme) => {
          nativeTheme.themeSource = theme
        }, theme)
        const page = await app.firstWindow()
        const win = await app.browserWindow(page)
        await win.evaluate((win) => win.setContentSize(1440, 900))
        page.setDefaultTimeout(15_000)
        if (flow === "setup") {
          await expect(
            page.getByRole("heading", { name: "Connect to your PodList server" })
          ).toBeVisible()
        } else {
          await expect(page.getByRole("heading", { name: "New this week", level: 1 })).toBeVisible()
          await expect(
            page
              .getByRole("navigation", { name: "Library and lists" })
              .getByRole("link", { name: /^Commute/ })
          ).toBeVisible()
        }
        await expect
          .poll(() => page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches))
          .toBe(theme === "dark")
        // Exercise event-driven reveal paths while the observer watches all show/focus events.
        await app.evaluate(({ app }) => {
          app.emit("activate")
          app.emit("second-instance")
        })
        await assertHidden(app)
        if (flow === "browse" && theme === "light")
          writeFileSync(join(out, "menus.txt"), `${await dumpMenus(app)}\n`)
        const rec = new Recorder(page, app, flow, theme)
        await guard.run(() => run(rec))
        await assertHidden(app)
        windowChecks.push({ theme, flow, passed: true })
      } finally {
        try {
          if (app) {
            try {
              await assertHidden(app)
            } finally {
              await app.close()
            }
          }
        } finally {
          demo.stop()
          await demo.stopped
        }
      }
    }
  }
  succeeded = true
} catch (error) {
  failure = error
} finally {
  try {
    await guard?.stop()
  } catch (error) {
    succeeded = false
    failure ??= error
  } finally {
    writeFileSync(join(out, "window-guard.json"), JSON.stringify(windowChecks, null, 2))
    writeFileSync(
      join(out, "summary.md"),
      `# Desktop capture: ${succeeded ? "PASS" : "FAIL"}\n\n${rows.length} screens captured. See README.md for scope and guard logs.\n`
    )
    rmSync(temporary, { recursive: true, force: true })
  }
}
if (!succeeded) throw failure ?? new Error("Hidden capture failed")
console.log(`Output: ${out}`)
