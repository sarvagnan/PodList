import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

for (const action of ["View edit", "Undo"] as const) {
  test(`${action} warns before an immediate departure and survives after delivery`, async ({
    page
  }) => {
    const demo = await startDemo()
    let release = () => {}
    try {
      await page.setViewportSize({ width: action === "Undo" ? 412 : 1440, height: 900 })
      await page.goto(
        `${demo.base}/${action === "View edit" ? "views/starred?edit=true" : "views/new-this-week"}`
      )
      if (action === "Undo") {
        const row = page.getByRole("row").filter({ hasText: "Joinery without screws" })
        await row.getByRole("button", { name: "Add Joinery without screws to a Playlist" }).click()
        const sheet = page.getByRole("dialog", { name: "Add to a Playlist" })
        await sheet.getByRole("radio", { name: "New Playlist…" }).check()
        await sheet.getByRole("textbox", { name: "Name" }).fill("Walking")
        const created = page.waitForResponse(
          (response) => response.url().endsWith("/api/sync/push") && response.ok()
        )
        await sheet.getByRole("button", { name: "Play Next", exact: true }).click()
        await created
        await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible()
      }
      const feedback = page.locator(
        `[data-sync-feedback="${action === "Undo" ? "phone" : "desktop"}"]`
      )
      await expect(feedback).toBeHidden()
      // Hold View delivery, or an earlier pull that keeps Undo from even starting
      // its upload. Both forms of pending work must protect an immediate departure.
      const held = new Promise<void>((resolve) => {
        release = resolve
      })
      let intercepted = false
      await page.route(
        action === "Undo" ? "**/api/sync/pull?**" : "**/api/sync/push",
        async (route) => {
          if (!intercepted) {
            intercepted = true
            await held
          }
          await route.continue()
        }
      )
      if (action === "Undo") {
        await page.evaluate(() => window.dispatchEvent(new Event("online")))
        await expect.poll(() => intercepted).toBe(true)
      }
      if (action === "View edit")
        await page.getByRole("combobox", { name: "At most", exact: true }).selectOption("90")
      else await page.getByRole("button", { name: "Undo", exact: true }).click()
      await expect.poll(() => intercepted).toBe(true)
      const warning = page.waitForEvent("dialog")
      await page.evaluate((undo) => {
        setTimeout(() => {
          if (undo) location.assign("/playlists")
          else location.reload()
        }, 0)
      }, action === "Undo")
      const dialog = await warning
      expect(dialog.type()).toBe("beforeunload")
      await dialog.dismiss()
      if (action === "View edit")
        await expect(page.getByRole("combobox", { name: "At most", exact: true })).toHaveValue("90")
      else await expect(page.getByText(/^Undone:/)).toBeVisible()
      const delivered = page.waitForResponse(
        (response) => response.url().endsWith("/api/sync/push") && response.ok()
      )
      release()
      await delivered
      await expect(feedback).toBeHidden()
      await page.goto(
        `${demo.base}/${action === "View edit" ? "views/starred?edit=true" : "playlists"}`
      )
      if (action === "View edit")
        await expect(page.getByRole("combobox", { name: "At most", exact: true })).toHaveValue("90")
      else {
        await expect(page.getByRole("link", { name: /^Commute/ })).toBeVisible()
        await expect(page.getByRole("link", { name: /^Walking/ })).toHaveCount(0)
      }
    } finally {
      release()
      demo.stop()
    }
  })
}
