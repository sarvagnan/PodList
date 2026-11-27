import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

test("keeps and plays a Standalone Library across app restarts", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo({ empty: true })
  const profile = mkdtempSync(join(tmpdir(), "podlist-standalone-"))
  try {
    const app = await launch({ PODLIST_USER_DATA: profile })
    const welcome = await app.firstWindow()
    const publisherRequests = new Set<string>()
    const serverRequests: string[] = []
    app.context().on("request", (request) => {
      const url = new URL(request.url())
      if (url.pathname.startsWith("/publisher/") || url.pathname === "/audio-download")
        publisherRequests.add(url.pathname)
      if (url.pathname.startsWith("/api/")) serverRequests.push(url.pathname)
    })
    const libraryWindow = app.waitForEvent("window")
    await welcome.getByRole("button", { name: /Start on This (Mac|Computer)/ }).click()
    const page = await libraryWindow

    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    await sidebar.getByRole("link", { name: "Library", exact: true }).click()
    await page.getByRole("button", { name: "Add podcasts" }).click()
    const sheet = page.getByRole("dialog", { name: "Add podcasts" })
    await sheet
      .getByRole("searchbox", { name: "Podcast Name or Feed Address" })
      .fill(`${demo.fixtures}/feeds/deep-field.xml`)
    await sheet.getByRole("link", { name: "Deep Field" }).click()
    await expect(page.getByRole("heading", { name: "Deep Field" })).toBeVisible()
    await page.getByRole("button", { name: "Subscribe to Deep Field" }).click()
    await expect(page.getByRole("button", { name: "Subscribed to Deep Field" })).toBeVisible()
    await page.getByRole("searchbox", { name: "Search Episodes" }).fill("telescope")
    await page
      .getByRole("group", { name: "A telescope made of ice" })
      .getByRole("button", { name: "Play Now" })
      .click()
    await expect.poll(() => publisherRequests.has("/audio-download")).toBe(true)
    await expect.poll(() => publisherRequests.has("/publisher/chapters")).toBe(true)
    await expect.poll(() => publisherRequests.has("/publisher/artwork")).toBe(true)
    expect(serverRequests).toEqual([])
    const afterClose = await app.evaluate(({ BrowserWindow }) => {
      const library = BrowserWindow.getAllWindows().find((window) =>
        window.webContents.getURL().startsWith("app://podlist/")
      )
      library?.close()
      return library ? { destroyed: library.isDestroyed(), visible: library.isVisible() } : null
    })
    expect(afterClose).toEqual({ destroyed: false, visible: false })
    expect(page.isClosed()).toBe(false)
    await close(app)

    demo.stop()
    const restarted = await launch({ PODLIST_USER_DATA: profile })
    const restored = await restarted.firstWindow()
    await restored
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: "Library", exact: true })
      .click()
    await expect(restored.getByRole("link", { name: "Deep Field", exact: true })).toBeVisible()
    await close(restarted)
  } finally {
    demo.stop()
  }
})
