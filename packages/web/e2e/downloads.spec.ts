import { expect, test } from "@playwright/test"
// @ts-expect-error: shared demo helper
import { startDemo } from "../ui-flows/demo.mjs"

test("web hides download controls and rules while keeping playback settings", async ({ page }) => {
  const demo = await startDemo()
  try {
    await page.goto(`${demo.base}/views/short`)
    await expect(page.getByRole("row").first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0)
    await page.goto(`${demo.base}/library`)
    await expect(page.getByRole("link", { name: "Deep Field", exact: true })).toBeVisible()
    await expect(page.getByRole("combobox", { name: /Downloads/ })).toHaveCount(0)
    await page.getByRole("link", { name: "Deep Field", exact: true }).click()
    await expect(page.getByRole("combobox", { name: "Speed" })).toBeVisible()
    await expect(page.getByRole("combobox", { name: /Downloads/ })).toHaveCount(0)
  } finally {
    demo.stop()
  }
})
