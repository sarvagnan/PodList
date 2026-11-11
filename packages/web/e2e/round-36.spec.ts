import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async ({ page }) => {
  demo = await startDemo()
  await page.setViewportSize({ width: 1440, height: 900 })
})
test.afterEach(() => demo.stop())

for (const kind of ["playlist", "view", "add", "podcasts"] as const) {
  test(`${kind} refuses draft writes visibly, warns only while unsaved and retries (DATA-01, WDATA-02)`, async ({
    page
  }) => {
    await page.goto(
      `${demo.base}/${kind === "view" ? "search?q=market" : kind === "podcasts" ? "library" : "views/new-this-week"}`
    )
    if (kind === "add") {
      await page
        .locator('main [data-row="0"]')
        .getByRole("button", { name: "Add to a Playlist…", exact: true })
        .click()
      await page.getByRole("radio", { name: "New Playlist…" }).check()
    } else {
      await page
        .getByRole("button", {
          name:
            kind === "playlist"
              ? "New Playlist"
              : kind === "view"
                ? "Save as View"
                : "Add podcasts",
          exact: true
        })
        .first()
        .click()
    }
    const dialog = page.getByRole("dialog")
    const field = dialog.getByRole(kind === "podcasts" ? "searchbox" : "textbox", {
      name: kind === "podcasts" ? "Podcast name" : "Name",
      exact: true
    })
    await field.fill("Stored draft")
    const stored = await page.evaluate(() => localStorage.getItem("podlist:dialog-draft"))
    await page.evaluate(() => {
      const set = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (key === "podlist:dialog-draft") throw new DOMException("Full", "QuotaExceededError")
        return set.call(this, key, value)
      }
      Object.assign(window, {
        restoreDraftWrites: () => {
          Storage.prototype.setItem = set
        }
      })
    })
    await field.fill("Unsaved draft")
    await expect(
      dialog.getByRole("status").filter({ hasText: "This draft couldn’t be saved on this Device" })
    ).toHaveText(/This draft couldn’t be saved on this Device/)
    expect(await page.evaluate(() => localStorage.getItem("podlist:dialog-draft"))).toBe(stored)
    expect(
      await page.evaluate(() =>
        window.dispatchEvent(new Event("beforeunload", { cancelable: true }))
      )
    ).toBe(false)
    await dialog.getByRole("button", { name: "Try again", exact: true }).click()
    await expect(
      dialog.getByRole("status").filter({ hasText: "This draft couldn’t be saved on this Device" })
    ).toBeVisible()
    await expect(field).toHaveValue("Unsaved draft")
    if (kind === "playlist") await page.setViewportSize({ width: 320, height: 700 })
    await page.emulateMedia({ forcedColors: "active" })
    await page.addStyleTag({ content: "html { font-size: 32px !important }" })
    const retry = dialog.getByRole("button", { name: "Try again", exact: true })
    // Move focus anew after resizing; focusing an already focused node does not scroll.
    await field.focus()
    await retry.focus()
    await expect(retry).toBeFocused()
    await expect(retry).toBeInViewport()
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    if (kind === "playlist") await page.screenshot({ path: "/tmp/pod-483-draft-320.png" })
    await page.evaluate(() =>
      (window as unknown as { restoreDraftWrites: () => void }).restoreDraftWrites()
    )
    await retry.click()
    await expect(
      dialog.getByRole("status").filter({ hasText: "This draft couldn’t be saved on this Device" })
    ).toHaveCount(0)
    expect(
      await page.evaluate(() =>
        window.dispatchEvent(new Event("beforeunload", { cancelable: true }))
      )
    ).toBe(true)
    await page.reload()
    await expect(field).toHaveValue("Unsaved draft")
  })
}

test("a real reload asks before losing an unsaved draft (DATA-01)", async ({ page }) => {
  await page.goto(`${demo.base}/playlists`)
  await page.getByRole("button", { name: "New Playlist", exact: true }).first().click()
  await page.evaluate(() => {
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === "podlist:dialog-draft") throw new DOMException("Denied", "SecurityError")
      set.call(this, key, value)
    }
  })
  const field = page.getByRole("textbox", { name: "Name", exact: true })
  await field.fill("Keep this work")
  const warning = page.waitForEvent("dialog")
  await page.evaluate(() => {
    setTimeout(() => location.reload(), 0)
  })
  const prompt = await warning
  expect(prompt.type()).toBe("beforeunload")
  await prompt.dismiss()
  await expect(field).toHaveValue("Keep this work")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
})

for (const narrowed of [false, true]) {
  test(`phone Search remembers open and closed Refine, narrowed=${narrowed} (DATA-06)`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 412, height: 915 })
    await page.goto(`${demo.base}/search${narrowed ? "?played=unplayed" : ""}`)
    const refine = page.getByRole("button", { name: /^Refine/ })
    await expect(refine).toHaveAttribute("aria-expanded", String(narrowed))
    for (const open of [!narrowed, narrowed]) {
      await refine.click()
      await page.reload()
      await expect(refine).toHaveAttribute("aria-expanded", String(open))
    }
  })
}

for (const route of ["views/new-this-week", "search?q=the"]) {
  test(`Copy includes every ticked Episode on ${route} (EDIT-02)`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await page.goto(`${demo.base}/${route}`)
    const rows = page.locator("main [data-row]")
    await expect(rows.nth(2)).toBeVisible()
    const links = await rows
      .locator('[data-cell="title"]')
      .evaluateAll((els) => els.slice(0, 3).map((el) => (el as HTMLAnchorElement).href))
    for (let i = 0; i < 3; i++) await rows.nth(i).getByRole("checkbox").check()
    await rows.first().locator('[data-cell="title"]').focus()
    await page.keyboard.press("ControlOrMeta+c")
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(links.join("\n"))
    // A real text selection retains ordinary Copy semantics.
    await rows
      .first()
      .locator('[data-cell="title"]')
      .evaluate((el) => {
        const selection = getSelection()
        const range = document.createRange()
        range.selectNodeContents(el)
        selection?.removeAllRanges()
        selection?.addRange(range)
      })
    await page.keyboard.press("ControlOrMeta+c")
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(await rows.first().locator('[data-cell="title"]').textContent())
  })
}

for (const key of ["Delete", "Backspace"]) {
  for (const drawer of [false, true]) {
    test(`${key} removes a focused ${drawer ? "Up next" : "Playlist"} Entry with Undo and focus (EDIT-02)`, async ({
      page
    }) => {
      await page.goto(`${demo.base}/playlists/default`)
      if (drawer) await page.getByRole("button", { name: /^Open Now Playing/ }).click()
      const scope = drawer ? page.getByRole("dialog") : page.locator("main")
      const rows = scope.locator("[data-row]")
      await expect(rows.first()).toBeVisible()
      const before = await rows.count()
      const first = rows.first().locator('[data-cell="title"]')
      const id = await first.getAttribute("data-episode-title")
      await first.focus()
      await page.keyboard.press(key)
      await expect(rows).toHaveCount(before - 1)
      await expect(rows.first().locator('[data-cell="title"]')).toBeFocused()
      await page.getByRole("button", { name: "Undo", exact: true }).click()
      await expect(rows).toHaveCount(before)
      await expect(scope.locator(`[data-episode-title="${id}"]`)).toBeFocused()
    })
  }
}

test("drawer background accepts Space while controls keep their own action; reference lists Entry keys (KEY-08, WCOPY-01)", async ({
  page
}) => {
  await page.goto(`${demo.base}/playlists/default`)
  await page.getByRole("button", { name: /^Open Now Playing/ }).click()
  const dialog = page.getByRole("dialog")
  await dialog.focus()
  await page.keyboard.press("Space")
  await expect(dialog.getByRole("button", { name: "Pause", exact: true })).toBeVisible()
  await page.keyboard.press("Space")
  await expect(dialog.getByRole("button", { name: "Play", exact: true })).toBeVisible()
  await dialog.getByRole("button", { name: "Play", exact: true }).focus()
  await page.keyboard.press("Space")
  await expect(dialog.getByRole("button", { name: "Pause", exact: true })).toBeFocused()
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
  await page.keyboard.press("ControlOrMeta+/")
  await expect(
    page.getByRole("heading", { name: "In a Playlist or Up next", exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("Play or pause, including in Now Playing", { exact: true })
  ).toBeVisible()
  await page.emulateMedia({ forcedColors: "active" })
  await page.addStyleTag({ content: "html { font-size: 32px !important }" })
  expect(
    await page
      .getByRole("dialog", { name: "Keyboard shortcuts", exact: true })
      .evaluate((el) => el.scrollWidth <= el.clientWidth)
  ).toBe(true)
})

test("idle Search has no blank action band and checkboxes keep their centre and size (craft)", async ({
  page
}) => {
  await page.goto(`${demo.base}/search`)
  const heading = await page.getByRole("heading", { name: "Search", exact: true }).boundingBox()
  const field = await page
    .getByRole("searchbox", { name: "Search the Library", exact: true })
    .boundingBox()
  expect((field?.y ?? 0) - (heading?.y ?? 0) - (heading?.height ?? 0)).toBeLessThan(35)
  await page.goto(`${demo.base}/library`)
  const box = page.getByRole("checkbox", { name: "Select Deep Field", exact: true })
  const bounds = await box.boundingBox()
  const row = await box.locator("xpath=../..").boundingBox()
  expect(
    Math.abs((bounds?.y ?? 0) + (bounds?.height ?? 0) / 2 - (row?.y ?? 0) - (row?.height ?? 0) / 2)
  ).toBeLessThanOrEqual(1)
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto(`${demo.base}/playlists/commute/settings`)
  const clear = page.getByRole("checkbox", { name: /Clear on Played/ })
  expect(
    await clear.evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height
    }))
  ).toEqual({ width: 16, height: 16 })
  await page.emulateMedia({ forcedColors: "active" })
  await page.addStyleTag({ content: "html { font-size: 32px !important }" })
  await clear.focus()
  await expect(clear).toBeFocused()
  expect(
    await clear.evaluate(
      (el) => el.getBoundingClientRect().width === el.getBoundingClientRect().height
    )
  ).toBe(true)
})

test("known offline disables new edits", async ({ page, context }) => {
  await page.goto(`${demo.base}/playlists/commute`)
  const remove = page.getByRole("button", { name: /^Remove .* from Commute$/ }).first()
  await expect(remove).toBeEnabled()
  await context.setOffline(true)
  await expect(remove).toBeDisabled()
  await expect(page.getByRole("status").filter({ hasText: "Offline" }).first()).toContainText(
    "New edits need a connection"
  )
  await context.setOffline(false)
  await expect(remove).toBeEnabled()
})

for (const width of [412, 1440]) {
  test(`stats consolidate equal periods, label the scale and remember both disclosures at ${width} (DATA-06, LIST-05, craft)`, async ({
    page,
    request
  }) => {
    const now = Date.now()
    await request.post(`${demo.base}/api/devices`, {
      data: { id: "r36-stats", name: "Stats", kind: "pwa", registeredAt: now }
    })
    await request.post(`${demo.base}/api/sync/push`, {
      data: {
        operations: [
          {
            id: "r36-log",
            deviceId: "r36-stats",
            sequence: 0,
            recordedAt: now,
            change: {
              _tag: "ReportPosition",
              playlistId: "default",
              episodeId: "missing",
              position: 10,
              listenedAt: now,
              listening: [
                {
                  day: new Date(now).toLocaleDateString("en-CA"),
                  subscriptionId: "r36-podcast",
                  seconds: 10
                }
              ]
            }
          }
        ]
      }
    })
    await page.setViewportSize({ width, height: 915 })
    await page.goto(`${demo.base}/listening-stats`)
    const periods = page.locator('[aria-labelledby="stats-periods"]')
    await expect(periods.getByText("Less than 1 min", { exact: true })).toHaveCount(1)
    await expect(periods).toContainText("This week, this month and all time")
    await expect(
      page.getByText("Minutes listened · scale: 0–1.0 min", { exact: true })
    ).toBeVisible()
    const bars = page.locator('[aria-labelledby="stats-days"] .bg-primary')
    expect(
      await bars.evaluateAll((els) =>
        els.every((el) => getComputedStyle(el).borderTopWidth === "0px")
      )
    ).toBe(true)
    for (const label of ["Daily listening table", "About your stats"]) {
      await page.getByText(label, { exact: true }).click()
    }
    await page.reload()
    for (const label of ["Daily listening table", "About your stats"]) {
      const summary = page.getByText(label, { exact: true })
      await expect(summary.locator("..")).toHaveAttribute("open", "")
      await summary.click()
    }
    await page.reload()
    for (const label of ["Daily listening table", "About your stats"]) {
      await expect(page.getByText(label, { exact: true }).locator("..")).not.toHaveAttribute("open")
    }
    await page.emulateMedia({ forcedColors: "active" })
    await page.addStyleTag({ content: "html { font-size: 32px !important }" })
    const summary = page.getByText("Daily listening table", { exact: true })
    await summary.focus()
    await expect(summary).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("table")).toBeVisible()
    expect(await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(
      await bars.evaluateAll((els) =>
        els.some((el) => getComputedStyle(el).borderTopWidth === "1px")
      )
    ).toBe(true)
    expect(
      await bars.evaluateAll((els) =>
        els
          .filter((el) => (el as HTMLElement).style.height === "0%")
          .every((el) => getComputedStyle(el).borderTopWidth === "0px")
      )
    ).toBe(true)
    await page.screenshot({ path: `/tmp/pod-483-stats-${width}.png`, fullPage: true })
  })
}
