import { expect, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

// The Library and a Subscription's screen (docs/design/ui-layout.md › Library).

/** Waits until the server has an edit, so a reload can't arrive before it does. */
const onServer = (path: string, text: string) =>
  expect
    .poll(async () => (await (await fetch(`${demo.base}/api${path}`)).text()).includes(text), {
      timeout: 15_000
    })
    .toBe(true)

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

test("a Subscription's settings save, and Unsubscribe then Add by feed address", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const subscriptions = (await (await fetch(`${demo.base}/api/subscriptions`)).json()) as Array<{
    title: string
    feedUrl: string
  }>
  const slow = subscriptions.find((s) => s.title === "Slow Build")
  expect(slow).toBeDefined()

  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: /Slow Build/ }).click()
  await expect(page.getByRole("heading", { name: "Slow Build", level: 1 })).toBeVisible()
  await page.getByRole("combobox", { name: "Speed" }).selectOption("1.5")
  await onServer("/subscriptions", '"speed":1.5')
  await page.reload()
  await expect(page.getByRole("combobox", { name: "Speed" })).toHaveValue("1.5")

  await page.getByRole("button", { name: "Unsubscribe" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Unsubscribe" }).click()
  await expect(page).toHaveURL(/\/library$/)
  await expect(page.getByRole("link", { name: /Slow Build/ })).toHaveCount(0)

  await page.getByRole("button", { name: "Add podcasts" }).click()
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  await sheet.getByRole("button", { name: "Feed address" }).click()
  await sheet.getByRole("textbox", { name: "Feed address" }).fill(slow?.feedUrl ?? "")
  await sheet.getByRole("button", { name: /^Subscribe to/ }).click()
  await expect(sheet.getByText("Subscribed")).toBeVisible()
  await sheet.getByRole("button", { name: "Close" }).click()
  await expect(page.getByRole("link", { name: /Slow Build/ })).toBeVisible()
})

test("Mark all Played asks first", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: /Deep Field/ }).click()
  await page.getByRole("button", { name: "Mark all Played" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Mark all Played?" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Mark all Played" }).click()
  await expect
    .poll(async () => ((await page.locator("main").textContent()) ?? "").includes("0 unplayed"), {
      timeout: 15_000
    })
    .toBe(true)
})

test("Settings keep the default speed and how long the Trash keeps Playlists", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/short`)
  await page
    .getByRole("navigation", { name: "Library and lists" })
    .getByRole("link", { name: "Settings" })
    .click()
  await page.getByRole("combobox", { name: /^Speed/ }).selectOption("1.5")
  await page.getByRole("combobox", { name: "Keep deleted Playlists" }).selectOption("14")
  await onServer("/sync/pull?since=0", '"trashDays":14')
  await onServer("/sync/pull?since=0", '"speed":1.5')
  await page.reload()
  await expect(page.getByRole("combobox", { name: /^Speed/ })).toHaveValue("1.5")
  await expect(page.getByRole("combobox", { name: "Keep deleted Playlists" })).toHaveValue("14")
})

test("a Download Rule stores Entries on this Device and Stream lets them go", async ({ page }) => {
  // Two downloads to wait for, one each way.
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.getByRole("link", { name: /Market Hours/ }).click()
  await page.getByRole("combobox", { name: /^Downloads on this Device/ }).selectOption("onEntry")
  await page.getByRole("link", { name: "Library" }).first().click()
  await expect(page.getByRole("heading", { name: /^Downloads Entries · 1/ })).toBeVisible()

  // Market Hours' Entry in Default ends up stored, without anyone pressing Download.
  await page.goto(`${demo.base}/views/new-this-week`)
  const row = page.getByRole("row").filter({ hasText: "The long life of a shipping container" })
  await expect(row.getByLabel("Downloaded").first()).toBeVisible({ timeout: 20_000 })

  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: /Market Hours/ }).click()
  await page.getByRole("combobox", { name: /^Downloads on this Device/ }).selectOption("never")
  await page.goto(`${demo.base}/views/new-this-week`)
  await expect(row.getByLabel("Downloaded")).toHaveCount(0, { timeout: 20_000 })
})

test("?add=true opens Add podcasts once, and Esc closes it", async ({ page }) => {
  await page.goto(`${demo.base}/library?add=true`)
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  await expect(sheet).toBeVisible()
  await expect(page).toHaveURL(/\/library$/)
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
  await page.reload()
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible()
  await expect(sheet).toBeHidden()
})

test("right-click on a Subscription changes its Download Rule", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  const streams = page.getByRole("region", { name: /^Streams/ })
  const row = streams.getByRole("listitem").first()
  const name = (await row.locator(".font-medium").first().textContent()) ?? ""
  await row.click({ button: "right" })
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitemcheckbox", { name: "Stream" })).toBeChecked()
  await menu.getByRole("menuitemcheckbox", { name: "Download Entries" }).click()
  await expect(
    page
      .getByRole("region", { name: /^Downloads Entries/ })
      .getByRole("link", { name: new RegExp(`^${name}`) })
  ).toBeVisible()
})

test("Unsubscribe that fails says so in its dialog, with Try again", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: /Slow Build/ }).click()
  await expect(page.getByRole("heading", { name: "Slow Build", level: 1 })).toBeVisible()
  await context.setOffline(true)
  await page.getByRole("button", { name: "Unsubscribe" }).click()
  const dialog = page.getByRole("alertdialog")
  await dialog.getByRole("button", { name: "Unsubscribe" }).click()
  await expect(dialog.getByRole("alert")).toContainText("Couldn’t unsubscribe")
  await context.setOffline(false)
  await dialog.getByRole("button", { name: "Try again" }).click()
  await expect(page).toHaveURL(/\/library$/)
})
