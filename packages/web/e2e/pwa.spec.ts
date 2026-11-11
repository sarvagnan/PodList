import { expect, test } from "@playwright/test"

test("web retires installation and loads SQLite only for legacy recovery", async ({
  page,
  request
}) => {
  const loaded: string[] = []
  page.on("request", (request) => loaded.push(request.url()))
  await page.goto("/")
  await expect(page.getByRole("navigation").first()).toBeVisible()
  expect(loaded.some((url) => /LocalDb-|localDbWorker|\.wasm(?:$|\?)/.test(url))).toBe(false)
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0)
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
  ).toBe(0)
  const html = await (await request.get("/")).text()
  const script = html.match(/src="([^"]+\.js)"/u)?.[1]
  expect(script).toBeTruthy()
  const bundle = await (await request.get(script ?? "")).text()
  expect(bundle).not.toMatch(/wa-sqlite|opfs-sahpool|sqlite3\.wasm|podlist:tab-lock/)
  const retirement = await request.get("/sw.js")
  expect(retirement.ok()).toBe(true)
  const worker = await retirement.text()
  expect(worker).toContain("clients.claim")
  expect(worker).not.toMatch(/registration\.unregister|caches\.delete|client\.navigate/)
  expect(worker).not.toContain("self.skipWaiting(")
})

test("a returning browser unregisters its worker and clears old app caches", async ({ page }) => {
  await page.goto("/")
  // Finish this page's own startup cleanup before seeding the previous version.
  await expect(page.getByRole("navigation").first()).toBeVisible()
  await page.evaluate(async () => {
    await caches.open("workbox-precache-v2-old")
    await caches.open("artwork")
    await navigator.serviceWorker.register("/sw.js")
    await navigator.serviceWorker.ready
  })
  // Activation must leave caches and live old pages alone. Retirement belongs
  // to the next new page, after its legacy data has been acknowledged.
  expect(await page.evaluate(() => caches.keys())).toContain("workbox-precache-v2-old")
  await page.reload()
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
    )
    .toBe(0)
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual([])
})

test("a retirement worker waits for controlled old pages to close before activating", async ({
  page
}) => {
  await page.goto("/")
  await expect(page.getByRole("navigation").first()).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js?previous")
    await navigator.serviceWorker.ready
    await caches.open("workbox-precache-live-old-page")
  })
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
    .toContain("?previous")
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js?retirement")
  })
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration()
        return {
          active: registration?.active?.scriptURL,
          waiting: registration?.waiting?.scriptURL
        }
      })
    )
    .toEqual({
      active: `${new URL(page.url()).origin}/sw.js?previous`,
      waiting: `${new URL(page.url()).origin}/sw.js?retirement`
    })
  expect(await page.evaluate(() => caches.keys())).toContain("workbox-precache-live-old-page")
})
