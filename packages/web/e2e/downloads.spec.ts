import { expect, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  test.setTimeout(60_000)
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

test("a downloaded Episode plays with no connection", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: demo.base,
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()
  await page.goto("/views/new-this-week")
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()

  const row = page.getByRole("row").filter({ hasText: "Joinery without screws" })
  await row.getByRole("button", { name: "Download" }).click()
  await expect(row.getByRole("button", { name: "Downloaded" })).toBeVisible({ timeout: 20_000 })
  await expect(row.getByLabel("Downloaded").first()).toBeVisible()

  await context.setOffline(true)
  const sidebar = page.getByRole("navigation", { name: "Library and lists" })
  await sidebar.getByRole("link", { name: /^Default/ }).click()
  const player = page.getByRole("region", { name: "Now playing" })

  // Not downloaded: says it's offline and not on this Device, not a Try again that can't
  // work (COPY-02).
  await page
    .getByRole("button", { name: "Play The quiet edge of the solar system from here" })
    .click()
  await expect(player.getByRole("alert")).toContainText("Not downloaded")
  await expect(player.getByRole("alert")).toContainText("plays when you’re back online")
  await expect(player.getByRole("button", { name: "Try again" })).toHaveCount(0)

  // Downloaded: it plays from this Device.
  await page.getByRole("button", { name: "Play Joinery without screws from here" }).click()
  await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
  const slider = player.getByRole("slider", { name: "Position" })
  const start = await slider.getAttribute("aria-valuetext")
  await expect.poll(() => slider.getAttribute("aria-valuetext"), { timeout: 5000 }).not.toBe(start)
  await context.close()
})
