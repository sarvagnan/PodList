import { expect, test } from "@playwright/test"
// @ts-expect-error: shared demo server fixture
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async ({ page }) => {
  demo = await startDemo()
  await page.setViewportSize({ width: 1600, height: 1000 })
})
test.afterEach(async ({ page }) => {
  // Drain HTTP mock callbacks before Playwright disposes their request responses.
  await page.unrouteAll({ behavior: "wait" })
  demo?.stop()
})

test("measure selection request and panel render", async ({ page }, testInfo) => {
  const delay = Number(process.env.PANEL_DELAY_MS ?? 0)
  if (delay)
    await page.route("**/api/reads/episodes/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delay))
      await route.continue()
    })
  const samples = []
  for (let i = 0; i < 5; i++) {
    await page.goto(`${demo.base}/views/new-this-week`)
    const title = page.locator('[data-row="0"] [data-cell="title"]')
    await expect(title).toBeVisible()
    const renderMs = await title.evaluate(
      (link) =>
        new Promise<number>((resolve) => {
          const title = link.textContent
          const start = performance.now()
          const observer = new MutationObserver(() => {
            if (document.querySelector('aside[aria-label="Episode"] h2')?.textContent !== title)
              return
            observer.disconnect()
            requestAnimationFrame(() => resolve(performance.now() - start))
          })
          observer.observe(document.querySelector("main") ?? document.body, {
            childList: true,
            subtree: true
          })
          ;(link as HTMLElement).click()
        })
    )
    await expect(page.getByRole("complementary", { name: "Episode", exact: true })).toContainText(
      "Show notes"
    )
    const requests = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((entry) => /\/api\/(reads\/episodes\/|.*chapters)/.test(entry.name))
        .map((entry) => ({ path: new URL(entry.name).pathname, durationMs: entry.duration }))
    )
    samples.push({ renderMs, requests })
  }
  console.log("Selection timing:", JSON.stringify(samples))
  await testInfo.attach("selection-timing", {
    body: JSON.stringify(samples, null, 2),
    contentType: "application/json"
  })
})

test("shows row facts while the detail response is held", async ({ page }) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/reads/episodes/*", async (route) => {
    await held
    await route.continue()
  })
  try {
    await page.goto(`${demo.base}/views/new-this-week`)
    const title = page.locator('[data-row="0"] [data-cell="title"]')
    await expect(title).toBeVisible()
    const name = (await title.textContent()) ?? ""
    const facts = (await title.locator("..").locator("p").textContent()) ?? ""
    await title.click()
    const panel = page.getByRole("complementary", { name: "Episode", exact: true })
    await expect(panel.getByRole("heading", { name, exact: true })).toBeVisible({
      timeout: 500
    })
    for (const fact of facts.split(" · ")) await expect(panel).toContainText(fact.trim())
    await expect(panel.locator("img")).toBeVisible()
    await expect(panel.getByRole("status")).toHaveText("Loading Episode details…")
    await expect(panel.getByRole("heading", { name: "Show notes", exact: true })).toHaveCount(0)
    // Moving the open selection cannot leave facts from the previous Episode behind.
    const second = page.locator('[data-row="1"] [data-cell="title"]')
    await second.click()
    await expect(
      panel.getByRole("heading", { name: (await second.textContent()) ?? "", exact: true })
    ).toBeVisible({ timeout: 500 })
    await expect(panel.getByRole("heading", { name, exact: true })).toHaveCount(0)
    release()
    await expect(panel.getByRole("heading", { name: "Show notes", exact: true })).toBeVisible()
    await expect(panel.getByRole("status")).toHaveCount(0)
  } finally {
    release()
  }
})

test("show note links open safely by mouse and keyboard", async ({ page }) => {
  await page.route("**/api/reads/episodes/*", async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        description:
          '<p>Read <a href="https://notes.example.test/episode" onclick="alert(1)">Episode website</a>. <a href="jav&#x61;script:alert(2)">Unsafe</a></p><script>alert(3)</script>'
      }
    })
  })
  await page
    .context()
    .route("https://notes.example.test/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "Episode website" })
    )
  await page.goto(`${demo.base}/views/new-this-week`)
  await page.locator('[data-row="0"] [data-cell="title"]').click()
  const panel = page.getByRole("complementary", { name: "Episode", exact: true })
  const link = panel.getByRole("link", { name: "Episode website" })
  await expect(link).toHaveAttribute("target", "_blank")
  await expect(link).toHaveAttribute("rel", "noopener noreferrer")
  await expect(panel.getByRole("link", { name: "Unsafe" })).toHaveCount(0)
  for (const keyboard of [false, true]) {
    if (keyboard) {
      await link.focus()
      await expect(link).toBeFocused()
    }
    const popup = page.waitForEvent("popup")
    if (keyboard) await page.keyboard.press("Enter")
    else await link.click()
    const opened = await popup
    await expect(opened).toHaveURL("https://notes.example.test/episode")
    await opened.close()
  }
})

test("selection tint has clear dividers and spacing without shifting row content", async ({
  page
}) => {
  await page.goto(`${demo.base}/views/short`)
  const row = page.locator('[data-row="1"]')
  const title = row.locator('[data-cell="title"]')
  await expect(title).toBeVisible()
  const geometry = () =>
    row.evaluate((el) => {
      const rect = (selector: string) => {
        const r = el.querySelector(selector)?.getBoundingClientRect()
        return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
      }
      return {
        title: rect('[data-cell="title"]'),
        checkbox: rect('input[type="checkbox"]'),
        artwork: rect("img")
      }
    })
  for (const forcedColors of ["none", "active"] as const) {
    await page.emulateMedia({ forcedColors })
    const before = await geometry()
    await title.click()
    await expect(row).toHaveAttribute("aria-current", "true")
    expect(await geometry()).toEqual(before)
    const style = await row.locator(".episode-row").evaluate((el) => {
      const selected = el.getBoundingClientRect()
      const grid = el.closest('[role="grid"]')?.getBoundingClientRect()
      const box = el.querySelector('input[type="checkbox"]')?.getBoundingClientRect()
      const bar = getComputedStyle(el, "::before")
      return {
        gap:
          (box?.left ?? 0) -
          selected.left -
          Number.parseFloat(bar.left) -
          Number.parseFloat(bar.width),
        radius: getComputedStyle(el).borderTopLeftRadius,
        inset: selected.left - (grid?.left ?? 0),
        border: getComputedStyle(el).borderBottomColor
      }
    })
    expect(style.gap).toBeGreaterThanOrEqual(8)
    expect(style.radius).toBe("12px")
    expect(style.inset).toBeGreaterThan(0)
    if (forcedColors === "none") {
      expect(style.border).toBe("rgba(0, 0, 0, 0)")
      await expect(page.locator('[data-row="0"] .episode-row')).toHaveCSS(
        "border-bottom-color",
        "rgba(0, 0, 0, 0)"
      )
    }
    await page.getByRole("button", { name: "Close Episode" }).click()
    expect(await geometry()).toEqual(before)
  }
})

test("panel starts beside the heading and stays still while the list scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 600 })
  await page.route("**/api/reads/episodes/*", async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      json: { ...(await response.json()), description: "<p>Long show notes.</p>".repeat(100) }
    })
  })
  await page.goto(`${demo.base}/views/short`)
  await page.locator('[data-row="0"] [data-cell="title"]').click()
  const panel = page.getByRole("complementary", { name: "Episode", exact: true })
  await expect(panel.getByRole("heading", { level: 2 })).toBeVisible()
  const before = await panel.boundingBox()
  expect(before?.y).toBe(0)
  await page.evaluate(() => window.scrollTo(0, 400))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
  expect(await panel.boundingBox()).toEqual(before)
  const listScroll = await page.evaluate(() => window.scrollY)
  await expect(panel.getByRole("heading", { name: "Show notes", exact: true })).toHaveCount(1)
  await panel.evaluate((el) => {
    el.scrollTop = 200
  })
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBe(200)
  expect(await page.evaluate(() => window.scrollY)).toBe(listScroll)
})

test("an open Episode becomes a reachable sheet at narrow widths", async ({ page }) => {
  await page.goto(`${demo.base}/views/short`)
  await page.locator('[data-row="0"] [data-cell="title"]').click()
  for (const width of [720, 390]) {
    await page.setViewportSize({ width, height: 700 })
    const sheet = page.getByRole("dialog", { name: "Episode", exact: true })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("button", { name: "Close Episode" })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Episode", exact: true })).toHaveCount(0)
  await expect(page).not.toHaveURL(/episode=/)
})

test("hover and keyboard focus share prefetched detail with selection", async ({ page }) => {
  // Stabilise live cursors before counting: the initial catch-up legitimately
  // invalidates catalogue reads and is independent of prefetch reuse.
  const cursors = await (await fetch(`${demo.base}/api/live/cursors`)).json()
  await page.routeWebSocket("**/api/live?**", (socket) => {
    socket.send(JSON.stringify({ ...cursors, reset: false }))
  })
  await page.goto(`${demo.base}/views/short`)
  for (const [index, focus] of [
    [0, false],
    [1, true]
  ] as const) {
    const title = page.locator(`[data-row="${index}"] [data-cell="title"]`)
    const id = await title.getAttribute("data-episode-title")
    const path = `/api/reads/episodes/${id}`
    let requests = 0
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === path) requests++
    })
    const response = page.waitForResponse((response) => new URL(response.url()).pathname === path)
    if (focus) await title.focus()
    else await title.hover()
    await response
    // Wait beyond the registry's default 400 ms idle cleanup; prefetch has a short TTL.
    await page.waitForTimeout(600)
    await title.press("Enter")
    await expect(page.getByRole("complementary", { name: "Episode", exact: true })).toContainText(
      "Show notes"
    )
    expect(requests).toBe(1)
    await page.getByRole("button", { name: "Close Episode" }).click()
  }
})

test("row actions use named Next and Last icons in Views, Search and Podcast pages", async ({
  page
}) => {
  for (const path of ["/views/short", "/search?q=market", "/library"]) {
    // A wide window gives the Podcast page's Episode column room for individual actions.
    await page.setViewportSize({ width: 2400, height: 1000 })
    await page.goto(demo.base + path)
    if (path === "/library")
      await page.getByRole("link", { name: "Market Hours", exact: true }).click()
    const row = page.locator('[data-row="0"]')
    await row.hover()
    for (const name of ["Play Next", "Play Last"]) {
      const button = row.getByRole("button", { name, exact: true })
      // The Podcast page uses its narrower More menu when its reading column is small.
      if (!(await button.isVisible())) {
        await row.getByRole("button", { name: /^More actions for/ }).click()
        await expect(page.getByRole("menuitem", { name: new RegExp(`^${name} in`) })).toBeVisible()
        await page.keyboard.press("Escape")
      } else {
        await expect(button.locator("svg")).toBeVisible()
        await expect(button).toHaveText("")
        await button.hover()
        await expect(page.getByRole("tooltip")).toHaveText(name)
      }
    }
  }
})
