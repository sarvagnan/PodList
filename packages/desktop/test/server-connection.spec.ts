import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

test("checks a server, switches Libraries and reconnects to the saved profile", async ({
  desktop: { launch, close }
}) => {
  const a = await startDemo()
  const b = await startDemo({ empty: true })
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-connection-"))
  try {
    const app = await launch({ PODLIST_USER_DATA: profile })
    let page = await app.firstWindow()
    const connectTo = async (address: string) => {
      const replacing = app.waitForEvent("window")
      await page.getByRole("textbox", { name: "Server Address" }).fill(address)
      await page.getByRole("button", { name: "Check and Connect" }).click()
      page = await replacing
      await expect(page).toHaveURL(/^app:\/\/podlist\//)
    }
    await expect(page.getByRole("heading", { name: "Welcome to PodList" })).toBeVisible()
    await page.getByRole("textbox", { name: "Server Address" }).fill(`${a.base}/wrong`)
    await page.getByRole("button", { name: "Check and Connect" }).click()
    await expect(page.getByRole("alert")).toContainText("Use only the address")
    await connectTo(a.base)
    const sidebar = () => page.getByRole("navigation", { name: "Library and lists" })
    await expect(sidebar().getByRole("link", { name: /^Commute/ })).toBeVisible()

    await sidebar().getByRole("link", { name: "Settings", exact: true }).click()
    const settings = () => page.getByRole("region", { name: "Server Connection" })
    await expect(settings().getByText(a.base, { exact: true })).toBeVisible()
    await settings().getByRole("button", { name: "Change Server…" }).click()
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
    await connectTo(b.base)
    await expect(sidebar().getByRole("link", { name: /^Commute/ })).toHaveCount(0)

    await sidebar().getByRole("link", { name: "Settings", exact: true }).click()
    await expect(settings().getByText(b.base, { exact: true })).toBeVisible()
    const welcome = app.waitForEvent("window")
    await settings().getByRole("button", { name: "Disconnect" }).click()
    page = await welcome
    await expect(page.getByRole("heading", { name: "Welcome to PodList" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancel" })).toBeHidden()
    await connectTo(a.base)
    await expect(sidebar().getByRole("link", { name: /^Commute/ })).toBeVisible()
    await close(app)
  } finally {
    a.stop()
    b.stop()
  }
})
