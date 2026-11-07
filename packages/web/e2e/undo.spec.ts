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
  await page.locator("main [role=row]").first().waitFor()
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
  await page.locator("main [role=row]").first().waitFor()
  const before = await titles(page)
  await page.getByRole("button", { name: `Remove ${before[0]} from Commute` }).click()
  await page.getByRole("button", { name: "Undo" }).click()
  await expect.poll(() => titles(page)).toEqual(before)
})
