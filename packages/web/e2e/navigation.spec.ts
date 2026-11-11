import { expect, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

// Back, relaunch and the shortcuts reference (docs/ui-grade/round-2.md: BROWSER-01,
// DATA-06, KEY-08).

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test("Back closes the top layer first: drawer page, drawer, then the screen", async ({
    page
  }) => {
    await page.goto(`${demo.base}/playlists`)
    await page.goto(`${demo.base}/playlists/default`)
    await page.getByRole("button", { name: /^Open Now Playing/ }).click()
    const drawer = page.getByRole("dialog")
    await drawer.getByRole("button", { name: "Episode" }).click()
    await expect(
      drawer.getByRole("heading", { name: "Episode", level: 2, exact: true })
    ).toBeVisible()

    await page.goBack()
    await expect(drawer.getByRole("button", { name: "Episode" })).toBeVisible()
    await expect(
      drawer.getByRole("heading", { name: "Episode", level: 2, exact: true })
    ).toBeHidden()
    await expect(page).toHaveURL(/\/playlists\/default$/)
    await page.goBack()
    await expect(drawer).toBeHidden()
    await expect(page).toHaveURL(/\/playlists\/default$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/playlists$/)
  })

  test("Esc on a drawer page goes back one page, then closes the drawer", async ({ page }) => {
    await page.goto(`${demo.base}/playlists/default`)
    await page.getByRole("button", { name: /^Open Now Playing/ }).click()
    const drawer = page.getByRole("dialog")
    await drawer.getByRole("button", { name: "Episode" }).click()
    await expect(
      drawer.getByRole("heading", { name: "Episode", level: 2, exact: true })
    ).toBeVisible()
    // Every page names the dialog (AX-01).
    await expect(page.getByRole("dialog", { name: "Episode" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(drawer.getByRole("button", { name: "Episode" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
    await expect(page).toHaveURL(/\/playlists\/default$/)
  })

  test("Back closes the Add sheet and stays on the View", async ({ page }) => {
    await page.goto(`${demo.base}/views/short`)
    await page
      .getByRole("button", { name: /^Add .* to a Playlist$/ })
      .first()
      .click()
    await expect(page.getByRole("dialog", { name: "Add to a Playlist" })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page).toHaveURL(/\/views\/short$/)
  })

  test("closing a sheet with its own controls leaves no extra Back step", async ({ page }) => {
    await page.goto(`${demo.base}/views`)
    await page.goto(`${demo.base}/views/short`)
    await page
      .getByRole("button", { name: /^Add .* to a Playlist$/ })
      .first()
      .click()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden()
    await page.goBack()
    await expect(page).toHaveURL(/\/views$/)
  })
})

test("relaunching reopens the last screen and the Next / Last choice", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/short`)
  await page.getByRole("combobox").selectOption({ label: "Commute" })
  await page.goto(`${demo.base}/playlists/commute`)
  await expect(page.getByRole("heading", { name: "Commute", level: 1 })).toBeVisible()
  await page.goto(`${demo.base}/`)
  await expect(page).toHaveURL(/\/playlists\/commute$/)
  await page.goto(`${demo.base}/views/short`)
  await expect(page.getByRole("combobox")).toHaveValue("commute")
})

test("Cmd/Ctrl-/ shows the keyboard shortcuts", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/short`)
  await page.locator('[data-row="0"]').waitFor()
  await page.keyboard.press("ControlOrMeta+/")
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" })
  await expect(dialog).toContainText("Play or pause")
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: /Keyboard shortcuts/ }).click()
  await expect(dialog).toBeVisible()
})

test("closing the drawer opened on Up next stays on the screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/short`)
  await page.goto(`${demo.base}/playlists/commute`)
  await expect(page.getByRole("heading", { name: "Commute", level: 1 })).toBeVisible()
  await page
    .getByRole("region", { name: "Now playing" })
    .getByRole("button", { name: /up next/ })
    .click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toBeHidden()
  await expect(page).toHaveURL(/\/playlists\/commute$/)
  // And Back from here leaves the Playlist, as nothing of the drawer is left behind.
  await page.goBack()
  await expect(page).toHaveURL(/\/views\/short$/)
})

test("single-key shortcuts can be turned off", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/settings`)
  await page.getByRole("checkbox", { name: /Single-key shortcuts/ }).uncheck()
  await page.getByRole("heading", { name: "Settings", level: 1 }).click()
  await page.keyboard.press("/")
  await expect(page).toHaveURL(/\/settings$/)
  await page.getByRole("checkbox", { name: /Single-key shortcuts/ }).check()
  await page.getByRole("heading", { name: "Settings", level: 1 }).click()
  await page.keyboard.press("/")
  await expect(page).toHaveURL(/\/search/)
})

test("the Episode screen's back link names the View it came from", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/views/short`)
  await page.locator('[data-row="0"] [data-cell="title"]').click()
  await expect(page).toHaveURL(/\/episodes\//)
  const back = page.getByRole("link", { name: "Under 30 minutes" }).first()
  await expect(back).toHaveAttribute("href", "/views/short")
  await back.click()
  await expect(page).toHaveURL(/\/views\/short$/)
})

test("Up next in the drawer reorders with the keyboard, with Undo", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/playlists/default`)
  await page.getByRole("button", { name: /^Open Now Playing/ }).click()
  const drawer = page.getByRole("dialog")
  await drawer.getByRole("button", { name: /^Up next/ }).click()
  const list = drawer.getByRole("list", { name: /^Up next in/ })
  const order = () =>
    list
      .getByRole("button", { name: /from here$/ })
      .evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label") ?? ""))
  const before = await order()
  expect(before.length).toBeGreaterThan(1)
  // Its handle takes the arrows: down moves it one place.
  const handle = list.getByRole("button", { name: /^Move / }).first()
  await handle.focus()
  await page.keyboard.press("ArrowDown")
  await expect.poll(order).toEqual([before[1], before[0], ...before.slice(2)])
  await drawer.getByRole("button", { name: "Undo" }).click()
  await expect.poll(order).toEqual(before)
})

test("an Episode opened from a podcast keeps Library selected (LIST-06)", async ({ page }) => {
  // Phone: the Library tab stays selected, and the back link names the podcast.
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("main").getByRole("link").filter({ hasText: /\w/ }).first().click()
  await expect(page).toHaveURL(/\/library\/[^/]+$/)
  const podcast = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? ""
  await page.locator('[data-row="0"] [data-cell="title"]').click()
  await expect(page).toHaveURL(/\/episodes\//)
  const tabs = page.getByRole("navigation", { name: "Sections" })
  await expect(tabs.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page")
  await expect(tabs.getByRole("link", { name: "Views" })).not.toHaveAttribute("aria-current")
  await expect(page.getByRole("link", { name: podcast }).first()).toBeVisible()
  // Reloaded, it still knows where it was opened from.
  await page.reload()
  await expect(tabs.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page")
  // Desktop: the sidebar keeps Library highlighted.
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(
    page.getByRole("navigation", { name: "Library and lists" }).getByRole("link", {
      name: "Library",
      exact: true
    })
  ).toHaveClass(/(^|\s)active(\s|$)/)
})

test("New View starts at Rename, which opens its Name field", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views`)
  await page.getByRole("button", { name: "New View" }).first().click()
  await expect(page).toHaveURL(/edit=true/)
  await expect(page.getByRole("button", { name: "Rename", exact: true })).toBeFocused()
  await page.getByRole("button", { name: "Rename", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Name" })).toBeFocused()
})

test("on the phone, Back closes an open menu first (BROWSER-01)", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/playlists`)
  await page.goto(`${demo.base}/playlists/commute`)
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const more = page.getByRole("button", { name: /^More actions for / }).first()
  await more.click()
  await expect(page.getByRole("menu")).toBeVisible()
  await page.goBack()
  await expect(page.getByRole("menu")).toBeHidden()
  await expect(page).toHaveURL(/\/playlists\/commute$/)
  await expect(more).toBeFocused()

  // In the drawer: Back closes the Speed menu, and the drawer stays.
  await page.getByRole("button", { name: /^Open Now Playing/ }).click()
  const drawer = page.getByRole("dialog")
  await drawer.getByRole("button", { name: /^Speed/ }).click()
  await expect(page.getByRole("menu")).toBeVisible()
  await page.goBack()
  await expect(page.getByRole("menu")).toBeHidden()
  await expect(drawer).toBeVisible()

  // A menu choice that goes somewhere still goes there.
  await page.goBack()
  await expect(drawer).toBeHidden()
  await page
    .getByRole("button", { name: /^More actions for / })
    .first()
    .click()
  await page.getByRole("menuitem", { name: "Open Episode" }).click()
  await expect(page).toHaveURL(/\/episodes\//)
})
