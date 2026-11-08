import { writeFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

test.use({ trace: "off" })

// Input-to-next-paint timings exclude Playwright's locator/actionability waits.
async function timedClick(page: Page, selector: string, until?: string) {
  const target = page.locator(selector).filter({ visible: true })
  await target.evaluate((element, until) => {
    element.addEventListener(
      "click",
      () => {
        const start = performance.now()
        ;(window as unknown as { measured: Promise<number> }).measured = new Promise((resolve) => {
          const finish = () => {
            if (until && !document.querySelector(until)) return requestAnimationFrame(finish)
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve(Math.round(performance.now() - start)))
            )
          }
          requestAnimationFrame(finish)
        })
      },
      { once: true }
    )
  }, until)
  await target.click()
  return page.evaluate(() => (window as unknown as { measured: Promise<number> }).measured)
}

async function timedInput(
  page: Page,
  event: "keydown" | "pointerup",
  action: () => Promise<void>,
  until: string
) {
  await page.evaluate(
    ({ event, until }) => {
      window.addEventListener(
        event,
        () => {
          const start = performance.now()
          ;(window as unknown as { measured: Promise<number> }).measured = new Promise(
            (resolve) => {
              const finish = () => {
                if (!document.querySelector(until)) return requestAnimationFrame(finish)
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve(Math.round(performance.now() - start)))
                )
              }
              requestAnimationFrame(finish)
            }
          )
        },
        { capture: true, once: true }
      )
    },
    { event, until }
  )
  await action()
  return page.evaluate(() => (window as unknown as { measured: Promise<number> }).measured)
}

for (const width of [1440, 412]) {
  test(`500 Entries at ${width}px, 4× CPU`, async ({ page, context }) => {
    test.setTimeout(120_000)
    const demo = await startDemo({ large: true })
    try {
      page.on("pageerror", (error) => console.log("PAGE ERROR", error.message))
      page.on("console", (message) => {
        if (message.type() === "error") console.log("CONSOLE", message.text())
      })
      await page.setViewportSize({ width, height: 900 })
      const cdp = await context.newCDPSession(page)
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
      await page.goto(`${demo.base}/playlists/large`)
      await expect(page.getByRole("heading", { name: "Long listening", exact: true })).toBeVisible()
      await expect(page.locator('main [data-row="0"]')).toContainText("Long Episode 001", {
        timeout: 30000
      })
      await page.goto(`${demo.base}/playlists`)
      await expect(page.locator('main a[href="/playlists/large"]')).toBeVisible()
      if (process.env.PODLIST_PROFILE) {
        await cdp.send("Profiler.enable")
        await cdp.send("Profiler.start")
      }
      const open = await timedClick(
        page,
        'main a[href="/playlists/large"]',
        'main [data-row="0"] [data-cell="title"]'
      )
      if (process.env.PODLIST_PROFILE) {
        const { profile } = await cdp.send("Profiler.stop")
        writeFileSync(`/tmp/podlist-open-${width}.cpuprofile`, JSON.stringify(profile))
      }
      await expect(page.locator('main [data-row="0"]')).toContainText("Long Episode 001", {
        timeout: 30000
      })
      const scroll = await page.evaluate(async () => {
        const start = performance.now()
        window.scrollTo(0, 18000)
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
        return Math.round(performance.now() - start)
      })
      const scrollFrameP95 = await page.evaluate(async () => {
        const gaps: number[] = []
        let previous = performance.now()
        for (let i = 0; i < 30; i++) {
          window.scrollBy(0, 120)
          const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve))
          gaps.push(now - previous)
          previous = now
        }
        return Math.round(gaps.sort((a, b) => a - b)[28] ?? 0)
      })
      await page.evaluate(() => window.scrollTo(0, 0))
      const first = page.locator('main [data-row="0"]')
      const movedId = await first.locator('[data-cell="title"]').getAttribute("data-episode-title")
      await first.locator('[aria-roledescription="sortable"]').focus()
      await page.keyboard.press("Space")
      await page.waitForTimeout(100)
      await page.keyboard.press("ArrowDown")
      await page.waitForTimeout(400)
      const keyboard = await timedInput(
        page,
        "keydown",
        () => page.keyboard.press("Space"),
        `main [data-row="1"] [data-episode-title="${movedId}"]`
      )
      await expect(page.locator('main [data-row="1"]')).toContainText("Long Episode 001", {
        timeout: 30000
      })
      const handles = page.locator('main [aria-roledescription="sortable"]')
      const a = await handles.nth(0).boundingBox()
      const b = await handles.nth(1).boundingBox()
      if (!a || !b) throw new Error("Missing handles")
      await page.mouse.move(a.x + 20, a.y + 20)
      await page.mouse.down()
      await page.mouse.move(b.x + 20, b.y + 20, { steps: 5 })
      await page.waitForTimeout(400)
      const pointer = await timedInput(
        page,
        "pointerup",
        () => page.mouse.up(),
        `main [data-row="0"] [data-episode-title="${movedId}"]`
      )
      await expect(page.locator('main [data-row="0"]')).toContainText("Long Episode 001", {
        timeout: 30000
      })
      console.log(JSON.stringify({ width, open, scroll, scrollFrameP95, keyboard, pointer }))
      const play = await timedClick(
        page,
        'main [data-row="0"] button[aria-label^="Play "]',
        '[aria-label="Now playing"] button[aria-label="Pause"]'
      )
      await expect(
        page
          .getByRole("region", { name: "Now playing" })
          .getByRole("button", { name: "Pause", exact: true })
      ).toBeVisible({ timeout: 30000 })
      const drawerOpen = await timedClick(
        page,
        'button[aria-label^="Open Now Playing"]',
        '[data-sheet="drawer"]'
      )
      let drawer = drawerOpen
      if (width < 768) {
        const next = page.getByRole("dialog").getByRole("button", { name: /^Up next/ })
        await next.evaluate((element) => element.setAttribute("data-perf-next", ""))
        drawer = await timedClick(
          page,
          "[data-perf-next]",
          '[aria-label="Up next in Long listening"]'
        )
      }
      await expect(page.getByRole("list", { name: "Up next in Long listening" })).toBeVisible()
      console.log(
        JSON.stringify({ width, open, scroll, scrollFrameP95, keyboard, pointer, play, drawer })
      )
    } finally {
      demo.stop()
    }
  })
}
