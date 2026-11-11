import { expect, type Page, test } from "@playwright/test"
// @ts-expect-error: shared demo helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())
const open = async (page: Page) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/views/short`)
  await expect(page.getByRole("row").first()).toBeVisible()
  await expect(
    page.getByRole("row").first().getByRole("button", { name: "Star", exact: true })
  ).toBeEnabled()
}
const star = (page: Page) =>
  page.getByRole("row").first().getByRole("button", { name: "Star", exact: true })
const serverEdit = async (name: string) => {
  const result = await fetch(`${demo.base}/api/sync/push`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operations: [
        {
          id: crypto.randomUUID(),
          deviceId: "other",
          sequence: 0,
          recordedAt: Date.now(),
          change: { _tag: "RenamePlaylist", playlistId: "commute", name }
        }
      ]
    })
  })
  expect(result.ok).toBe(true)
}

test("WebSocket notifications refresh another tab without reload", async ({ page, context }) => {
  const sockets: string[] = []
  page.on("websocket", (socket) => sockets.push(socket.url()))
  await open(page)
  const second = await context.newPage()
  await open(second)
  await star(page).click()
  await expect(
    second.getByRole("row").first().getByRole("button", { name: "Star", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  expect(sockets.some((url) => url.includes("/api/live?"))).toBe(true)
})

test("tabs share one web Device and never reuse an Operation sequence", async ({
  page,
  context
}) => {
  const devices: Array<{ id: string; kind: string }> = []
  const operations = new Map<string, { deviceId: string; sequence: number }>()
  context.on("request", (request) => {
    if (request.method() !== "POST") return
    if (request.url().endsWith("/api/devices")) devices.push(request.postDataJSON())
    if (request.url().endsWith("/api/sync/push")) {
      for (const operation of request.postDataJSON().operations)
        operations.set(operation.id, operation)
    }
  })
  const second = await context.newPage()
  await Promise.all([open(page), open(second)])
  await Promise.all([star(page).click(), star(second).click()])
  await expect.poll(() => operations.size).toBeGreaterThanOrEqual(2)
  await page.reload()
  await expect(page.getByRole("row").first()).toBeVisible()
  await expect.poll(() => devices.length).toBeGreaterThanOrEqual(3)
  expect(new Set(devices.map((device) => device.id)).size).toBe(1)
  expect(devices.every((device) => device.kind === "web")).toBe(true)
  expect(new Set([...operations.values()].map((operation) => operation.deviceId)).size).toBe(1)
  expect(new Set([...operations.values()].map((operation) => operation.sequence)).size).toBe(
    operations.size
  )
})

test("failed edits stay optimistic, Retry keeps ids, and tab closure drops unsent work", async ({
  page
}) => {
  const submitted: string[] = []
  await open(page)
  await page.route("**/api/sync/push", (route) => {
    submitted.push(route.request().postDataJSON().operations[0].id)
    return route.abort()
  })
  await star(page).click()
  await expect(
    page.getByRole("row").first().getByRole("button", { name: "Star", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  const pending = page.getByRole("status").filter({ hasText: "pending in this tab" }).first()
  await expect(pending).toContainText("Closing it drops unsent changes")
  await expect(
    page.getByRole("row").first().getByRole("button", { name: "Star", exact: true })
  ).toBeDisabled()
  expect(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    })
  ).toBe(true)
  const failedRetry = page.waitForEvent("requestfailed", (request) =>
    request.url().endsWith("/api/sync/push")
  )
  await pending.getByRole("button", { name: "Retry" }).click()
  await failedRetry
  await expect.poll(() => submitted.length).toBeGreaterThanOrEqual(2)
  expect(new Set(submitted).size).toBe(1)
  await page.unroute("**/api/sync/push")
  await page.evaluate(() => window.dispatchEvent(new Event("online")))
  await expect(pending).toBeHidden()
  await page.reload()
  await expect(
    page.getByRole("row").first().getByRole("button", { name: "Star", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  // This second edit never reaches the server and does not survive reload.
  await page.route("**/api/sync/push", (route) => route.abort())
  await page.getByRole("row").first().getByRole("button", { name: "Star", exact: true }).click()
  await expect(pending).toBeVisible()
  page.once("dialog", (dialog) => dialog.accept())
  await page.reload()
  await expect(
    page.getByRole("row").first().getByRole("button", { name: "Star", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(pending).toBeHidden()
  expect(await page.evaluate(() => localStorage.getItem("podlist:journal"))).toBeNull()
})

test("a lost push response retries the same committed edit exactly once", async ({ page }) => {
  await open(page)
  const baseline = await (await fetch(`${demo.base}/api/sync/pull?since=0`)).json()
  let lost = true
  await page.route("**/api/sync/push", async (route) => {
    if (lost) {
      await route.fetch()
      await route.abort()
    } else await route.continue()
  })
  await star(page).click()
  const pending = page.getByRole("status").filter({ hasText: "pending in this tab" }).first()
  await expect(pending).toBeVisible()
  lost = false
  await pending.getByRole("button", { name: "Retry" }).click()
  await expect(pending).toBeHidden()
  const pulled = await (await fetch(`${demo.base}/api/sync/pull?since=${baseline.cursor}`)).json()
  const stars = pulled.operations.filter(
    (operation: { change: { _tag: string } }) => operation.change._tag === "SetStar"
  )
  expect(stars).toHaveLength(1)
})

test("polling catches native edits when WebSockets cannot connect", async ({ page }) => {
  await page.routeWebSocket("**/api/live?*", (socket) => socket.close())
  await open(page)
  await serverEdit("From polling")
  await expect(
    page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: /^From polling/ })
  ).toBeVisible({ timeout: 15_000 })
})

test("a reconnect catches missed cursors and tab return refreshes State", async ({
  page,
  context
}) => {
  await open(page)
  await context.setOffline(true)
  await serverEdit("While disconnected")
  await context.setOffline(false)
  await expect(page.getByRole("link", { name: /^While disconnected/ })).toBeVisible({
    timeout: 20_000
  })
  await serverEdit("On return")
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")))
  await expect(page.getByRole("link", { name: /^On return/ })).toBeVisible()
})

test("Play in one browser tab pauses its peer", async ({ page, context }) => {
  await page.goto(`${demo.base}/playlists/default`)
  const second = await context.newPage()
  await second.goto(`${demo.base}/playlists/default`)
  const play = (tab: Page) =>
    tab.getByRole("button", { name: "Play Joinery without screws from here" })
  const player = (tab: Page) => tab.getByRole("region", { name: "Now playing" })
  await play(page).click()
  await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible()
  await play(second).click()
  await expect(player(second).getByRole("button", { name: "Pause", exact: true })).toBeVisible()
  await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible()
})
