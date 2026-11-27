import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

test("offers Show Restored Entries after Undo from another screen", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-restore-"))
  try {
    const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    await sidebar.getByRole("link", { name: /^Default/ }).click()
    const entries = page.getByRole("grid", { name: "Default Entries" })
    const first = entries.locator("[data-episode-title]").first()
    await expect(first).toBeVisible()
    const id = await first.getAttribute("data-episode-title")
    expect(id).toBeTruthy()
    const row = entries.locator(`[data-episode-title="${id}"]`)
    await row.press("Backspace")
    await expect(row).toHaveCount(0)

    await sidebar.getByRole("link", { name: "Library", exact: true }).click()
    await app.evaluate(({ Menu }) => {
      Menu.getApplicationMenu()
        ?.items.find(({ label }) => label === "Edit")
        ?.submenu?.items.find(({ label }) => label.startsWith("Undo"))
        ?.click()
    })
    await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible()
    await expect(page.getByRole("button", { name: "Show Restored Entries" })).toBeVisible()
    await app.evaluate(({ Menu }) => {
      Menu.getApplicationMenu()
        ?.items.find(({ label }) => label === "Edit")
        ?.submenu?.items.find(({ label }) => label === "Show Restored Entries")
        ?.click()
    })
    await expect(row).toBeFocused()
    await expect(page.getByRole("row", { selected: true })).toContainText(
      (await row.textContent()) ?? ""
    )
    await expect(page.getByRole("button", { name: "Show Restored Entries" })).toHaveCount(0)
    await close(app)
  } finally {
    demo.stop()
  }
})
