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

test("reads undownloaded Standalone Chapters from the publisher audio prefix", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo({ empty: true, id3: true })
  const profile = mkdtempSync(join(tmpdir(), "podlist-publisher-chapters-"))
  const app = await launch({ PODLIST_USER_DATA: profile })
  try {
    const welcome = await app.firstWindow()
    const library = app.waitForEvent("window")
    await welcome.getByRole("button", { name: /Start on This (Mac|Computer)/ }).click()
    const page = await library
    await page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: "Library", exact: true })
      .click()
    await page.getByRole("button", { name: "Add podcasts" }).click()
    const sheet = page.getByRole("dialog", { name: "Add podcasts" })
    await sheet
      .getByRole("searchbox", { name: "Podcast Name or Feed Address" })
      .fill(`${demo.fixtures}/feeds/slow-build.xml`)
    await sheet.getByRole("link", { name: "Slow Build" }).click()
    await page.getByRole("button", { name: "Subscribe to Slow Build" }).click()
    await expect(page.getByRole("button", { name: "Subscribed to Slow Build" })).toBeVisible()
    const probe = page.waitForRequest(
      (request) => new URL(request.url()).pathname === "/publisher/audio-chapters"
    )
    await page
      .getByRole("group", { name: "Joinery without screws" })
      .getByRole("button", { name: "Play Now" })
      .click()
    await probe
    await page
      .getByRole("button", { name: "Open Now Playing: Joinery without screws", exact: true })
      .first()
      .click()
    await expect(page.getByText("From downloaded audio", { exact: true })).toBeVisible()
  } finally {
    await close(app)
    demo.stop()
    await rm(profile, { recursive: true, force: true })
  }
})
