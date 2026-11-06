import { expect, test } from "@playwright/test"

test("ships an installable manifest with the PodList icons", async ({ page, request }) => {
  await page.goto("/")
  const href = await page.locator('link[rel="manifest"]').getAttribute("href")
  expect(href).toBe("/manifest.webmanifest")
  const manifest = await (await request.get(href ?? "")).json()
  expect(manifest).toMatchObject({ name: "PodList", display: "standalone", start_url: "/" })
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]))
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true)
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok()).toBe(true)

  // Chrome's own installability verdict, ignoring the incognito-only reason test contexts carry.
  const cdp = await page.context().newCDPSession(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors")
  expect(installabilityErrors.filter((e) => e.errorId !== "in-incognito")).toEqual([])
})

test("opens offline from the service worker", async ({ page, context }) => {
  await page.goto("/")
  await page.evaluate(() => navigator.serviceWorker.ready)
  // Reload once so the page is controlled by the now-active service worker.
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole("heading", { name: "PodList" })).toBeVisible()
  await context.setOffline(false)
})
