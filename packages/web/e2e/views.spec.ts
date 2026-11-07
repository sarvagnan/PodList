import { expect, type Page, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

// The View editor and Search (docs/design/ui-layout.md › View editor and Search).

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

const rows = (page: Page) => page.locator("main [role=row]")

test("edits a View in the side panel; changes apply at once and Undo takes one back", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/new-this-week`)
  await rows(page).first().waitFor()
  const before = await rows(page).count()
  await page.getByRole("button", { name: "Edit View" }).click()
  const panel = page.getByRole("complementary", { name: "Edit View" })
  await panel.getByRole("combobox", { name: "At most" }).selectOption("30")
  await expect.poll(() => rows(page).count()).toBeLessThan(before)
  await page.locator("body").click({ position: { x: 5, y: 5 } })
  await page.keyboard.press("ControlOrMeta+z")
  await expect.poll(() => rows(page).count()).toBe(before)
  await panel.getByRole("button", { name: "Done" }).click()
  await expect(page.getByRole("button", { name: "Edit View" })).toBeFocused()
})

test("a View needs a name", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/new-this-week?edit=true`)
  const name = page.getByRole("textbox", { name: "Name" })
  await name.fill("")
  await name.blur()
  await expect(page.getByText("A View needs a name.")).toBeVisible()
  await expect(page.getByRole("heading", { name: "New this week", level: 1 })).toBeVisible()
})

test("New View opens its editor; Delete View offers Undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/short`)
  await page.getByRole("button", { name: "New View" }).click()
  await expect(page).toHaveURL(/\/views\/[^/?]+\?edit=true/)
  await page.getByRole("textbox", { name: "Name" }).fill("Long ones")
  await page.getByRole("combobox", { name: "At least" }).selectOption("30")
  const sidebar = page.getByRole("navigation", { name: "Library and lists" })
  await expect(sidebar.getByRole("link", { name: "Long ones" })).toBeVisible()
  await page.getByRole("button", { name: "Delete View" }).click()
  await expect(page).toHaveURL(/\/views$|\/views\/[^/]+$/)
  await expect(sidebar.getByRole("link", { name: "Long ones" })).toHaveCount(0)
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(sidebar.getByRole("link", { name: "Long ones" })).toBeVisible()
})

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test("Edit is a screen of its own with a live count", async ({ page }) => {
    await page.goto(`${demo.base}/views/new-this-week`)
    await page.getByRole("button", { name: /^Edit/ }).click()
    await expect(page.getByRole("heading", { name: "Edit View", level: 1 })).toBeVisible()
    await expect(page.getByText(/^Matches \d+ Episodes? now$/)).toBeVisible()
    await page.getByRole("button", { name: "Done" }).click()
    await expect(page.getByRole("heading", { name: "New this week", level: 1 })).toBeVisible()
  })
})

test("Search finds by words and saves as a named View", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/short`)
  await rows(page).first().waitFor()
  // ⌘K, on every OS here: Ctrl+K belongs to the browser outside a Mac (BROWSER-05).
  await page.keyboard.press("Meta+k")
  const field = page.getByRole("searchbox", { name: "Search the Library" })
  await expect(field).toBeFocused()
  await field.fill("market")
  await expect(page).toHaveURL(/q=market/)
  await expect.poll(() => rows(page).count()).toBeGreaterThan(0)
  await page.getByRole("button", { name: "Save as View" }).click()
  const dialog = page.getByRole("dialog", { name: "Save as a View" })
  await dialog.getByRole("button", { name: "Save View" }).click()
  await expect(dialog.getByText("A View needs a name.")).toBeVisible()
  await dialog.getByRole("textbox", { name: "Name" }).fill("Markets")
  await dialog.getByRole("button", { name: "Save View" }).click()
  await expect(page.getByRole("heading", { name: "Markets", level: 1 })).toBeVisible()
})

test("a View that isn't there says so, names the tab and leads back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/nope`)
  await expect(page.getByRole("heading", { name: "View not found", level: 1 })).toBeVisible()
  await expect(page).toHaveTitle("View not found · PodList")
  await page.getByRole("main").getByRole("link", { name: "See your Views" }).click()
  // Views, or (on desktop) straight on to one of them.
  await expect(page).toHaveURL(/\/views(\/(?!nope)|$)/)
})
