import { expect, type Page, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

// Entries can be removed, and every step can be taken back after its toast has gone
// (DATA-04, WDATA-04 in docs/ui-grade/round-2.md).

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

const titles = (page: Page) =>
  page
    .locator("main [role=row]")
    .evaluateAll((items) =>
      items.map((li) => li.querySelector("[data-cell=title], .line-clamp-2")?.textContent ?? "")
    )

test("removes an Entry, and Cmd/Ctrl-Z puts it back after the toast", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/commute`)
  // Titles arrive with the catalogue; until then rows show placeholders.
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const before = await titles(page)
  const victim = before[1] ?? ""
  await page.getByRole("button", { name: `Remove ${victim} from Commute` }).click()
  await expect(page.getByText("Removed from Commute")).toBeVisible()
  await expect.poll(() => titles(page)).not.toContain(victim)

  // A second step hides the first toast; the shortcut walks back through both.
  const other = before[0] ?? ""
  await page.getByRole("button", { name: `Remove ${other} from Commute` }).click()
  await expect.poll(() => titles(page)).toEqual(before.filter((t) => t !== victim && t !== other))
  await page.locator("body").click({ position: { x: 5, y: 5 } })
  await page.keyboard.press("ControlOrMeta+z")
  await page.keyboard.press("ControlOrMeta+z")
  await expect.poll(() => titles(page)).toEqual(before)
  await page.keyboard.press("ControlOrMeta+z")
  await expect(page.getByText("Nothing to undo")).toBeVisible()
})

test("the toast's Undo takes back its own step", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${demo.base}/playlists/commute`)
  // Titles arrive with the catalogue; until then rows show placeholders.
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const before = await titles(page)
  await page.getByRole("button", { name: `Remove ${before[0]} from Commute` }).click()
  await page.getByRole("button", { name: "Undo" }).click()
  await expect.poll(() => titles(page)).toEqual(before)
})

test("Cmd/Ctrl-Shift-Z does an undone step again", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/commute`)
  // Titles arrive with the catalogue; until then rows show placeholders.
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const before = await titles(page)
  const victim = before[0] ?? ""
  await page.getByRole("button", { name: `Remove ${victim} from Commute` }).click()
  await expect.poll(() => titles(page)).not.toContain(victim)
  await page.locator("body").click({ position: { x: 5, y: 5 } })
  await page.keyboard.press("ControlOrMeta+z")
  await expect.poll(() => titles(page)).toEqual(before)
  await page.keyboard.press("ControlOrMeta+Shift+z")
  await expect.poll(() => titles(page)).not.toContain(victim)
  await expect(page.getByText(`Redone: Removed from Commute`)).toBeVisible()
})

test("removing a row by keyboard keeps focus in the list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/commute`)
  // Titles arrive with the catalogue; until then rows show placeholders.
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const remove = page.getByRole("button", { name: /^Remove .* from Commute$/ }).first()
  await remove.focus()
  await page.keyboard.press("Enter")
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.closest("[role=row]") !== null))
    .toBe(true)
})

test("Cmd/Ctrl-C on a row copies the Episode's link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: demo.base })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/short`)
  await page.locator('[data-row="0"] [data-cell="title"]').focus()
  await page.keyboard.press("ControlOrMeta+c")
  await expect(page.getByText("Link copied")).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toMatch(new RegExp(`^${demo.base}/episodes/`))
})

test("after a toast's Undo, focus is on the Entry it brought back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/commute`)
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const [first] = await titles(page)
  await page.getByRole("button", { name: `Remove ${first} from Commute` }).click()
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(page.getByRole("link", { name: first ?? "", exact: true })).toBeFocused()
})

test("an Undo toast is named by what it says", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/commute`)
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const [first] = await titles(page)
  await page.getByRole("button", { name: `Remove ${first} from Commute` }).click()
  await expect(page.getByRole("dialog", { name: /^Removed from Commute/ })).toBeVisible()
})
