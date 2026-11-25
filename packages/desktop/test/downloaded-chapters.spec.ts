import { mkdtempSync } from "node:fs"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

test("finds Chapters in a downloaded episode while the server is unreachable", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo({ id3: true })
  const profile = mkdtempSync(join(tmpdir(), "podlist-offline-chapters-"))
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    await page.setViewportSize({ width: 1600, height: 1000 })
    const row = page.getByRole("row").filter({ hasText: "Joinery without screws" })
    await expect(row.getByRole("button", { name: "Download", exact: true })).toBeVisible()
    await page.route("app://podlist/api/**", (route) => route.abort())
    await row.getByRole("button", { name: "Download", exact: true }).click()
    await expect(row.getByRole("button", { name: "Downloaded", exact: true })).toBeVisible()
    await row.getByRole("link", { name: "Joinery without screws" }).click()
    await expect(page.getByText("From downloaded audio", { exact: true })).toBeVisible()
  } finally {
    await close(app)
    demo.stop()
    await rm(profile, { recursive: true, force: true })
  }
})
