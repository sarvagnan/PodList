import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; fixtures: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

test("streams with the server unreachable and explains what still works", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/default`)
  await expect(
    page.getByRole("button", { name: "Play Joinery without screws from here" })
  ).toBeVisible()
  await page.route(`${demo.base}/api/**`, (route) => route.abort())
  await page.evaluate(() => window.dispatchEvent(new Event("online")))
  await expect(
    page.getByRole("status").filter({ hasText: "Can’t reach your PodList server" })
  ).toContainText("Edits are kept")
  await page.getByRole("button", { name: "Play Joinery without screws from here" }).click()
  await expect(
    page
      .getByRole("region", { name: "Now playing" })
      .getByRole("button", { name: "Pause", exact: true })
  ).toBeVisible()
  await page.getByRole("link", { name: "Library", exact: true }).click()
  await page.getByRole("button", { name: "Add podcasts" }).click()
  await page.getByRole("searchbox", { name: "Podcast name" }).fill("Deep Field")
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Searching and adding podcasts need the server"
  )
})

test("uses the proxy if the host fails", async ({ page }) => {
  await page.goto(`${demo.base}/playlists/default`)
  await expect(
    page.getByRole("button", { name: "Play Joinery without screws from here" })
  ).toBeVisible()
  await page.route(`${demo.fixtures}/audio/**`, (route) => route.abort())
  const proxy = page.waitForRequest(/\/api\/episodes\/.+\/audio/)
  await page.getByRole("button", { name: "Play Joinery without screws from here" }).click()
  await proxy
  await expect(
    page
      .getByRole("region", { name: "Now playing" })
      .getByRole("button", { name: "Pause", exact: true })
  ).toBeVisible()
})

test("Volume Boost tries the proxy, then plays directly without boost if it is unreachable", async ({
  page,
  request
}) => {
  await request.post(`${demo.base}/api/devices`, {
    data: { id: "boost-test", name: "Test", kind: "pwa", registeredAt: Date.now() }
  })
  await request.post(`${demo.base}/api/sync/push`, {
    data: {
      operations: [
        {
          id: "boost",
          deviceId: "boost-test",
          sequence: 0,
          recordedAt: Date.now(),
          change: {
            _tag: "SetPlaybackSettings",
            settings: { speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: true }
          }
        }
      ]
    }
  })
  await page.goto(`${demo.base}/playlists/default`)
  await expect(
    page.getByRole("button", { name: "Play Joinery without screws from here" })
  ).toBeVisible()
  await page.route(`${demo.base}/api/episodes/*/audio`, (route) => route.abort())
  await page.getByRole("button", { name: "Play Joinery without screws from here" }).click()
  const player = page.getByRole("region", { name: "Now playing" })
  await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
  await expect(player).toContainText("Playing directly without Volume Boost")
  await page.getByRole("button", { name: /^Open Now Playing/ }).click()
  await expect(
    page
      .getByRole("dialog")
      .getByRole("status")
      .filter({ hasText: "Playing directly without Volume Boost" })
  ).toContainText("Playing directly without Volume Boost")
})

test("downloads directly where CORS allows it, otherwise falls back to the proxy", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/new-this-week`)
  const row = page.getByRole("row").filter({ hasText: "Joinery without screws" })
  // Fixture audio deliberately has no CORS headers.
  const host = page.waitForRequest(`${demo.fixtures}/audio/slow-build/0.mp3`)
  const proxy = page.waitForRequest(/\/api\/episodes\/.+\/audio/)
  await row.getByRole("button", { name: "Download", exact: true }).click()
  await host
  await proxy
  await expect(row.getByRole("button", { name: "Downloaded", exact: true })).toBeVisible()
  const other = page.getByRole("row").filter({ hasText: "The quiet edge of the solar system" })
  await page.route(`${demo.fixtures}/audio/deep-field/*`, async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      headers: { ...response.headers(), "access-control-allow-origin": "*" }
    })
  })
  await page.route(`${demo.base}/api/episodes/*/audio`, (route) => route.abort())
  await other.getByRole("button", { name: "Download", exact: true }).click()
  await expect(other.getByRole("button", { name: "Downloaded", exact: true })).toBeVisible()
})
