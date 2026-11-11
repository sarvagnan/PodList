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

test("the web Library lists podcasts without Download Rules", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/library`)
  await expect(page.getByRole("heading", { name: "Podcasts · 3" })).toBeVisible()
  await expect(page.getByRole("combobox", { name: /Downloads/ })).toHaveCount(0)
})

test("Unsubscribe that fails says so in its dialog, with Try again", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: "Slow Build", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Slow Build", level: 1 })).toBeVisible()
  await page.getByRole("button", { name: "Unsubscribe" }).click()
  await page.route("**/api/subscriptions/*", (route) => route.abort())
  const dialog = page.getByRole("alertdialog")
  await dialog.getByRole("button", { name: "Unsubscribe" }).click()
  await expect(dialog.getByRole("alert")).toContainText("Couldn’t unsubscribe")
  await page.unroute("**/api/subscriptions/*")
  await dialog.getByRole("button", { name: "Try again" }).click()
  await expect(page).toHaveURL(/\/library$/)
})

test("a feed address shows its podcast before Subscribe, or says it isn't one", async ({
  page
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
  // Reload restores the open sheet and its selected tab (WDATA-01).
  await expect(sheet).toBeVisible()
  await field.fill(target?.feedUrl ?? "")
  const subscribe = sheet.getByRole("button", { name: "Subscribe to Deep Field" })
  await expect(subscribe).toBeVisible()
  await page.route("**/api/subscriptions", (route) => route.abort())
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
  // Remembered on this Device: back through the sidebar's plain /library link, it's kept.
  await page.goto(`${demo.base}/views/short`)
  await page
    .getByRole("navigation", { name: "Library and lists" })
    .getByRole("link", { name: "Library", exact: true })
    .click()
  await expect.poll(names).toEqual(["Slow Build", "Market Hours", "Deep Field"])
  await expect(page).toHaveURL(/sort=title-desc/)
})

test("on the phone, a Subscription's settings stay open after a reload", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: "Deep Field", exact: true }).click()
  const toggle = page.getByRole("button", { name: /Settings for this podcast/ })
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await page.reload()
  await expect(page.getByRole("button", { name: /Settings for this podcast/ })).toHaveAttribute(
    "aria-expanded",
    "true"
  )
})

test("the Library's select-every box shows when only some are selected", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("checkbox", { name: "Select Deep Field" }).check()
  await expect
    .poll(() =>
      page
        .getByRole("checkbox", { name: "Select every podcast" })
        .evaluate((box) => (box as HTMLInputElement).indeterminate)
    )
    .toBe(true)
})

test("a feed address isn't called wrong while it's still being typed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("button", { name: "Add podcasts" }).click()
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  await sheet.getByRole("button", { name: "Feed address" }).click()
  const field = sheet.getByRole("textbox", { name: "Feed address" })
  await field.pressSequentially("https://")
  await expect(field).toHaveAttribute("aria-invalid", "false")
  await field.press("Tab")
  await expect(field).toHaveAttribute("aria-invalid", "true")
  await field.fill("https://example.com/feed.xml")
  await expect(field).toHaveAttribute("aria-invalid", "false")
})

test("with larger text, the Library gives way to its list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await expect(page.getByRole("table")).toBeVisible()
  // 200% text: the table's columns no longer fit the main column.
  await page.addStyleTag({ content: "html { font-size: 32px !important }" })
  await expect(page.getByRole("table")).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Deep Field", exact: true })).toBeVisible()
})

test("focus stays on the page after bulk Mark Played, Mark all Played and Undo", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  // Bulk Mark Played in an Unplayed View takes the rows, and the bar, away.
  await page.goto(`${demo.base}/views/new-this-week`)
  const boxes = page.locator("main [data-row] input[type=checkbox]")
  await boxes.nth(0).check()
  await boxes.nth(1).check()
  const toolbar = page.getByRole("toolbar", { name: /selected/ })
  await toolbar.getByRole("button", { name: "Mark Played" }).focus()
  await page.keyboard.press("Enter")
  await expect(toolbar).toBeHidden()
  const focusIn = () => page.evaluate(() => document.activeElement?.closest("main") !== null)
  await expect.poll(focusIn).toBe(true)
  await page.keyboard.press("Meta+z")
  await expect.poll(focusIn).toBe(true)

  // Mark all Played keeps focus on itself when nothing is left to mark.
  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: "Deep Field", exact: true }).click()
  const markAll = page.getByRole("button", { name: "Mark all Played" })
  await markAll.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Marked Deep Field Played")).toBeVisible()
  await expect(markAll).toBeFocused()
  await expect(markAll).toHaveAttribute("aria-disabled", "true")
})

test("an OPML file can be dropped on Add podcasts, and a stray drop is refused", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/library`)
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible()
  // A file dropped outside a drop area doesn't navigate away.
  const strayRefused = await page.evaluate(() => {
    const data = new DataTransfer()
    data.items.add(new File(["<opml/>"], "x.opml", { type: "text/xml" }))
    const drop = new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true })
    document.querySelector("main")?.dispatchEvent(drop)
    return drop.defaultPrevented
  })
  expect(strayRefused).toBe(true)
  await page.getByRole("button", { name: "Add podcasts" }).click()
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  await sheet.getByRole("button", { name: "OPML file" }).click()
  await page.evaluate(() => {
    const data = new DataTransfer()
    const opml =
      '<?xml version="1.0"?><opml version="2.0"><head/><body><outline type="rss" text="Nothing" xmlUrl="http://127.0.0.1:1/none.xml"/></body></opml>'
    data.items.add(new File([opml], "subs.opml", { type: "text/xml" }))
    const zone = document.querySelector("[data-file-drop]")
    zone?.dispatchEvent(
      new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true })
    )
  })
  await expect(sheet.getByText(/Added 0|couldn’t be read/).first()).toBeVisible({ timeout: 20_000 })
})
