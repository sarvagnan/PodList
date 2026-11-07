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
    await expect(drawer.getByRole("heading", { name: "Episode", level: 2 })).toBeVisible()

    await page.goBack()
    await expect(drawer.getByRole("button", { name: "Episode" })).toBeVisible()
    await expect(drawer.getByRole("heading", { name: "Episode", level: 2 })).toBeHidden()
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
    await expect(drawer.getByRole("heading", { name: "Episode", level: 2 })).toBeVisible()
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
