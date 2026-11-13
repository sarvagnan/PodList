import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async ({ page }) => {
  demo = await startDemo()
  await page.setViewportSize({ width: 1440, height: 900 })
})
test.afterEach(() => demo.stop())

for (const kind of ["playlist", "add", "view", "podcasts"] as const) {
  test(`${kind} typed draft survives a closed tab and clears on Cancel (DATA-01, WDATA-01)`, async ({
    page,
    context
  }) => {
    await page.goto(
      `${demo.base}/${kind === "podcasts" ? "library" : kind === "view" ? "search?q=market" : "views/new-this-week"}`
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
    const field = page
      .getByRole("dialog")
      .getByRole(kind === "podcasts" ? "searchbox" : "textbox", {
        name: kind === "podcasts" ? "Podcast name" : "Name",
        exact: true
      })
    await field.fill("Round 35 draft")
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("podlist:dialog-draft") ?? "null")?.kind
        )
      )
      .toBe(kind)
    await page.close()
    const reopened = await context.newPage()
    await reopened.goto(`${demo.base}/library`)
    const dialog = reopened.getByRole("dialog")
    const restored = dialog.getByRole(kind === "podcasts" ? "searchbox" : "textbox", {
      name: kind === "podcasts" ? "Podcast name" : "Name",
      exact: true
    })
    await expect(restored).toHaveValue("Round 35 draft")
    await expect(restored).toBeFocused()
    await reopened.emulateMedia({ forcedColors: "active" })
    await dialog
      .getByRole("button", {
        name: kind === "podcasts" || kind === "add" ? "Close" : "Cancel",
        exact: true
      })
      .click()
    await expect
      .poll(() => reopened.evaluate(() => localStorage.getItem("podlist:dialog-draft")))
      .toBeNull()
    await reopened.reload()
    await expect(reopened.getByRole("dialog")).toHaveCount(0)
  })
}

for (const viewport of [
  { width: 720, height: 450 },
  { width: 1024, height: 600 },
  { width: 412, height: 915 }
]) {
  test(`200% text keeps navigation and skip glyphs contained at ${viewport.width} (WTYPE-02)`, async ({
    page
  }) => {
    await page.setViewportSize(viewport)
    await page.goto(`${demo.base}/playlists/default`)
    await expect(page.getByRole("region", { name: "Now playing" })).toBeVisible()
    await page.addStyleTag({ content: "html { font-size: 32px !important }" })
    await page.emulateMedia({ forcedColors: "active" })
    if (viewport.width >= 720) {
      const nav = page.getByRole("navigation", { name: "Library and lists" })
      const overlap = await nav.locator(":scope > *").evaluateAll((nodes) =>
        nodes.some((node, i) => {
          const previous = nodes[i - 1]
          return (
            previous &&
            node.getBoundingClientRect().top < previous.getBoundingClientRect().bottom - 1
          )
        })
      )
      expect(overlap).toBe(false)
      const settings = nav.getByRole("link", { name: "Settings", exact: true })
      await settings.focus()
      await expect(settings).toBeInViewport()
    }
    const skip = page
      .getByRole("region", { name: "Now playing" })
      .getByRole("button", { name: "Forward 30 seconds", exact: true })
    await skip.focus()
    await expect(skip).toBeFocused()
    expect(
      await skip.evaluate((button) => {
        const bounds = button.getBoundingClientRect()
        return [...button.querySelectorAll("svg, span")].every((child) => {
          const box = child.getBoundingClientRect()
          return (
            box.left >= bounds.left &&
            box.right <= bounds.right &&
            box.top >= bounds.top &&
            box.bottom <= bounds.bottom
          )
        })
      })
    ).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const input of ["toast", "keyboard"]) {
  test(`${input} Undo can Redo and Undo again (DATA-04)`, async ({ page }) => {
    await page.goto(`${demo.base}/playlists/commute`)
    const rows = page.locator("main [data-row]")
    const title = await rows.first().locator('[data-cell="title"]').textContent()
    const before = await rows.count()
    await page.getByRole("button", { name: `Remove ${title} from Commute`, exact: true }).click()
    await expect(rows).toHaveCount(before - 1)
    // Rows update optimistically; Undo is registered after the server confirms the removal.
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible()
    if (input === "toast") await page.getByRole("button", { name: "Undo", exact: true }).click()
    else {
      await page.locator("main h1").focus()
      await page.keyboard.press("ControlOrMeta+z")
    }
    await expect(rows).toHaveCount(before)
    await expect(page.getByRole("link", { name: title ?? "", exact: true })).toBeFocused()
    await page.keyboard.press("ControlOrMeta+Shift+z")
    await expect(rows).toHaveCount(before - 1)
    await expect(page.getByText(/^Redone: Removed/)).toBeVisible()
    await page.keyboard.press("ControlOrMeta+z")
    await expect(rows).toHaveCount(before)
  })
}

for (const route of ["views/starred?edit=true", "search?q=market"]) {
  test(`${route} retains invalid bounds without saving them (CTRL-04)`, async ({ page }) => {
    await page.goto(`${demo.base}/${route}`)
    const min = page.getByRole("combobox", { name: "At least", exact: true })
    const max = page.getByRole("combobox", { name: "At most", exact: true })
    await min.selectOption("60")
    await max.selectOption("10")
    await expect(max).toHaveValue("10")
    await expect(max).toHaveAttribute("aria-invalid", "true")
    await expect(min).toHaveAccessibleDescription("At most must be 60 minutes or more.")
    await max.focus()
    await page.emulateMedia({ forcedColors: "active" })
    await expect(max).toBeFocused()
    await page.reload()
    await expect(min).toHaveValue("60")
    await expect(max).toHaveValue("")
    await max.selectOption("10")
    await max.selectOption("90")
    await expect(max).toHaveAttribute("aria-invalid", "false")
    await page.reload()
    await expect(max).toHaveValue("90")
    await page.getByRole("combobox", { name: "Published", exact: true }).selectOption("between")
    const from = page.getByLabel("From", { exact: true })
    const to = page.getByLabel("To", { exact: true })
    await from.fill("2026-10-20")
    await to.fill("2026-10-10")
    await expect(to).toHaveValue("2026-10-10")
    await expect(to).toHaveAttribute("aria-invalid", "true")
    await expect(from).toHaveAccessibleDescription("To must be on or after From.")
    await page.reload()
    await expect(from).toHaveValue("2026-10-20")
    await expect(to).toHaveValue("")
    await to.fill("2026-10-20")
    await expect(to).toHaveAttribute("aria-invalid", "false")
    await page.reload()
    await expect(to).toHaveValue("2026-10-20")
  })
}

test("Playlist open Entry and NOW retain distinct marks, including forced colours (SIDE-04)", async ({
  page
}) => {
  await page.goto(`${demo.base}/playlists/default`)
  const rows = page.locator("main [data-row]")
  const title = rows.nth(2).locator('[data-cell="title"]')
  await title.click()
  await expect(rows.nth(2)).toHaveAttribute("aria-selected", "true")
  await expect(rows.nth(2)).toHaveClass(/selected-row/)
  expect(await rows.nth(2).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    await rows.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor)
  )
  await rows.nth(1).locator('[data-cell="title"]').click()
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true")
  await expect(rows.nth(1)).toHaveAttribute("aria-current", "true")
  await page.emulateMedia({ forcedColors: "active" })
  expect(
    await rows.nth(1).evaluate((el) => ({
      border: getComputedStyle(el).borderInlineStartWidth,
      outline: getComputedStyle(el).outlineWidth
    }))
  ).toEqual({ border: "3px", outline: "2px" })
  await page.keyboard.press("Escape")
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "false")
  await expect(rows.nth(1).locator('[data-cell="title"]')).toBeFocused()
})

for (const width of [1440, 720]) {
  for (const route of ["views/new-this-week", "search?q=the"]) {
    test(`bulk toolbar keeps rows still on ${route} at ${width} (APPEAR-11, APPEAR-09)`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${demo.base}/${route}`)
      const checks = page.locator("main [data-row]").getByRole("checkbox")
      await expect(checks.nth(1)).toBeVisible()
      const before = await checks.nth(1).boundingBox()
      await checks.first().check()
      const bar = page.getByRole("toolbar")
      await expect(bar).toBeVisible()
      expect(await checks.nth(1).boundingBox()).toEqual(before)
      await checks.nth(1).check()
      await expect(bar).toHaveAccessibleName("2 Episodes selected")
      expect(await bar.textContent()).toMatch(/^2 selected/)
      await expect(bar.getByRole("button", { name: "New Playlist…" }).locator("svg")).toHaveClass(
        /lucide-list-plus/
      )
      await page.emulateMedia({ forcedColors: "active" })
      const clear = bar.getByRole("button", { name: "Clear selection" })
      await clear.focus()
      await expect(clear).toBeInViewport()
      await page.keyboard.press("Enter")
      await expect(bar).toHaveCount(0)
      expect(await checks.nth(1).boundingBox()).toEqual(before)
    })
  }
}

for (const width of [412, 1440]) {
  test(`Listening stats and empty Trash keep their navigation at ${width} (LIST-06)`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 915 })
    await page.goto(`${demo.base}/listening-stats`)
    const nav = page.getByRole("navigation", {
      name: width === 412 ? "Sections" : "Library and lists"
    })
    await expect(
      nav.getByRole("link", { name: width === 412 ? "Library" : "Settings", exact: true })
    ).toHaveAttribute("aria-current", "page")
    await page.goto(`${demo.base}/playlists/trash`)
    await expect(page.getByText("The Trash is empty")).toBeVisible()
    await expect(
      nav.getByRole("link", { name: width === 412 ? "Playlists" : /^Trash/ })
    ).toHaveAttribute("aria-current", "page")
  })
}
