import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

for (const width of [1440, 412]) {
  test(`500 Entries keep grid navigation, menu moves and scroll restoration at ${width}px`, async ({
    page
  }) => {
    test.setTimeout(60_000)
    const demo = await startDemo({ large: true })
    try {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${demo.base}/playlists/large`)
      const first = page.locator('main [data-row="0"] [data-cell="title"]')
      await expect(first).toHaveText("Long Episode 001")
      expect(await page.locator('main [role="row"]').count()).toBeLessThan(30)
      await first.focus()
      await page.keyboard.press("ControlOrMeta+End")
      const last = page.locator('main [data-row="499"] [data-cell="title"]')
      await expect(last).toBeFocused()
      await expect(last).toHaveText("Long Episode 500")
      await page.keyboard.press("ControlOrMeta+Home")
      await expect(first).toBeFocused()
      const id = await first.getAttribute("data-episode-title")
      if (width < 768)
        await page.getByRole("button", { name: "More actions for Long Episode 001" }).click()
      else await page.locator('main [data-row="0"]').click({ button: "right" })
      await page.getByRole("menuitem", { name: "Move to bottom" }).click()
      const moved = page.locator(`main [data-episode-title="${id}"]`)
      await expect(
        width < 768
          ? page.getByRole("button", { name: "More actions for Long Episode 001" })
          : moved
      ).toBeFocused()
      await expect(moved.locator("xpath=ancestor::*[@data-row]")).toHaveAttribute("data-row", "499")
      await page.getByRole("button", { name: "Undo", exact: true }).click()
      await expect(first).toHaveText("Long Episode 001")
      await page.evaluate(() => window.scrollTo(0, 20000))
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(19000)
      // Let measured heights and the virtualizer’s scroll anchoring settle first.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
      )
      const saved = await page.evaluate(() => window.scrollY)
      // Real route navigation; Back restores this history entry's scroll.
      await page.goto(`${demo.base}/views`)
      await page.goBack()
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(saved - 200)
      expect(await page.locator('main [role="row"]').count()).toBeLessThan(30)
    } finally {
      demo.stop()
    }
  })
}

test("keyboard reordering crosses the virtual viewport", async ({ page }) => {
  const demo = await startDemo({ large: true })
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${demo.base}/playlists/large`)
    const handle = page.getByRole("button", { name: "Move Long Episode 001", exact: true })
    await handle.hover()
    await expect(page.getByText("Drag to reorder", { exact: true })).toHaveText("Drag to reorder")
    await handle.focus()
    await page.keyboard.press("Space")
    await expect(handle).toHaveAttribute("aria-pressed", "true")
    await page.waitForTimeout(100)
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press("ArrowDown")
      await page.waitForTimeout(80)
    }
    await expect(
      page.getByText("Long Episode 001 is at position 19 of 500.", { exact: true })
    ).toBeAttached()
    await page.waitForTimeout(300)
    await page.keyboard.press("Space")
    await expect(page.locator('main [data-row="18"]')).toContainText("Long Episode 001")
    await expect(handle).toBeFocused()
  } finally {
    demo.stop()
  }
})
