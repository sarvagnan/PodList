import { spawn } from "node:child_process"
import { once } from "node:events"
import { existsSync, mkdtempSync } from "node:fs"
import { connect } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline"
import { expect } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { appDir, electronBinary, environment, test } from "./electron-fixture.ts"

test("runs its own copy of the web app, with a local database, and opens offline", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    expect(page.url()).toMatch(/^app:\/\/podlist\//)
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    await expect(page.getByRole("heading", { name: "New this week", level: 1 })).toBeVisible()
    // Synced through the app's pass-through into SQLite on OPFS inside Electron.
    await expect(sidebar.getByRole("link", { name: /^Commute/ })).toBeVisible()

    // Exercise MCP in this existing launch; no extra Electron windows.
    expect(existsSync(join(profile, "mcp.sock"))).toBe(false)
    await sidebar.getByRole("link", { name: "Settings", exact: true }).click()
    const appearance = page.getByRole("combobox", { name: "Appearance" })
    await expect(appearance).toHaveValue("system")
    await appearance.selectOption("dark")
    await expect
      .poll(() => page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches))
      .toBe(true)
    await appearance.selectOption("light")
    await expect
      .poll(() => page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches))
      .toBe(false)
    await appearance.selectOption("system")
    await page.getByRole("tab", { name: "Automation" }).click()
    const toggle = page.getByRole("checkbox", { name: "Enable MCP server" })
    await expect(toggle).not.toBeChecked()
    await expect(
      page.getByText(
        "Any app running as this user on this computer can then read the Library and control playback",
        { exact: true }
      )
    ).toBeVisible()
    await toggle.check()
    await expect(page.getByRole("button", { name: "Copy configuration" })).toBeVisible()
    const config = await page.evaluate(
      async () =>
        JSON.parse(
          (
            await (
              globalThis as {
                podlistApp?: { automation?: { status: () => Promise<{ configuration: string }> } }
              }
            ).podlistApp?.automation?.status()
          )?.configuration ?? "{}"
        ).mcpServers.podlist
    )
    expect(Object.keys(config).sort()).toEqual(["args", "command"])
    const socket = connect(config.args[1])
    socket.on("error", () => {})
    await once(socket, "connect")
    const lines = createInterface({ input: socket })
    const mcp = async (name: string, args: Record<string, unknown> = {}) => {
      const response = once(lines, "line")
      socket.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} }, name, arguments: args } })}\n`
      )
      return JSON.parse((await response)[0]).result
    }
    expect((await mcp("list_playlists")).structuredContent.playlists).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Commute" })])
    )
    const episodes = (await mcp("list_episodes", { playlist_id: "default" })).structuredContent
      .episodes
    const changed = await mcp("set_starred", { episode_ids: [episodes[0].id], starred: true })
    expect(changed.structuredContent.undo).toBe("Undo Star")
    await expect
      .poll(() =>
        app.evaluate(
          ({ Menu }) =>
            Menu.getApplicationMenu()?.items.find((item) => item.label === "Edit")?.submenu
              ?.items[0]?.label
        )
      )
      .toBe("Undo “Star”")
    await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu()
        ?.items.find((item) => item.label === "Edit")
        ?.submenu?.items[0]?.click()
    )
    await expect
      .poll(
        async () =>
          (await mcp("list_episodes", { playlist_id: "default" })).structuredContent.episodes[0]
            .starred
      )
      .toBe(episodes[0].starred)
    const closed = once(socket, "close")
    await toggle.uncheck()
    await closed
    expect(existsSync(join(profile, "mcp.sock"))).toBe(false)

    // Audio streams directly from the podcast host.
    await sidebar.getByRole("link", { name: /^Default/ }).click()
    const player = page.getByRole("region", { name: "Now playing" })
    await page
      .getByRole("button", { name: /^Play .* from here$/ })
      .first()
      .click()
    await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
    const slider = player.getByRole("slider", { name: "Position" })
    const start = await slider.getAttribute("aria-valuetext")
    await expect
      .poll(() => slider.getAttribute("aria-valuetext"), { timeout: 5000 })
      .not.toBe(start)
    await close(app)

    // With the server gone, the app still opens, on the screen it was left on.
    demo.stop()
    const offline = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const again = await offline.firstWindow()
    // It reopens where it was left.
    await expect(again.getByRole("heading", { name: "Default", level: 1 })).toBeVisible()
    await expect(
      again
        .getByRole("navigation", { name: "Library and lists" })
        .getByRole("link", { name: /^Commute/ })
    ).toBeVisible()
    await expect(
      again.getByRole("status").filter({ hasText: "Can’t reach your PodList server" })
    ).toBeVisible()
    await close(offline)
  } finally {
    demo.stop()
  }
})

test("each server gets its own local database", async ({ desktop: { launch, close } }) => {
  const first = await startDemo()
  const second = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  const commuteLink = (page: import("@playwright/test").Page) =>
    page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: /^Commute/ })
  try {
    const app = await launch({ PODLIST_URL: first.base, PODLIST_USER_DATA: profile })
    await expect(commuteLink(await app.firstWindow())).toBeVisible()
    await close(app)
    // A different server starts from an empty local database, then syncs its own.
    second.stop()
    const other = await launch({ PODLIST_URL: second.base, PODLIST_USER_DATA: profile })
    const page = await other.firstWindow()
    await expect(
      page.getByRole("status").filter({ hasText: "Can’t reach your PodList server" })
    ).toBeVisible()
    await expect(commuteLink(page)).toHaveCount(0)
    await close(other)
  } finally {
    first.stop()
    second.stop()
  }
})

test("asks for the server address on first launch and checks it answers", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const app = await launch({ PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    await expect(
      page.getByRole("heading", { name: "Connect to your PodList server" })
    ).toBeVisible()
    const address = page.getByRole("textbox", { name: "Server address" })
    await expect(address).toBeFocused()
    await address.fill("127.0.0.1:1")
    await page.getByRole("button", { name: "Connect" }).click()
    await expect(page.getByRole("alert")).toContainText("Couldn’t reach 127.0.0.1:1")
    await expect(page.getByRole("button", { name: "Cancel" })).toBeHidden()
    await address.fill(demo.base)
    // The server's own profile opens in a new window.
    const opened = app.waitForEvent("window")
    await page.getByRole("button", { name: "Connect" }).click()
    const appPage = await opened
    await expect(appPage.getByRole("heading", { name: "New this week", level: 1 })).toBeVisible()
    expect(app.windows()).toHaveLength(1)
    await close(app)
  } finally {
    demo.stop()
  }
})

test("a second launch hands over to the open window", async ({ desktop: { launch, close } }) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const first = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    await (await first.firstWindow())
      .getByRole("heading", { name: "New this week", level: 1 })
      .waitFor()
    const second = spawn(electronBinary, ["."], {
      cwd: appDir,
      env: environment({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    })
    const code = await new Promise<number | null>((resolve) => second.once("exit", resolve))
    expect(code).toBe(0)
    expect(first.windows()).toHaveLength(1)
    await close(first)
  } finally {
    demo.stop()
  }
})

test("the File menu makes a Playlist or a View and adds podcasts", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    await expect(page.getByRole("heading", { name: "New this week", level: 1 })).toBeVisible()
    const choose = (label: string) =>
      app.evaluate(({ Menu }, label) => {
        const file = Menu.getApplicationMenu()?.items.find((item) => item.label === "File")
        file?.submenu?.items.find((item) => item.label === label)?.click()
      }, label)

    const shortcuts = await app.evaluate(({ Menu }) => {
      const file = Menu.getApplicationMenu()?.items.find(({ label }) => label === "File")
      return file?.submenu?.items.slice(0, 2).map(({ accelerator }) => accelerator)
    })
    expect(shortcuts).toEqual(["Shift+CmdOrCtrl+N", "CmdOrCtrl+N"])

    await choose("New Playlist…")
    await expect(page.getByRole("dialog", { name: "New Playlist" })).toBeVisible()
    await page.keyboard.press("Escape")

    await choose("New View")
    await expect(page.getByRole("heading", { name: "Edit View" })).toBeVisible()

    await choose("Add Podcasts…")
    await expect(page.getByRole("dialog", { name: "Add podcasts" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible()
    // Again, from the Library itself.
    await choose("Add Podcasts…")
    await expect(page.getByRole("dialog", { name: "Add podcasts" })).toBeVisible()
    await close(app)
  } finally {
    demo.stop()
  }
})

test("right-click on a row shows its commands as a native menu", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    // Keep the menu instead of showing it, so the test can read and choose from it.
    await app.evaluate(({ Menu }) => {
      Menu.prototype.popup = function (this: Electron.Menu) {
        ;(globalThis as { shown?: Electron.Menu }).shown = this
      }
    })
    const shown = () =>
      app.evaluate(() =>
        (globalThis as { shown?: Electron.Menu }).shown?.items.map((item) => item.label)
      )
    await page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: /^Default/ })
      .click()
    const titles = () =>
      page
        .locator("main [role=row] [data-cell=title]")
        .evaluateAll((cells) => cells.map((cell) => cell.textContent ?? ""))
    await page.locator("main [role=row] [data-cell=title]").first().waitFor()
    const before = await titles()

    await page.locator('main [data-row="0"]').click({ button: "right" })
    await expect.poll(shown).toContain("Move to Bottom")
    expect(await shown()).toEqual(expect.arrayContaining(["Open in Browser", "Copy Link"]))
    await app.evaluate(() =>
      (globalThis as { shown?: Electron.Menu }).shown?.items
        .find((item) => item.label === "Move to Bottom")
        ?.click()
    )
    await expect.poll(titles).toEqual([...before.slice(1), before[0]])
    await close(app)
  } finally {
    demo.stop()
  }
})

test("downloads host audio without CORS while the server is unreachable", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-direct-download-"))
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    await page.setViewportSize({ width: 1600, height: 1000 })
    const row = page.getByRole("row").filter({ hasText: "Joinery without screws" })
    await expect(row.getByRole("button", { name: "Download", exact: true })).toBeVisible()
    await page.route("app://podlist/api/**", (route) => route.abort())
    await row.getByRole("button", { name: "Download", exact: true }).click()
    await expect(row.getByRole("button", { name: "Downloaded", exact: true })).toBeVisible()
    // A web renderer still rejects CORS-less host fetches; only our private route bypasses CORS.
    const result = await page.evaluate(async (fixtures) => {
      try {
        await fetch(`${fixtures}/audio/slow-build/0.mp3`)
        return true
      } catch {
        return false
      }
    }, demo.fixtures)
    expect(result).toBe(false)
    expect(
      await page.evaluate(
        async () =>
          (await fetch("app://podlist/audio-download?url=file%3A%2F%2F%2Fetc%2Fhosts")).status
      )
    ).toBe(400)
  } finally {
    await close(app)
    demo.stop()
  }
})

test("the View menu opens Listening stats at its own address", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    try {
      const page = await app.firstWindow()
      await expect(page.getByRole("heading", { name: "New this week", level: 1 })).toBeVisible()
      await app.evaluate(({ Menu }) => {
        const view = Menu.getApplicationMenu()?.items.find((item) => item.label === "View")
        const stats = view?.submenu?.items.find((item) => item.label === "Listening Stats")
        if (!stats) throw new Error("Listening Stats is missing from View")
        stats.click()
      })
      await expect(page).toHaveURL(/\/listening-stats$/)
      await expect(page.getByRole("heading", { name: "Listening stats", level: 1 })).toBeVisible()
      await page.getByRole("link", { name: "Settings", exact: true }).last().click()
      await page.getByRole("link", { name: "Listening stats", exact: true }).click()
      await expect(page).toHaveURL(/\/listening-stats$/)
    } finally {
      await close(app)
    }
  } finally {
    demo.stop()
  }
})

test("misspelled text offers dictionary suggestions, replacement and learning (BROWSER-07)", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-spelling-"))
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    await page.getByRole("heading", { name: "New this week", level: 1 }).waitFor()
    await page.getByRole("button", { name: "New Playlist", exact: true }).click()
    const name = page.getByRole("textbox", { name: "Name", exact: true })
    await name.fill("recieve")
    // Supply Chromium's spellcheck event deterministically: the OS dictionary varies by Mac.
    await app.evaluate(({ Menu, BrowserWindow }) => {
      Menu.prototype.popup = function (this: Electron.Menu) {
        ;(globalThis as { shown?: Electron.Menu }).shown = this
      }
      const contents = BrowserWindow.getAllWindows()[0]?.webContents
      if (!contents) throw new Error("No app window")
      const calls = { replacement: "", learned: "" }
      ;(globalThis as { spelling?: typeof calls }).spelling = calls
      contents.replaceMisspelling = (text) => {
        calls.replacement = text
      }
      contents.session.addWordToSpellCheckerDictionary = (word) => {
        calls.learned = word
        return true
      }
      contents.emit(
        "context-menu",
        {},
        {
          x: 0,
          y: 0,
          linkURL: "",
          selectionText: "recieve",
          isEditable: true,
          misspelledWord: "recieve",
          dictionarySuggestions: ["receive", "receiver"],
          editFlags: { canCut: true, canCopy: true, canPaste: true, canUndo: true, canRedo: false }
        }
      )
    })
    const shown = () =>
      app.evaluate(() =>
        (globalThis as { shown?: Electron.Menu }).shown?.items.map((item) => item.label)
      )
    await expect.poll(shown).toContain("Add to Dictionary")
    expect((await shown())?.slice(0, 5)).toEqual([
      "receive",
      "receiver",
      "",
      "Add to Dictionary",
      ""
    ])
    await app.evaluate(() => {
      const menu = (globalThis as { shown?: Electron.Menu }).shown
      menu?.items.find((item) => item.label === "receive")?.click()
      menu?.items.find((item) => item.label === "Add to Dictionary")?.click()
    })
    expect(await app.evaluate(() => (globalThis as { spelling?: unknown }).spelling)).toEqual({
      replacement: "receive",
      learned: "recieve"
    })
    // A normally spelled field keeps its edit commands, with no dictionary actions.
    await app.evaluate(({ BrowserWindow }) => {
      delete (globalThis as { shown?: Electron.Menu }).shown
      BrowserWindow.getAllWindows()[0]?.webContents.emit(
        "context-menu",
        {},
        {
          x: 0,
          y: 0,
          linkURL: "",
          selectionText: "",
          isEditable: true,
          misspelledWord: "",
          dictionarySuggestions: [],
          editFlags: {
            canCut: false,
            canCopy: false,
            canPaste: true,
            canUndo: true,
            canRedo: false
          }
        }
      )
    })
    await expect.poll(shown).toContain("Paste")
    expect(await shown()).not.toContain("Add to Dictionary")
  } finally {
    await close(app)
    demo.stop()
  }
})

test("row backgrounds offer row commands while fields, selected text and links keep native menus (BROWSER-06)", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-row-menu-"))
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    const row = page.locator("main [data-row-menu]").first()
    await expect(row).toBeVisible()
    const bounds = await row.boundingBox()
    if (!bounds) throw new Error("No row bounds")
    const point = { x: bounds.x + 2, y: bounds.y + bounds.height / 2 }
    await app.evaluate(({ Menu }) => {
      Menu.prototype.popup = function (this: Electron.Menu) {
        ;(globalThis as { rowMenuShown?: Electron.Menu }).rowMenuShown = this
      }
    })
    for (const scenario of [
      { isEditable: true, selectionText: "", linkURL: "", expected: "Paste" },
      { isEditable: false, selectionText: "Episode text", linkURL: "", expected: "Copy" },
      {
        isEditable: false,
        selectionText: "",
        linkURL: "https://example.com/episode",
        expected: "Open Link in Browser"
      },
      { isEditable: false, selectionText: "", linkURL: "", expected: "Play Now" }
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, { point, scenario }) => {
          delete (globalThis as { rowMenuShown?: Electron.Menu }).rowMenuShown
          BrowserWindow.getAllWindows()[0]?.webContents.emit(
            "context-menu",
            {},
            {
              ...point,
              ...scenario,
              misspelledWord: "",
              dictionarySuggestions: [],
              editFlags: {
                canCut: true,
                canCopy: true,
                canPaste: true,
                canUndo: true,
                canRedo: true
              }
            }
          )
        },
        { point, scenario }
      )
      const labels = () =>
        app.evaluate(() =>
          (globalThis as { rowMenuShown?: Electron.Menu }).rowMenuShown?.items.map(
            (item) => item.label
          )
        )
      await expect.poll(labels).toContain(scenario.expected)
      if (scenario.expected !== "Play Now") expect(await labels()).not.toContain("Play Now")
    }
  } finally {
    await close(app)
    demo.stop()
  }
})

test("matches the Mac Inspector and Sidebar at wide and narrow widths", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-pane-test-"))
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    const window = await app.browserWindow(page)
    const resize = async (width: number) => {
      await window.evaluate((win, width) => win.setContentSize(width, 820), width)
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width)
    }
    const inspector = page.getByRole("complementary", { name: "Episode Inspector" })
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    const show = page.getByRole("button", { name: "Show Inspector", exact: true })
    const hide = page.getByRole("button", { name: "Hide Inspector", exact: true })
    const list = page.getByRole("grid", { name: "New this week Episodes" })
    const first = list.locator("[data-episode-title]").first()
    const second = list.locator("[data-episode-title]").nth(1)
    const menuState = () =>
      app.evaluate(({ Menu }) => {
        const item = Menu.getApplicationMenu()?.getMenuItemById("toggle-inspector")
        return { label: item?.label, enabled: item?.enabled }
      })

    await resize(950)
    await expect(first).toBeVisible()
    await expect(inspector).toBeHidden()
    await expect(show).toBeDisabled()
    await expect.poll(menuState).toEqual({ label: "Show Inspector", enabled: false })
    await first.click()
    await expect(first).toBeFocused()
    const firstTitle = (await first.textContent())?.trim()
    expect(firstTitle).toBeTruthy()
    await expect(
      inspector.getByRole("heading", { name: firstTitle ?? "", exact: true })
    ).toBeVisible()
    await expect.poll(menuState).toEqual({ label: "Hide Inspector", enabled: true })
    await first.press("ArrowDown")
    await expect(second).toBeFocused()
    const secondTitle = (await second.textContent())?.trim()
    expect(secondTitle).toBeTruthy()
    await expect(
      inspector.getByRole("heading", { name: secondTitle ?? "", exact: true })
    ).toBeVisible()
    await second.press("Escape")
    await expect(inspector).toBeHidden()
    await expect(second).toBeFocused()
    await second.click()

    await resize(949)
    await expect(inspector).toBeHidden()
    await expect(sidebar).toBeVisible()
    await first.click()
    await expect(inspector).toBeHidden()
    await first.press("Alt+Meta+i")
    await expect(sidebar).toBeHidden()
    await expect(inspector).toBeVisible()

    const content = inspector.getByRole("region", { name: "Inspector content" })
    await content.focus()
    await content.press("Escape")
    await expect(first).toBeFocused()
    await expect(sidebar).toBeHidden()
    await expect(inspector).toBeHidden()
    await first.press("Escape")
    await show.click()
    await expect(inspector.getByRole("heading", { name: "Select an Episode" })).toBeVisible()
    await page.getByRole("button", { name: "Show Sidebar", exact: true }).click()
    await expect(sidebar).toBeVisible()
    await expect(inspector).toBeHidden()

    await resize(1180)
    await first.click()
    await expect(inspector).toBeHidden()
    await expect.poll(menuState).toEqual({ label: "Show Inspector", enabled: true })
    await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu()?.getMenuItemById("toggle-inspector")?.click()
    )
    await expect(inspector).toBeVisible()
    const width = page.getByRole("separator", { name: "Inspector width" })
    await width.press("ArrowLeft")
    await expect(width).toHaveAttribute("aria-valuenow", "280")
    await hide.click()
    await expect(inspector).toBeHidden()
    await page.reload()
    await expect(first).toBeVisible()
    await expect(inspector).toBeHidden()
    await expect(show).toBeEnabled()
    await show.click()
    await expect(width).toHaveAttribute("aria-valuenow", "280")
  } finally {
    await close(app)
    demo.stop()
    await demo.stopped
  }
})
