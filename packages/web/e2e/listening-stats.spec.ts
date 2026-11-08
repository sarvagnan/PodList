import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.afterEach(() => demo?.stop())

for (const viewport of [
  { width: 320, height: 700 },
  { width: 412, height: 915 },
  { width: 1440, height: 900 },
  { width: 720, height: 450 }
]) {
  test(`Settings links to accessible Listening stats at ${viewport.width} × ${viewport.height}`, async ({
    page,
    request
  }) => {
    demo = await startDemo()
    await request.post(`${demo.base}/api/devices`, {
      data: { id: "stats-test", name: "Stats", kind: "pwa", registeredAt: Date.now() }
    })
    // A report from another Device must contribute even after its Entry has gone.
    const day = new Date().toLocaleDateString("en-CA")
    await request.post(`${demo.base}/api/sync/push`, {
      data: {
        operations: [
          {
            id: "stats-log",
            deviceId: "stats-test",
            sequence: 0,
            recordedAt: Date.now(),
            change: {
              _tag: "ReportPosition",
              playlistId: "default",
              episodeId: "missing",
              position: 120,
              listenedAt: Date.now(),
              listening: [{ day, subscriptionId: "stats-podcast", seconds: 120 }]
            }
          }
        ]
      }
    })
    await page.setViewportSize(viewport)
    await page.goto(`${demo.base}/settings`)
    const link = page.getByRole("link", { name: "Listening stats", exact: true })
    await expect(link).toBeVisible()
    await link.focus()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/listening-stats$/)
    await expect(page.getByRole("heading", { name: "Listening stats", exact: true })).toBeVisible()
    await expect(page.getByRole("region", { name: "All time", exact: true })).toContainText("2 min")
    await expect(page.getByText("Removed Subscription", { exact: true })).toBeVisible()
    await expect(page.getByText("1 day", { exact: true })).toBeVisible()
    await expect(page.locator("#stats-periods")).toHaveClass(/text-xs/)
    await expect(page.locator("#stats-days")).toHaveClass(/uppercase/)
    await expect(
      page.getByRole("region", { name: "All time", exact: true }).locator("dd").first()
    ).toHaveClass(/text-title/)
    await page.getByText("Daily listening table", { exact: true }).focus()
    await page.keyboard.press("Enter")
    const table = page.getByRole("table")
    await expect(table).toBeVisible()
    await expect(table.getByRole("row")).toHaveCount(31)
    await expect(table.getByRole("cell", { name: "2.0", exact: true })).toHaveCount(1)
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%"
    })
    const overflow = await page
      .locator("main")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1)
    expect(overflow).toBe(false)
    await page.reload()
    await expect(page.getByRole("region", { name: "All time", exact: true })).toContainText("2 min")
  })
}

test("a new Library starts with an honest empty state", async ({ page }) => {
  demo = await startDemo({ empty: true })
  await page.goto(`${demo.base}/listening-stats`)
  await expect(page.getByText("No listening yet", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Play an Episode and it’s counted here.", { exact: false })
  ).toBeVisible()
  await expect(page.getByText("Daily listening table", { exact: true })).toHaveCount(0)
  await expect(page.locator('[aria-labelledby="stats-days"]')).toHaveCount(0)
  await expect(page.getByText("No listening yet").locator("..")).toHaveClass(/border-dashed/)
  await expect(page.getByText(/with this update/)).toHaveCount(0)
})

test("real playback records a permanent listening total without counting a skip", async ({
  page
}) => {
  test.setTimeout(45_000)
  demo = await startDemo()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/default`)
  await page.getByRole("button", { name: "Play Joinery without screws from here" }).click()
  const player = page.getByRole("region", { name: "Now playing" })
  await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
  // Pausing flushes the pending report, so no 15-second timer is needed.
  await page.waitForTimeout(1800)
  await player.getByRole("button", { name: "Forward 30 seconds", exact: true }).click()
  await player.getByRole("button", { name: "Pause", exact: true }).click()
  await expect(player.getByRole("button", { name: "Play", exact: true })).toBeVisible()
  await page.getByRole("link", { name: "Settings", exact: true }).click()
  await page.getByRole("link", { name: "Listening stats", exact: true }).click()
  await expect(page.getByRole("region", { name: "All time", exact: true })).toContainText(
    "Less than 1 min"
  )
  await expect(page.getByText("Slow Build", { exact: true }).last()).toBeVisible()
  await page.getByText("Daily listening table", { exact: true }).click()
  const nonzero = page
    .getByRole("table")
    .getByRole("cell")
    .filter({ hasText: /^(?!0\.0$).+/ })
  await expect(nonzero).toHaveCount(1)
  // A 30-second jump would put this above 0.4 minutes.
  const value = await nonzero.textContent()
  expect(value === "<0.1" || Number(value) <= 0.2).toBe(true)
  await page.reload()
  await expect(page.getByRole("region", { name: "All time", exact: true })).toContainText(
    "Less than 1 min"
  )
})

test("stats wait for the first sync before claiming zero", async ({ page }) => {
  demo = await startDemo({ empty: true })
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/sync/pull**", async (route) => {
    await gate
    await route.continue()
  })
  await page.goto(`${demo.base}/listening-stats`)
  await expect(page.getByRole("status", { name: "Loading listening stats" })).toBeVisible()
  await expect(page.getByRole("region", { name: "All time", exact: true })).toHaveCount(0)
  release()
  await expect(page.getByText("No listening yet", { exact: true })).toBeVisible()
})
