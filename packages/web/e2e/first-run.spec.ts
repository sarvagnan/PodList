import { expect, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

// First run: an empty Library gets starter Views and a checklist that can be skipped.

let demo: { base: string; stop: () => void; fixtures: string }
test.beforeEach(async () => {
  demo = await startDemo({ empty: true })
})
test.afterEach(() => demo.stop())

test("a new Library starts with Views and a checklist; adding a podcast ends it", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/`)
  const welcome = page.getByRole("region", { name: "Welcome to PodList" })
  await expect(welcome).toBeVisible()
  const sidebar = page.getByRole("navigation", { name: "Library and lists" })
  for (const name of ["New this week", "Under 30 minutes", "Starred"]) {
    await expect(sidebar.getByRole("link", { name })).toBeVisible()
  }
  await welcome.getByRole("button", { name: "Add podcasts" }).click()
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  await sheet.getByRole("button", { name: "Feed address" }).click()
  await sheet
    .getByRole("textbox", { name: "Feed address" })
    .fill(`${demo.fixtures}/feeds/deep-field.xml`)
  await sheet.getByRole("button", { name: /^Subscribe to/ }).click()
  await expect(sheet.getByText("Subscribed")).toBeVisible()
  await sheet.getByRole("button", { name: "Close" }).click()
  await expect(welcome).toBeHidden()
})

test("Skip hides the checklist on this Device", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${demo.base}/`)
  const welcome = page.getByRole("region", { name: "Welcome to PodList" })
  await welcome.getByRole("button", { name: "Skip for now" }).click()
  await expect(welcome).toBeHidden()
  await page.reload()
  await expect(page.getByRole("heading", { name: "Views", level: 1 })).toBeVisible()
  await expect(welcome).toBeHidden()
})
