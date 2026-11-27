import { mkdtempSync } from "node:fs"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

test("copies a Playlist Entry to another Playlist and undoes the copy", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-playlist-drop-"))
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    const commute = sidebar.getByRole("link", { name: /^Commute/ })
    const workshop = sidebar.getByRole("link", { name: /^Workshop/ })
    await commute.click()
    const title = "Who sets the price of rice?"
    const entry = page.getByRole("link", { name: title, exact: true })
    await entry.dragTo(workshop)
    await expect(page.getByText("Added 1 Episode to Workshop")).toBeVisible()
    await expect(entry).toBeVisible()
    await workshop.click()
    await expect(entry).toBeVisible()
    await page.getByRole("button", { name: "Undo", exact: true }).click()
    await expect(entry).toHaveCount(0)
    await commute.click()
    await expect(entry).toBeVisible()
  } finally {
    await close(app)
    demo.stop()
    await rm(profile, { recursive: true, force: true })
  }
})

test("native Find searches the current Playlist and Go Search searches the Library", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-context-search-"))
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    await sidebar.getByRole("link", { name: /^Commute/ }).click()
    await app.evaluate(({ Menu }) => {
      const edit = Menu.getApplicationMenu()?.items.find((item) => item.label === "Edit")
      edit?.submenu?.items.find((item) => item.label === "Find…")?.click()
    })
    const scope = page.getByRole("searchbox", { name: "Search this list" })
    await expect(scope).toBeFocused()
    await scope.fill("sandwiches")
    const grid = page.getByRole("grid", { name: "Commute Entries" })
    await expect(
      grid.getByRole("link", { name: "Inflation, explained with sandwiches" })
    ).toBeVisible()
    await expect(grid.getByRole("link", { name: "Who sets the price of rice?" })).toHaveCount(0)
    await page.keyboard.press("Escape")
    await expect(scope).toHaveValue("")
    await expect(grid.getByRole("link", { name: "Who sets the price of rice?" })).toBeVisible()
    await sidebar.getByRole("link", { name: /^Search/ }).click()
    await expect(page.getByRole("searchbox", { name: "Search the Library" })).toBeFocused()
  } finally {
    await close(app)
    demo.stop()
    await rm(profile, { recursive: true, force: true })
  }
})
