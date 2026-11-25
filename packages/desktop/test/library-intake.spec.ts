import { mkdtempSync, writeFileSync } from "node:fs"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
import { parsePodListLink, podListLink } from "../../web/src/lib/podListLink.ts"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

test("opens an app link into the active Library and preserves the screen for a missing item", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-app-link-"))
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    const playlist = sidebar.getByRole("link", { name: /^Default/ })
    const href = await playlist.getAttribute("href")
    const id = href?.split("/").at(-1)
    expect(id).toBeTruthy()
    const open = (link: string) =>
      app.evaluate(({ app }, link) => {
        app.emit("open-url", { preventDefault() {} }, link)
      }, link)

    const link = podListLink({ kind: "playlist", value: decodeURIComponent(id ?? "") })
    expect(parsePodListLink(link)?.kind).toBe("playlist")
    await open(link)
    await expect(page.getByRole("heading", { name: "Default", level: 1 })).toBeVisible()
    await open("podlist://playlist/nonexistent")
    await expect(page.getByText("This PodList link isn’t available in this Library.")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Default", level: 1 })).toBeVisible()
  } finally {
    await close(app)
    demo.stop()
    await rm(profile, { recursive: true, force: true })
  }
})

test("native OPML opens an accessible preview and dropped and pasted feeds only stage Add Podcasts", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-opml-preview-"))
  const address = `${demo.fixtures}/feeds/long-list.xml`
  const document = join(profile, "Test Subscriptions.opml")
  writeFileSync(document, `<opml><body><outline xmlUrl="${address}"/></body></opml>`)
  const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole("heading", { name: "New this week", level: 1 })).toBeVisible()
    await app.evaluate(({ app }, file) => {
      app.emit("open-file", { preventDefault() {} }, file)
    }, document)
    const preview = page.getByRole("region", { name: "OPML import and export" })
    await expect(preview).toBeFocused()
    await expect(preview.getByRole("status")).toContainText("Test Subscriptions.opml: 1 podcasts")
    await expect(preview.getByRole("button", { name: "Import", exact: true })).toBeEnabled()
    await preview.getByRole("button", { name: "Cancel", exact: true }).click()

    await page.locator("main").evaluate((main, address) => {
      const dataTransfer = new DataTransfer()
      dataTransfer.setData("text/uri-list", `# feed\r\n${address}\r\n`)
      main.dispatchEvent(new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }))
    }, address)
    const sheet = page.getByRole("dialog", { name: "Add podcasts" })
    const field = sheet.getByRole("searchbox", { name: "Podcast Name or Feed Address" })
    await expect(field).toBeFocused()
    await expect(field).toHaveValue(address)
    await expect(sheet.getByRole("link", { name: "Long listening" })).toBeVisible()
    const pasted = `${demo.fixtures}/feeds/slow-build.xml`
    await field.evaluate((field, address) => {
      const clipboardData = new DataTransfer()
      clipboardData.setData("text/plain", `  ${address}\n`)
      field.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true })
      )
    }, pasted)
    await expect(field).toHaveValue(pasted)
    await page.keyboard.press("Escape")
    await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible()
    await expect(page.getByRole("link", { name: "Long listening", exact: true })).toHaveCount(0)
  } finally {
    await close(app)
    demo.stop()
    await rm(profile, { recursive: true, force: true })
  }
})
