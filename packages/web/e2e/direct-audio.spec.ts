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
  await page.getByRole("button", { name: "Play Joinery without screws from here" }).click()
  const player = page.getByRole("region", { name: "Now playing" })
  await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
  await page.route(`${demo.base}/api/**`, (route) => route.abort())
  await page.evaluate(() => window.dispatchEvent(new Event("online")))
  await expect(
    page.getByRole("status").filter({ hasText: "Can’t reach your PodList server" })
  ).toContainText("New edits need a connection")
  await player.getByRole("button", { name: "Pause", exact: true }).click()
  await player.getByRole("button", { name: "Play", exact: true }).click()
  await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
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
