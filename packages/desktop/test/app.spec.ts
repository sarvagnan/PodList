import { spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"

const appDir = join(import.meta.dirname, "..")
/** Outside Electron, the electron package exports the path to its binary. */
const electronBinary = createRequire(import.meta.url)("electron") as string
const environment = (env: Record<string, string>) => ({
  ...(process.env as Record<string, string>),
  ...env
})
const launch = (env: Record<string, string>) =>
  electron.launch({ args: ["."], cwd: appDir, env: environment(env) })

test("runs its own copy of the web app, with a local database, and opens offline", async () => {
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
    await app.close()

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
    await offline.close()
  } finally {
    demo.stop()
  }
})

test("each server gets its own local database", async () => {
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
    await app.close()
    // A different server starts from an empty local database, then syncs its own.
    second.stop()
    const other = await launch({ PODLIST_URL: second.base, PODLIST_USER_DATA: profile })
    const page = await other.firstWindow()
    await expect(
      page.getByRole("status").filter({ hasText: "Can’t reach your PodList server" })
    ).toBeVisible()
    await expect(commuteLink(page)).toHaveCount(0)
    await other.close()
  } finally {
    first.stop()
    second.stop()
  }
})

test("asks for the server address on first launch and checks it answers", async () => {
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
    await app.close()
  } finally {
    demo.stop()
  }
})

test("a second launch hands over to the open window", async () => {
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
    await first.close()
  } finally {
    demo.stop()
  }
})

test("the File menu makes a Playlist or a View and adds podcasts", async () => {
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
    await app.close()
  } finally {
    demo.stop()
  }
})

test("right-click on a row shows its commands as a native menu", async () => {
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
    await app.close()
  } finally {
    demo.stop()
  }
})

test("downloads host audio without CORS while the server is unreachable", async () => {
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
    await app.close()
    demo.stop()
  }
})

test("misspelled text offers dictionary suggestions, replacement and learning (BROWSER-07)", async () => {
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
    await app.close()
    demo.stop()
  }
})
