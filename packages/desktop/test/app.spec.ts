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

    // Audio streams from the server through the same pass-through.
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
    await expect(again.getByRole("status").filter({ hasText: "Offline" })).toBeVisible()
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
    await expect(page.getByRole("status").filter({ hasText: "Offline" })).toBeVisible()
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
