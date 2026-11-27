import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, type Page } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

const sidebar = (page: Page) => page.getByRole("navigation", { name: "Library and lists" })
const title = "A telescope made of ice"
const inspectEntry = async (page: Page) => {
  await sidebar(page)
    .getByRole("link", { name: /^Default/ })
    .click()
  const entries = page.getByRole("grid", { name: "Default Entries" })
  await entries.locator("[data-episode-title]").filter({ hasText: title }).click()
  return page.getByRole("complementary", { name: "Episode Inspector" })
}

test("previews Bring Over, keeps the source and copies a Manual Download", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo({ empty: true })
  const profile = mkdtempSync(join(tmpdir(), "podlist-bring-over-"))
  try {
    const app = await launch({ PODLIST_USER_DATA: profile })
    const welcome = await app.firstWindow()
    const opened = app.waitForEvent("window")
    await welcome.getByRole("button", { name: /Start on This (Mac|Computer)/ }).click()
    const source = await opened

    await sidebar(source).getByRole("link", { name: "Library", exact: true }).click()
    await source.getByRole("button", { name: "Add podcasts" }).click()
    const add = source.getByRole("dialog", { name: "Add podcasts" })
    await add
      .getByRole("searchbox", { name: "Podcast Name or Feed Address" })
      .fill(`${demo.fixtures}/feeds/deep-field.xml`)
    await add.getByRole("link", { name: "Deep Field" }).click()
    await source.getByRole("button", { name: "Subscribe to Deep Field" }).click()
    await expect(source.getByRole("button", { name: "Subscribed to Deep Field" })).toBeVisible()
    await source
      .getByRole("group", { name: title })
      .getByRole("button", { name: "Play Last" })
      .click()
    const inspector = await inspectEntry(source)
    await inspector.getByRole("button", { name: "Download", exact: true }).click()
    await expect(inspector.getByRole("button", { name: "Downloaded", exact: true })).toBeVisible()

    await sidebar(source).getByRole("link", { name: "Settings", exact: true }).click()
    await source.getByRole("button", { name: "Connect to a Server…" }).click()
    await source.getByRole("textbox", { name: "Server Address" }).fill(demo.base)
    const connecting = app.waitForEvent("window")
    await source.getByRole("button", { name: "Check and Connect" }).click()
    const target = await connecting
    const preview = target.getByRole("dialog", { name: /Bring this .* Library over/ })
    await expect(preview.getByText("1 added · 0 merged", { exact: true })).toBeVisible()
    await expect(preview.getByText(/1 Download/)).toBeVisible()
    await preview.getByRole("button", { name: "Not Now" }).click()
    await expect(preview).toBeHidden()
    expect(await (await fetch(`${demo.base}/api/subscriptions`)).json()).toEqual([])

    await sidebar(target).getByRole("link", { name: "Settings", exact: true }).click()
    await target.getByRole("button", { name: /Bring Library from This (Mac|Computer)/ }).click()
    await preview.getByRole("button", { name: "Bring Over", exact: true }).click()
    await expect(target.getByText(/Library brought over/)).toBeVisible({ timeout: 25_000 })
    const brought = await inspectEntry(target)
    await expect(brought.getByRole("button", { name: "Downloaded", exact: true })).toBeVisible()

    await sidebar(target).getByRole("link", { name: "Settings", exact: true }).click()
    const newWelcome = app.waitForEvent("window")
    await target.getByRole("button", { name: "Disconnect", exact: true }).click()
    const disconnected = await newWelcome
    const opening = app.waitForEvent("window")
    await disconnected.getByRole("button", { name: /Start on This (Mac|Computer)/ }).click()
    const reopened = await opening
    const retained = await inspectEntry(reopened)
    await expect(retained.getByRole("button", { name: "Downloaded", exact: true })).toBeVisible()
    await close(app)
  } finally {
    demo.stop()
  }
})
