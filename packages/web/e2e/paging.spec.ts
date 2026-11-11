import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

test("scrolling continues server pages and 409 restarts preserve selection and scroll", async ({
  page
}) => {
  test.setTimeout(60_000)
  const demo = await startDemo({ large: true })
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    let changed = false
    let restarted = false
    await page.route("**/api/reads/filter", async (route) => {
      const body = route.request().postDataJSON()
      if (body.continuation && !changed) {
        changed = true
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ _tag: "ReadChanged" })
        })
      }
      if (changed && !body.continuation) restarted = true
      return route.continue()
    })
    await page.goto(`${demo.base}/search?q=Long`)
    const grid = page.getByRole("grid", { name: "Search results" })
    await expect(grid).toHaveAttribute("aria-rowcount", "501")
    await expect(page.getByText("501 Episodes ·", { exact: false }).first()).toBeVisible()
    expect(await grid.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(
      20000
    )
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect
      .poll(() => grid.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(14000)
    expect(restarted).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 9500))
    const row = page.locator('main [data-index="125"]')
    await row.getByRole("checkbox").check()
    await expect(page.getByRole("toolbar", { name: "1 Episode selected" })).toBeVisible()
    const selectedTitle = await row.locator("[data-episode-title]").textContent()
    const before = await page.evaluate(() => window.scrollY)
    // A native edit invalidates both cursors; already-loaded depth remains available.
    await fetch(`${demo.base}/api/sync/push`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operations: [
          {
            id: crypto.randomUUID(),
            deviceId: "native",
            sequence: 0,
            recordedAt: Date.now(),
            change: { _tag: "RenamePlaylist", playlistId: "commute", name: "Changed elsewhere" }
          }
        ]
      })
    })
    await expect(page.getByRole("link", { name: /^Changed elsewhere/ })).toBeVisible()
    await expect(page.getByRole("toolbar", { name: "1 Episode selected" })).toBeVisible()
    await expect(row).toContainText(selectedTitle ?? "")
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(100)
  } finally {
    demo.stop()
  }
})

test("Mark all Played includes Episodes beyond the first server page", async ({ page }) => {
  test.setTimeout(60_000)
  const demo = await startDemo({ large: true })
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${demo.base}/library`)
    await page.getByRole("link", { name: "Long listening", exact: true }).click()
    const mark = page.getByRole("button", { name: "Mark all Played" })
    await expect(mark).toBeEnabled()
    await mark.click()
    await expect
      .poll(
        async () => {
          const response = await fetch(`${demo.base}/api/sync/pull?since=0`)
          const { snapshot } = await response.json()
          return snapshot.playlists
            .find((playlist: { id: string }) => playlist.id === "large")
            .entries.filter(
              (entry: { episodeId: string }) =>
                snapshot.episodeStates[entry.episodeId]?.played != null
            ).length
        },
        { timeout: 30_000 }
      )
      .toBe(500)
    await expect(page.getByText("0 unplayed", { exact: false }).first()).toBeVisible()
  } finally {
    demo.stop()
  }
})
