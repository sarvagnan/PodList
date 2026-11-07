import { type Browser, expect as baseExpect, type Page, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

// Two Devices against one server (ADR 0003): each Device is its own browser context,
// so its own local database. The server is a fresh demo server per test.

// A pushed edit waits 2 s for others to settle before it goes up.
const expect = baseExpect.configure({ timeout: 20_000 })

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  // Two Devices, each syncing more than once.
  test.setTimeout(90_000)
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

const device = async (browser: Browser) => {
  const context = await browser.newContext({
    baseURL: demo.base,
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()
  // The service worker keeps the app's code, as on a real Device, so it works offline.
  await page.goto("/playlists/commute")
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Commute", level: 1 })).toBeVisible()
  await expect(page.getByRole("row").first()).not.toContainText("Episode unavailable")
  return { context, page }
}

/** Opening the app again syncs at once. */
const reopen = async (page: Page, path: string) => {
  await page.goto(path)
  await page.locator("main [role=row]").first().waitFor()
}

const entryTitles = (page: Page) =>
  page
    .locator("main [role=row]")
    .evaluateAll((items) =>
      items.map((li) => li.querySelector("[data-cell=title]")?.textContent ?? "")
    )

const addLast = async (page: Page, title: string) => {
  // In-app navigation, which works offline too.
  await page
    .getByRole("navigation", { name: "Library and lists" })
    .getByRole("link", { name: "Under 30 minutes" })
    .click()
  await page.getByRole("row").first().waitFor()
  await page.getByRole("combobox").selectOption({ label: "Commute" })
  const row = page.getByRole("row").filter({ hasText: title })
  await row.getByRole("button", { name: "Play Last in Commute" }).click()
  await expect(page.getByText("Added last in Commute")).toBeVisible()
}

test("an edit on one Device reaches the other", async ({ browser }) => {
  const phone = await device(browser)
  const mac = await device(browser)
  await addLast(phone.page, "The economics of queues")
  await expect
    .poll(async () => {
      await reopen(mac.page, "/playlists/commute")
      return entryTitles(mac.page)
    })
    .toContain("The economics of queues")
})

test("edits made offline on two Devices both survive", async ({ browser }) => {
  const phone = await device(browser)
  const mac = await device(browser)
  await phone.context.setOffline(true)
  await addLast(phone.page, "The economics of queues")
  await addLast(mac.page, "Lighthouses and public goods")
  // Back online: the phone's queued edit goes up and the Mac's comes down.
  await phone.context.setOffline(false)
  for (const { page } of [phone, mac]) {
    await expect
      .poll(async () => {
        await reopen(page, "/playlists/commute")
        return entryTitles(page)
      })
      .toEqual(expect.arrayContaining(["The economics of queues", "Lighthouses and public goods"]))
  }
})

test("for one Entry's Position, the latest listen wins", async ({ browser }) => {
  const phone = await device(browser)
  const mac = await device(browser)
  const entry = (page: Page) =>
    page.locator("main [role=row]").filter({ hasText: "When a currency disappears" })
  const forward = (page: Page, times: number) =>
    test.step(`forward ${times * 30} s`, async () => {
      const bar = page.getByRole("region", { name: "Now playing" })
      for (let i = 0; i < times; i++) {
        await bar.getByRole("button", { name: "Forward 30 seconds" }).click()
      }
    })

  // The phone listens first, offline: its report is the older one.
  await entry(phone.page)
    .getByRole("button", { name: /from here$/ })
    .click()
  await phone.page
    .getByRole("region", { name: "Now playing" })
    .getByRole("button", { name: "Pause" })
    .click()
  await phone.context.setOffline(true)
  await forward(phone.page, 2)

  // Later the Mac listens further, online.
  await reopen(mac.page, "/playlists/commute")
  await entry(mac.page)
    .getByRole("button", { name: /from here$/ })
    .click()
  await mac.page
    .getByRole("region", { name: "Now playing" })
    .getByRole("button", { name: "Pause" })
    .click()
  await forward(mac.page, 4)

  // The phone's older report arrives last, but doesn't win.
  await phone.context.setOffline(false)
  const timeLeft = (page: Page) => entry(page).locator(".tabular-nums").textContent()
  await expect
    .poll(async () => {
      await reopen(mac.page, "/playlists/commute")
      return timeLeft(mac.page)
    })
    .toMatch(/left$/)
  const macTime = await timeLeft(mac.page)
  await expect
    .poll(async () => {
      await reopen(phone.page, "/playlists/commute")
      return timeLeft(phone.page)
    })
    .toBe(macTime)
})
