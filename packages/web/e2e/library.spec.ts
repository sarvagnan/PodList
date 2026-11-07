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
  await page.getByRole("link", { name: "Slow Build", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Slow Build", level: 1 })).toBeVisible()
  await page.getByRole("combobox", { name: "Speed" }).selectOption("1.5")
  await onServer("/subscriptions", '"speed":1.5')
  await page.reload()
  await expect(page.getByRole("combobox", { name: "Speed" })).toHaveValue("1.5")

  await page.getByRole("button", { name: "Unsubscribe" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Unsubscribe" }).click()
  await expect(page).toHaveURL(/\/library$/)
  await expect(page.getByRole("link", { name: "Slow Build", exact: true })).toHaveCount(0)

  await page.getByRole("button", { name: "Add podcasts" }).click()
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  await sheet.getByRole("button", { name: "Feed address" }).click()
  await sheet.getByRole("textbox", { name: "Feed address" }).fill(slow?.feedUrl ?? "")
  await sheet.getByRole("button", { name: /^Subscribe to/ }).click()
  await expect(sheet.getByText("Subscribed")).toBeVisible()
  await sheet.getByRole("button", { name: "Close" }).click()
  await expect(page.getByRole("link", { name: "Slow Build", exact: true })).toBeVisible()
})

test("Mark all Played is one step, with Undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: "Deep Field", exact: true }).click()
  const unplayed = (n: number) =>
    expect
      .poll(
        async () => ((await page.locator("main").textContent()) ?? "").includes(`${n} unplayed`),
        {
          timeout: 15_000
        }
      )
      .toBe(true)
  await unplayed(4)
  await page.getByRole("button", { name: "Mark all Played" }).click()
  await unplayed(0)
  await page.getByRole("button", { name: "Undo" }).click()
  await unplayed(4)
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
  await page.getByRole("link", { name: "Market Hours", exact: true }).click()
  await page.getByRole("combobox", { name: /^Downloads on this Device/ }).selectOption("onEntry")
  await page.getByRole("link", { name: "Library" }).first().click()
  await expect(page.getByRole("combobox", { name: "Downloads for Market Hours" })).toHaveValue(
    "onEntry"
  )

  // Market Hours' Entry in Default ends up stored, without anyone pressing Download.
  await page.goto(`${demo.base}/views/new-this-week`)
  const row = page.getByRole("row").filter({ hasText: "The long life of a shipping container" })
  await expect(row.getByLabel("Downloaded").first()).toBeVisible({ timeout: 20_000 })

  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: "Market Hours", exact: true }).click()
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
  const rule = page.getByRole("combobox", { name: "Downloads for Deep Field" })
  await expect(rule).toHaveValue("never")
  // Away from the title link, which keeps the browser's own menu.
  await page
    .getByRole("row", { name: /Deep Field/ })
    .getByRole("cell")
    .nth(2)
    .click({ button: "right" })
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitemcheckbox", { name: "Stream" })).toBeChecked()
  await menu.getByRole("menuitemcheckbox", { name: "Download Entries" }).click()
  await expect(rule).toHaveValue("onEntry")
})

test("on desktop, selected podcasts change Download Rule together, with Undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("checkbox", { name: "Select Deep Field" }).check()
  await page.getByRole("checkbox", { name: "Select Slow Build" }).check()
  const bar = page.getByRole("region", { name: "2 podcasts selected" })
  await bar.getByRole("combobox").selectOption("allNew")
  await bar.getByRole("button", { name: "Apply to 2" }).click()
  const deep = page.getByRole("combobox", { name: "Downloads for Deep Field" })
  const slow = page.getByRole("combobox", { name: "Downloads for Slow Build" })
  await expect(deep).toHaveValue("allNew")
  await expect(slow).toHaveValue("allNew")
  await expect(page.getByRole("combobox", { name: "Downloads for Market Hours" })).toHaveValue(
    "never"
  )
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(deep).toHaveValue("never")
  await expect(slow).toHaveValue("never")
})

test("on the phone, the Library is grouped by Download Rule", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/library`)
  await expect(page.getByRole("heading", { name: "Streams · 3" })).toBeVisible()
})

test("Unsubscribe that fails says so in its dialog, with Try again", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: "Slow Build", exact: true }).click()
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

test("a feed address shows its podcast before Subscribe, or says it isn't one", async ({
  page,
  context
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("button", { name: "Add podcasts" }).click()
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  await sheet.getByRole("button", { name: "Feed address" }).click()
  const field = sheet.getByRole("textbox", { name: "Feed address" })
  const base = (await (await fetch(`${demo.base}/api/subscriptions`)).json()) as Array<{
    feedUrl: string
  }>
  const origin = new URL(base[0]?.feedUrl ?? "").origin
  await field.fill(`${origin}/feeds/nothing-here.xml`)
  await expect(sheet.getByRole("alert")).toContainText("didn’t give a podcast feed")

  // Unsubscribe from one so its feed can be offered again, then fail its Subscribe.
  const deep = (await (await fetch(`${demo.base}/api/subscriptions`)).json()) as Array<{
    id: string
    title: string
    feedUrl: string
  }>
  const target = deep.find((s) => s.title === "Deep Field")
  await fetch(`${demo.base}/api/subscriptions/${target?.id}`, { method: "DELETE" })
  await page.reload()
  await page.getByRole("button", { name: "Add podcasts" }).click()
  await sheet.getByRole("button", { name: "Feed address" }).click()
  await field.fill(target?.feedUrl ?? "")
  const subscribe = sheet.getByRole("button", { name: "Subscribe to Deep Field" })
  await expect(subscribe).toBeVisible()
  await context.setOffline(true)
  await subscribe.click()
  await expect(sheet.getByRole("alert")).toBeVisible()
  // Focus stays with the button, inside the sheet (WKEY-03).
  await expect(subscribe).toBeFocused()
})

test("the Library table sorts by its columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  const names = () =>
    page
      .locator("tbody tr td:nth-child(2) a")
      .evaluateAll((links) => links.map((a) => a.textContent ?? ""))
  await expect.poll(names).toEqual(["Deep Field", "Market Hours", "Slow Build"])
  await page.getByRole("button", { name: "Unplayed" }).click()
  // Most unplayed first: Market Hours has 6.
  await expect.poll(async () => (await names())[0]).toBe("Market Hours")
  await expect(page.getByRole("columnheader", { name: "Unplayed" })).toHaveAttribute(
    "aria-sort",
    "descending"
  )
  // The order is in the URL, so a reload keeps it (DATA-06).
  await page.reload()
  await expect.poll(async () => (await names())[0]).toBe("Market Hours")
  // Name, then name again: Z–A (LIST-03).
  await page.getByRole("button", { name: "Podcast", exact: true }).click()
  await expect.poll(names).toEqual(["Deep Field", "Market Hours", "Slow Build"])
  await page.getByRole("button", { name: "Podcast", exact: true }).click()
  await expect.poll(names).toEqual(["Slow Build", "Market Hours", "Deep Field"])
})
