import { expect, type Page, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

// Keyboard and focus behaviour from the UI grade (docs/ui-grade/round-2.md).

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

const desktop = async (page: Page, path: string) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(demo.base + path)
  await page.locator('[role="grid"] [data-row="0"]').waitFor()
}

test("the Episode list is one Tab stop with arrow keys between rows and actions", async ({
  page
}) => {
  await desktop(page, "/views/short")
  const grid = page.getByRole("grid")
  const tabbable = grid.locator('[tabindex="0"]')
  await expect(tabbable).toHaveCount(1)
  await tabbable.focus()
  const focusedRow = () =>
    page.evaluate(() => document.activeElement?.closest("[data-row]")?.getAttribute("data-row"))
  expect(await focusedRow()).toBe("0")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  expect(await focusedRow()).toBe("2")
  await page.keyboard.press("ArrowRight")
  await expect(page.locator(":focus")).toHaveAccessibleName(/^Play Next in/)
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("Space")
  await expect(page.getByRole("row").nth(2)).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("Shift+ArrowDown")
  await expect(page.getByRole("row").nth(3)).toHaveAttribute("aria-selected", "true")
  // Still one Tab stop, wherever focus went.
  await expect(tabbable).toHaveCount(1)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("row").nth(2)).toHaveAttribute("aria-selected", "false")
})

test("closing the Episode panel puts focus back on its row; modified clicks are links", async ({
  page
}) => {
  await desktop(page, "/views/short")
  const title = page.locator('[data-row="1"] [data-cell="title"]')
  await title.click()
  await expect(page).toHaveURL(/\?episode=/)
  await expect(page.getByRole("row").nth(1)).toHaveAttribute("aria-current", "true")
  await page.getByRole("button", { name: "Close Episode" }).click()
  await expect(title).toBeFocused()

  const popup = page.context().waitForEvent("page")
  await title.click({ modifiers: ["ControlOrMeta"] })
  await expect((await popup).url()).toMatch(/\/episodes\//)
  await expect(page).not.toHaveURL(/\?episode=/)
})

test("the Now Playing drawer keeps focus inside it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/default`)
  await page.getByRole("button", { name: /^Open Now Playing/ }).click()
  const drawer = page.getByRole("dialog")
  await expect(drawer).toBeVisible()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab")
    const inside = await page.evaluate(
      () => document.activeElement?.closest('[role="dialog"]') !== null
    )
    expect(inside, `Tab ${i + 1} stays in the drawer`).toBe(true)
  }
})
