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
      // /views redirects on wide screens. Finish a stable destination before Back,
      // so its hydration navigation cannot race this native history traversal.
      await page.goto(`${demo.base}/settings`)
      await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible()
      await page.goBack()
      await expect(page.getByRole("heading", { name: "Long listening", exact: true })).toBeVisible()
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
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press("ArrowDown")
      await expect(
        page.getByText(`Long Episode 001 is at position ${i + 2} of 500.`, { exact: true })
      ).toBeAttached()
    }
    await expect(
      page.getByText("Long Episode 001 is at position 19 of 500.", { exact: true })
    ).toBeAttached()
    await page.keyboard.press("Space")
    await expect(page.locator('main [data-row="18"]')).toContainText("Long Episode 001")
    await expect(handle).toBeFocused()
  } finally {
    demo.stop()
  }
})

// All events can arrive within one frame on a busy machine. A move must count keys,
// rather than repeatedly measuring the same painted drag rectangle.
test("rapid keyboard moves apply in order before a paint, including drop and cancel", async ({
  page
}) => {
  const demo = await startDemo({ large: true })
  try {
    await page.goto(`${demo.base}/playlists/large`)
    const handle = page.getByRole("button", { name: "Move Long Episode 001", exact: true })
    await handle.focus()
    await page.keyboard.press("Space")
    await expect(handle).toHaveAttribute("aria-pressed", "true")
    await handle.evaluate((button) => {
      for (const code of [...Array(20).fill("ArrowDown"), "ArrowUp", "ArrowUp", "Space"])
        button.dispatchEvent(
          new KeyboardEvent("keydown", { code, key: code === "Space" ? " " : code, bubbles: true })
        )
    })
    await expect(page.locator('main [data-row="18"]')).toContainText("Long Episode 001")
    await expect(handle).toBeFocused()
    await page.keyboard.press("Space")
    await handle.evaluate((button) => {
      for (const code of ["ArrowUp", "ArrowUp", "Escape"])
        button.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true }))
    })
    await expect(page.locator('main [data-row="18"]')).toContainText("Long Episode 001")
    await expect(handle).toBeFocused()
    await expect(handle).toHaveAttribute("aria-pressed", "false")
    await page.getByRole("button", { name: "Undo", exact: true }).click()
    await expect(page.locator('main [data-row="0"]')).toContainText("Long Episode 001")
  } finally {
    demo.stop()
  }
})

test("Back waits for the server Playlist before restoring scroll", async ({ page }) => {
  const demo = await startDemo({ large: true })
  let release = () => {}
  try {
    await page.goto(`${demo.base}/playlists/large`)
    await expect(page.getByRole("link", { name: "Long Episode 001", exact: true })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 20000))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(19000)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    )
    await page.goto(`${demo.base}/settings`)
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible()
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let held = false
    await page.route("**/api/sync/pull?since=0", async (route) => {
      held = true
      await gate
      await route.continue()
    })
    await page.goBack()
    await expect.poll(() => held).toBe(true)
    // Keep the server response held beyond the former pre-data restoration frame budget.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let n = 40
          const tick = () => {
            if (--n === 0) resolve()
            else requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        })
    )
    release()
    await expect(page.getByRole("heading", { name: "Long listening", exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(19000)
  } finally {
    release()
    demo.stop()
  }
})

test("a menu history layer preserves a scrolled Playlist on open and Back", async ({ page }) => {
  const demo = await startDemo({ large: true })
  try {
    await page.setViewportSize({ width: 412, height: 900 })
    await page.goto(`${demo.base}/playlists/large`)
    await expect(page.getByRole("link", { name: "Long Episode 001", exact: true })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 20000))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(19000)
    const visibleIndex = () =>
      page.locator("main [data-row]").evaluateAll((rows) =>
        rows
          .find((row) => {
            const box = row.getBoundingClientRect()
            return box.top > 100 && box.bottom < innerHeight - 150
          })
          ?.getAttribute("data-row")
      )
    await expect.poll(visibleIndex).toBeDefined()
    const index = await visibleIndex()
    const before = await page.evaluate(() => ({ y: scrollY, index: history.state.__TSR_index }))
    await page
      .locator(`main [data-row="${index}"]`)
      .getByRole("button", { name: /^More actions for / })
      .click()
    const menu = page.getByRole("menu")
    await expect(menu).toBeVisible()
    await expect.poll(() => page.evaluate(() => history.state.__TSR_index)).toBe(before.index + 1)
    // Let the same-address route commit run; it must not issue a scroll reset.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    )
    await expect(menu).toBeVisible()
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before.y)).toBeLessThan(200)
    await page.goBack()
    await expect(menu).toBeHidden()
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - before.y))
      .toBeLessThan(200)
  } finally {
    demo.stop()
  }
})
