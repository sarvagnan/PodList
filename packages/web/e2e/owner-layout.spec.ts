import { expect, type Page, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async ({ page }) => {
  demo = await startDemo()
  await page.setViewportSize({ width: 1600, height: 1000 })
})
test.afterEach(() => demo.stop())

const unsubscribe = async (page: Page) => {
  await page.getByRole("button", { name: "Unsubscribe", exact: true }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Unsubscribe" }).click()
  await expect(page).toHaveURL(/\/library$/)
}

test("Unsubscribe offers toast and keyboard Undo, retries offline, and supports Redo", async ({
  page
}) => {
  await page.goto(`${demo.base}/library`)
  const podcast = page.getByRole("link", { name: "Slow Build", exact: true })
  await podcast.click()
  await page.getByRole("combobox", { name: "Speed", exact: true }).selectOption("1.5")
  await unsubscribe(page)
  await expect(podcast).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible()
  // A failed request must leave both the original step and its retry action available.
  await page.route("**/api/subscriptions", (route) => route.abort())
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  const retry = page.getByRole("dialog", { name: /Undo is still available/ })
  await expect(retry).toBeVisible()
  await expect(retry.getByRole("button", { name: "Undo", exact: true })).toBeVisible()
  await expect(podcast).toHaveCount(0)
  await page.unroute("**/api/subscriptions")
  await page.locator("main h1").click()
  await page.keyboard.press("ControlOrMeta+z")
  await expect(podcast).toBeVisible()
  await page.route("**/api/subscriptions/*", (route) => route.abort())
  await page.keyboard.press("ControlOrMeta+Shift+z")
  await expect(page.getByText(/Redo is still available/)).toBeVisible()
  await expect(podcast).toBeVisible()
  await page.unroute("**/api/subscriptions/*")
  await page.getByRole("button", { name: "Redo", exact: true }).click()
  await expect(podcast).toHaveCount(0)
  await expect(page.getByText("Redone: Unsubscribed from Slow Build")).toBeVisible()
  await page.keyboard.press("ControlOrMeta+z")
  await expect(podcast).toBeVisible()
  await podcast.click()
  await expect(page.getByRole("combobox", { name: "Speed", exact: true })).toHaveValue("1.5")
  await unsubscribe(page)
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect(podcast).toBeVisible()
})

test("Playlist panel follows the Cursor unless an Episode is explicitly opened", async ({
  page
}) => {
  await page.goto(`${demo.base}/playlists/default`)
  const rows = page.locator("main [data-row]")
  const panel = page.getByRole("complementary", { name: "Episode", exact: true })
  await expect(panel).toContainText("The long life of a shipping container")
  await expect(panel.getByRole("button", { name: "Close Episode" })).toHaveCount(0)
  await expect(page.locator('main [aria-selected="true"]')).toHaveCount(0)
  await rows.first().locator('[data-cell="title"]').click()
  await expect(panel).toContainText("The quiet edge of the solar system")
  await expect(rows.first()).toHaveAttribute("aria-selected", "true")
  await page.emulateMedia({ forcedColors: "active" })
  await page.keyboard.press("Escape")
  await expect(rows.first().locator('[data-cell="title"]')).toBeFocused()
  await expect(panel).toContainText("The long life of a shipping container")
  await expect(page.locator('main [aria-selected="true"]')).toHaveCount(0)
  await page.addStyleTag({ content: "html { font-size: 200% !important }" })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await expect(panel.getByRole("button", { name: "Star", exact: true })).toBeInViewport()
  await page.getByRole("link", { name: "History", exact: true }).click()
  await expect(panel).toHaveCount(0)
})

test("an empty Playlist and one past its end keep a quiet panel", async ({ page }) => {
  const pulled = await (await fetch(`${demo.base}/api/sync/pull?since=0`)).json()
  const changes = [
    { _tag: "CreatePlaylist", playlistId: "empty", name: "Empty", clearOnPlayed: false },
    { _tag: "SetCursor", playlistId: "default", episodeId: null }
  ]
  await fetch(`${demo.base}/api/sync/push`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operations: changes.map((change, i) => ({
        id: `owner-layout-${i}`,
        deviceId: "demo-seed",
        sequence: pulled.cursor + i + 1,
        recordedAt: Date.now(),
        change
      }))
    })
  })
  for (const id of ["empty", "default"]) {
    await page.goto(`${demo.base}/playlists/${id}`)
    await expect(page.getByRole("complementary", { name: "Episode", exact: true })).toContainText(
      "No current Entry"
    )
  }
})

for (const route of [
  "library",
  "playlists",
  "playlists/trash",
  "playlists/default?tab=history",
  "playlists/default?tab=timeline"
]) {
  test(`${route} keeps its header and content at reading width`, async ({ page }) => {
    await page.goto(`${demo.base}/${route}`)
    const header = page.locator("main header")
    await expect(header).toBeVisible()
    expect((await header.boundingBox())?.width).toBe(960)
    const right = await header.evaluate((el) => el.getBoundingClientRect().right)
    await expect(
      page.locator("main table, main ul, main ol, main .border-dashed, main a.border-b").first()
    ).toBeVisible()
    const contentRight = await page.locator("main").evaluate((main) => {
      const header = main.querySelector("header")
      const nodes = [
        ...main.querySelectorAll("table, [role=grid], ol, ul, .border-dashed, a.border-b")
      ].filter((el) => !header?.contains(el) && el.getBoundingClientRect().width > 0)
      return Math.max(...nodes.map((el) => el.getBoundingClientRect().right))
    })
    expect(contentRight).toBeLessThanOrEqual(right)
    expect(contentRight).toBeGreaterThan(right - 65)
  })
}

test("the empty Views overview and card share the reading edge", async ({ page }) => {
  const response = await fetch(`${demo.base}/api/sync/push`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operations: ["new-this-week", "short", "starred"].map((viewId, i) => ({
        id: `remove-view-${i}`,
        deviceId: "demo-seed",
        sequence: 1000 + i,
        recordedAt: Date.now(),
        change: { _tag: "DeleteView", viewId }
      }))
    })
  })
  expect(response.ok).toBe(true)
  await page.goto(`${demo.base}/views`)
  await expect(page.locator("main").getByText("No Views yet", { exact: true })).toBeVisible()
  const header = await page.locator("main header").boundingBox()
  const card = await page.locator("main .border-dashed").boundingBox()
  expect(header?.width).toBe(960)
  expect((header?.x ?? 0) + (header?.width ?? 0) - 32).toBe((card?.x ?? 0) + (card?.width ?? 0))
})

test("Subscription content and header share their right edge", async ({ page }) => {
  await page.goto(`${demo.base}/library`)
  await page.getByRole("link", { name: "Slow Build", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Slow Build", level: 1 })).toBeVisible()
  const widths = await page
    .locator("main")
    .evaluate((main) => [
      main.querySelector("header")?.getBoundingClientRect().right,
      main.querySelector("section")?.parentElement?.getBoundingClientRect().right
    ])
  expect(widths[0]).toBe(widths[1])
})

test("Rewind stays in place, appears on hover and keyboard focus, including forced colours", async ({
  page
}) => {
  await page.goto(`${demo.base}/playlists/default?tab=timeline`)
  const rewind = page.getByRole("button", { name: /^Rewind to here:/ }).first()
  await page.mouse.move(0, 0)
  await expect(rewind).toHaveCSS("opacity", "0")
  const before = await rewind.boundingBox()
  await rewind.locator("..").hover()
  await expect(rewind).toHaveCSS("opacity", "1")
  expect(await rewind.boundingBox()).toEqual(before)
  await page.mouse.move(0, 0)
  await page.emulateMedia({ forcedColors: "active" })
  await rewind.focus()
  await expect(rewind).toHaveCSS("opacity", "1")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("alertdialog")).toBeVisible()
})

for (const viewport of [
  { width: 320, height: 700 },
  { width: 720, height: 450 }
]) {
  test(`changed pages fit ${viewport.width} px at 200% text in forced colours`, async ({
    page
  }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ forcedColors: "active" })
    const subscriptions = await (await fetch(`${demo.base}/api/subscriptions`)).json()
    const subscriptionId = subscriptions.find((s: { title: string }) => s.title === "Slow Build").id
    for (const route of [
      `library/${subscriptionId}`,
      "views",
      "library",
      "playlists",
      "playlists/trash",
      "playlists/default",
      "playlists/default?tab=history",
      "playlists/default?tab=timeline"
    ]) {
      await page.goto(`${demo.base}/${route}`)
      await expect(page.locator("main h1")).toBeVisible()
      await page.addStyleTag({ content: "html { font-size: 200% !important }" })
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true)
      if (route.endsWith("timeline")) {
        const rewind = page.getByRole("button", { name: /^Rewind to here:/ }).first()
        await rewind.focus()
        await expect(rewind).toHaveCSS("opacity", "1")
        await expect(rewind).toBeInViewport()
      }
    }
  })
}

test("touch shows Rewind without hover", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 }
  })
  const page = await context.newPage()
  await page.goto(`${demo.base}/playlists/default?tab=timeline`)
  await expect(page.getByRole("button", { name: /^Rewind to here:/ }).first()).toHaveCSS(
    "opacity",
    "1"
  )
  await context.close()
})
