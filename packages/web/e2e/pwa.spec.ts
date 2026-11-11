import { expect, test } from "@playwright/test"

test("web retires installation and leaves no SQLite or download bundle", async ({
  page,
  request
}) => {
  await page.goto("/")
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
  expect(await retirement.text()).toContain("registration.unregister")
})

test("a returning browser unregisters its worker and clears old app caches", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(async () => {
    await caches.open("workbox-precache-v2-old")
    await caches.open("artwork")
    await navigator.serviceWorker.register("/sw.js")
  })
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
    )
    .toBe(0)
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual([])
})
