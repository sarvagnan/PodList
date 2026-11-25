import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

test("refreshes publisher feeds from Settings and the Podcast menu", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-refresh-"))
  try {
    const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    await page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: "Settings", exact: true })
      .click()
    const feeds = page.getByRole("region", { name: "Publisher Feeds" })
    await feeds.getByRole("button", { name: "Refresh Now" }).click()
    await expect(page.getByText("Feeds refreshed.", { exact: true })).toBeVisible()
    const menuState = () =>
      app.evaluate(({ Menu }) =>
        Menu.getApplicationMenu()
          ?.items.find(({ label }) => label === "Podcast")
          ?.submenu?.items.map(({ label, enabled }) => ({ label, enabled }))
      )
    await expect.poll(menuState).toEqual([
      { label: "Refresh All Feeds", enabled: true },
      { label: "Cancel Feed Refresh", enabled: false }
    ])
    await close(app)
  } finally {
    demo.stop()
  }
})
