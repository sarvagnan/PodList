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

test("Tab stays inside the Add dialog, and it can be cancelled", async ({ page }) => {
  await desktop(page, "/views/short")
  await page.locator('[data-row="0"]').hover()
  await page.locator('[data-row="0"]').getByRole("button", { name: "Add to a Playlist…" }).click()
  const dialog = page.getByRole("dialog", { name: "Add to a Playlist" })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab")
    expect(
      await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null),
      `Tab ${i + 1} stays in the dialog`
    ).toBe(true)
  }
  await dialog.getByRole("button", { name: "Close" }).click()
  await expect(dialog).toBeHidden()
})

test("Esc closes the Episode panel from the list; right-click offers Episode commands", async ({
  page
}) => {
  await desktop(page, "/views/short")
  await page.locator('[data-row="1"] [data-cell="title"]').click()
  await expect(page).toHaveURL(/\?episode=/)
  await page.locator('[data-row="2"] [data-cell="title"]').focus()
  await page.keyboard.press("Escape")
  await expect(page).not.toHaveURL(/\?episode=/)

  await page.locator('[data-row="0"]').click({ button: "right" })
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem", { name: /^Play Next in/ })).toBeVisible()
  await menu.getByRole("menuitem", { name: "Star" }).click()
  await expect(page.getByText("Starred", { exact: true }).first()).toBeVisible()
})

test("Back returns a list to where it was scrolled", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 500 })
  // "Short" doesn't depend on today's date, unlike "New this week".
  await page.goto(`${demo.base}/views/short`)
  await page.locator('[data-row="4"]').waitFor()
  await page.evaluate(() => window.scrollTo(0, 150))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(150)
  await page.locator('[data-row="3"] [data-cell="title"]').click()
  await expect(page).toHaveURL(/\/episodes\//)
  await page.goBack()
  // Within a few pixels: the list may settle by a row's measured height difference.
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - 150))
    .toBeLessThanOrEqual(8)
})

test("right-click on an Episode's title leaves the browser's link menu", async ({ page }) => {
  await desktop(page, "/views/short")
  const title = page.locator('[data-row="0"] [data-cell="title"]')
  // Seen first (window, capture) and read after every handler has run.
  const prevented = page.evaluate(
    () =>
      new Promise<boolean>((resolve) =>
        window.addEventListener(
          "contextmenu",
          (event) => setTimeout(() => resolve(event.defaultPrevented)),
          { capture: true, once: true }
        )
      )
  )
  await title.click({ button: "right" })
  expect(await prevented).toBe(false)
  await expect(page.getByRole("menu")).toHaveCount(0)
})

test("Back returns focus to the row that was opened", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/views/short`)
  const title = page.locator('[data-row="2"] [data-cell="title"]')
  await title.focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/episodes\//)
  await page.goBack()
  await expect(title).toBeFocused()
})

test("closing a row's right-click menu puts focus back in the row", async ({ page }) => {
  await desktop(page, "/views/short")
  const title = page.locator('[data-row="1"] [data-cell="title"]')
  await title.focus()
  // Right-click the row's facts, away from the link.
  const box = await page.locator('[data-row="1"]').boundingBox()
  await page.mouse.click((box?.x ?? 0) + (box?.width ?? 0) * 0.55, (box?.y ?? 0) + 8, {
    button: "right"
  })
  await expect(page.getByRole("menu")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(title).toBeFocused()
})

test("the View editor holds together at 200% text", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/views/short?edit=true`)
  await page.addStyleTag({ content: "html { font-size: 32px !important }" })
  const form = page.locator("main form, main [data-view-form], main").first()
  await page.getByRole("textbox", { name: "Name" }).waitFor()
  // No label runs under its field, and nothing scrolls sideways.
  const overflowing = await form.evaluate((root) =>
    [...root.querySelectorAll("label, select")]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent?.slice(0, 20))
  )
  expect(overflowing).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(412)
})

test("a click on a row puts focus in it, and the arrows carry the open Episode", async ({
  page
}) => {
  await desktop(page, "/views/short")
  const row = page.locator('[data-row="1"]')
  const box = await row.boundingBox()
  // The row's empty space, away from its link and buttons.
  await page.mouse.click((box?.x ?? 0) + (box?.width ?? 0) * 0.55, (box?.y ?? 0) + 8)
  await expect(page).toHaveURL(/\?episode=/)
  await expect(page.locator('[data-row="1"] [data-cell="title"]')).toBeFocused()
  const first = new URL(page.url()).searchParams.get("episode")
  await page.keyboard.press("ArrowDown")
  await expect(page.locator('[data-row="2"] [data-cell="title"]')).toBeFocused()
  await expect.poll(() => new URL(page.url()).searchParams.get("episode")).not.toBe(first)
  // The row menu offers Copy Link, not a second tab (PodList runs in one tab at a time).
  await page.mouse.click((box?.x ?? 0) + (box?.width ?? 0) * 0.55, (box?.y ?? 0) + 8, {
    button: "right"
  })
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem", { name: "Copy Link" })).toBeVisible()
  await expect(menu.getByRole("menuitem", { name: "Open in New Tab" })).toHaveCount(0)
})

test("the Episode actions keep apart at 150% and 200% text", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/views/short`)
  const href = (await page.locator("main [data-cell=title]").first().getAttribute("href")) ?? ""
  await page.goto(`${demo.base}${href}`)
  for (const size of [24, 32]) {
    await page.addStyleTag({ content: `html { font-size: ${size}px !important }` })
    await page.getByRole("button", { name: "Played" }).waitFor()
    const overlaps = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll("main article button")]
        .filter((b) => b.querySelector(".rounded-full"))
        .map((b) => b.getBoundingClientRect())
      return boxes.some((a) =>
        boxes.some(
          (b) =>
            a !== b &&
            a.left < b.right - 1 &&
            b.left < a.right - 1 &&
            a.top < b.bottom - 1 &&
            b.top < a.bottom - 1
        )
      )
    })
    expect(overlaps).toBe(false)
  }
})

test("with a toast showing, the drawer keeps focus and the toast covers none of it", async ({
  page
}) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/playlists/default`)
  await page.getByRole("button", { name: /^Open Now Playing/ }).click()
  const drawer = page.getByRole("dialog")
  await drawer.getByRole("button", { name: "Episode" }).click()
  await drawer.getByRole("button", { name: "Star", exact: true }).click()
  const undo = drawer.getByRole("button", { name: "Undo" })
  await expect(undo).toBeVisible()
  await drawer.getByRole("button", { name: /^Back/ }).first().click()
  // The toast sits in the drawer's free strip, over none of its controls.
  const overlaps = await page.evaluate(() => {
    const sheet = document.querySelector('[data-sheet="drawer"]')
    const toast = sheet?.querySelector(
      '[data-base-ui-toast-root], [role="dialog"] li, [aria-live] > div'
    )
    const undoButton = [...(sheet?.querySelectorAll("button") ?? [])].find(
      (b) => b.textContent === "Undo"
    )
    const box = (toast ?? undoButton?.parentElement)?.getBoundingClientRect()
    if (!box) return ["no toast"]
    return [...(sheet?.querySelectorAll("button") ?? [])]
      .filter((b) => !b.closest("[aria-live], [data-base-ui-toast-viewport]") && b !== undoButton)
      .filter((b) => {
        const r = b.getBoundingClientRect()
        return (
          r.width > 0 &&
          r.left < box.right &&
          box.left < r.right &&
          r.top < box.bottom &&
          box.top < r.bottom
        )
      })
      .map((b) => b.getAttribute("aria-label") ?? b.textContent)
  })
  expect(overlaps).toEqual([])
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab")
    const inside = await page.evaluate(
      () => document.activeElement?.closest('[data-sheet="drawer"]') !== null
    )
    expect(inside, `Tab ${i + 1} stays in the drawer`).toBe(true)
  }
})

test("Back and Forward over the Episode panel keep focus on the page (WKEY-03)", async ({
  page
}) => {
  await desktop(page, "/views/short")
  const title = page.locator('[data-row="1"] [data-cell="title"]')
  await title.click()
  await expect(page).toHaveURL(/episode=/)
  const onPage = () =>
    page.evaluate(() => document.activeElement !== null && document.activeElement !== document.body)
  await page.goBack()
  await expect(page).not.toHaveURL(/episode=/)
  await expect.poll(onPage).toBe(true)
  await expect(title).toBeFocused()
  await page.goForward()
  await expect(page).toHaveURL(/episode=/)
  // Focus stays on the row it was on, which is still there; never the page.
  await expect.poll(onPage).toBe(true)
})

test("type-ahead takes a space as part of what's typed", async ({ page }) => {
  await desktop(page, "/views/short")
  const first = page.locator('[data-row="0"] [data-cell="title"]')
  await first.focus()
  // "Who sets the price of rice?": "who s" reaches it past the space; no row is ticked.
  await page.keyboard.type("who s", { delay: 50 })
  await expect(page.locator(":focus")).toContainText("Who sets the price of rice?")
  await expect(page.locator("main [data-row] input[type=checkbox]:checked")).toHaveCount(0)
})
