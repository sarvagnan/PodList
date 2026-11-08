import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

for (const placement of ["Next", "Last"]) {
  test(`adds an Episode to a new Playlist with Play ${placement}, validates its name and undoes in one step`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 412, height: 900 })
    await page.goto(`${demo.base}/views/new-this-week`)
    const row = page.getByRole("row").filter({ hasText: "Joinery without screws" })
    await row.getByRole("button", { name: "Add Joinery without screws to a Playlist" }).click()
    const sheet = page.getByRole("dialog", { name: "Add to a Playlist" })
    await sheet.getByRole("radio", { name: "New Playlist…" }).check()
    const name = sheet.getByRole("textbox", { name: "Name" })
    await expect(name).toBeFocused()
    await sheet.getByRole("button", { name: `Play ${placement}` }).click()
    await expect(sheet.getByRole("alert")).toHaveText("A Playlist needs a name.")
    await name.fill("commute")
    await sheet.getByRole("button", { name: `Play ${placement}` }).click()
    await expect(sheet.getByRole("alert")).toContainText("already a Playlist")
    await name.fill("Walking")
    await sheet.getByRole("button", { name: `Play ${placement}` }).click()
    await expect(sheet).toBeHidden()
    await expect(page.getByText("Created “Walking” with 1 Episode")).toBeVisible()
    await page.getByRole("button", { name: "Undo", exact: true }).click()
    await page.goto(`${demo.base}/playlists`)
    await expect(page.getByRole("link", { name: /^Walking/ })).toHaveCount(0)
  })
}

test("bulk selection creates and fills a Playlist in View order, and Redo restores it", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/new-this-week`)
  const rows = page.locator('main [role="row"]')
  await expect(rows.first().locator('[data-cell="title"]')).toBeVisible()
  const names = await rows.locator('[data-cell="title"]').allTextContents()
  await rows.nth(0).getByRole("checkbox").check()
  await rows.nth(1).getByRole("checkbox").check()
  await page.getByRole("toolbar").getByRole("button", { name: "New Playlist…" }).click()
  const dialog = page.getByRole("dialog", { name: "Add to a Playlist" })
  await dialog.getByRole("textbox", { name: "Name" }).fill("Two Episodes")
  await dialog.getByRole("button", { name: "Play Next" }).click()
  await expect(page.getByText("Created “Two Episodes” with 2 Episodes")).toBeVisible()
  await page.locator("main h1").focus()
  await page.keyboard.press("ControlOrMeta+z")
  await expect(
    page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: /^Two Episodes/ })
  ).toHaveCount(0)
  await page.keyboard.press("ControlOrMeta+Shift+z")
  const link = page
    .getByRole("navigation", { name: "Library and lists" })
    .getByRole("link", { name: /^Two Episodes/ })
  await expect(link).toBeVisible()
  await link.click()
  await expect
    .poll(() => page.locator('main [data-cell="title"]').allTextContents())
    .toEqual(names.slice(0, 2))
})

test("a row menu can create a Playlist in place", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/new-this-week`)
  const row = page.getByRole("row").filter({ hasText: "Joinery without screws" })
  await row.click({ button: "right" })
  await page.getByRole("menuitem", { name: "New Playlist…" }).click()
  const dialog = page.getByRole("dialog", { name: "Add to a Playlist" })
  await expect(dialog.getByRole("textbox", { name: "Name" })).toBeFocused()
  await dialog.getByRole("textbox", { name: "Name" }).fill("A new Playlist")
  await dialog.getByRole("button", { name: "Play Last" }).click()
  await expect(page.getByText("Created “A new Playlist” with 1 Episode")).toBeVisible()
})
