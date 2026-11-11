import { expect, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async ({ page }) => {
  demo = await startDemo()
  await page.setViewportSize({ width: 1440, height: 900 })
})
test.afterEach(() => demo.stop())

test("typing a View rename leaves the saved name alone", async ({ page }) => {
  await page.goto(`${demo.base}/views/short?edit=true`)
  const rename = page.getByRole("button", { name: "Rename", exact: true })
  // Also reaches the old live field, so the regression fails on the owner's symptom.
  await page.getByRole("complementary", { name: "Edit View" }).waitFor()
  if (await rename.count()) await rename.click()
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Weekend listening")
  await page.getByRole("combobox", { name: "Played", exact: true }).focus()
  await page.waitForTimeout(500)
  await expect(page.getByRole("heading", { name: "Under 30 minutes", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled()
})

for (const width of [1440, 390]) {
  test(`View feedback keeps the same bounding box during consecutive edits at ${width}px`, async ({
    page
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${demo.base}/views/short?edit=true`)
    const played = page.getByRole("combobox", { name: "Played", exact: true })
    await played.selectOption("played")
    const notice = page
      .getByRole("dialog", { name: "Edited “Under 30 minutes”", exact: true })
      .last()
    await expect(notice).toBeVisible()
    const before = await notice.boundingBox()
    const conditionBefore = await played.boundingBox()
    for (const value of ["unplayed", "inProgress", "any"]) {
      await played.selectOption(value)
      // Sample animation frames too: a second toast must not stack over its outgoing one.
      const boxes = await notice.evaluate(async (el) => {
        const label = el.getAttribute("aria-label")
        const boxes = []
        for (let i = 0; i < 20; i++) {
          await new Promise(requestAnimationFrame)
          const nodes = [...document.querySelectorAll('[role="dialog"]')].filter(
            (node) => node.getAttribute("aria-label") === label
          )
          const box = nodes.at(-1)?.getBoundingClientRect()
          if (box) boxes.push({ x: box.x, y: box.y, width: box.width, height: box.height })
        }
        return boxes
      })
      expect(boxes.length).toBeGreaterThan(0)
      for (const box of boxes) expect(box).toEqual(before)
      expect(await played.boundingBox()).toEqual(conditionBefore)
    }
  })
}

for (const kind of ["View", "Playlist"] as const) {
  const route = kind === "View" ? "/views/short?edit=true" : "/playlists/commute/settings"
  const original = kind === "View" ? "Under 30 minutes" : "Commute"
  const taken = kind === "View" ? "Starred" : "Default"

  test(`${kind} renames require Save, validate, discard with Cancel or Escape and offer named Undo`, async ({
    page
  }) => {
    await page.goto(`${demo.base}${route}`)
    const rename = page.getByRole("button", { name: "Rename", exact: true })
    const field = page.getByRole("textbox", { name: "Name", exact: true })
    const save = page.getByRole("button", { name: "Save", exact: true })
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    const savedLink = sidebar.getByRole("link", { name: new RegExp(`^${original}`) })
    await expect(field).toHaveCount(0)
    await rename.click()
    await expect(field).toBeFocused()
    await expect(save).toBeDisabled()
    await field.fill(`  ${original}  `)
    await expect(save).toBeDisabled()
    await field.fill("")
    await expect(save).toBeDisabled()
    await expect(page.getByText(`A ${kind} needs a name.`, { exact: true })).toBeVisible()
    await field.fill(`  ${taken.toUpperCase()}  `)
    await expect(save).toBeDisabled()
    await expect(
      page.getByText(`There’s already a ${kind} called “${taken}”.`, { exact: true })
    ).toBeVisible()
    await field.press("Enter")
    await expect(field).toBeVisible()
    await expect(savedLink).toBeVisible()
    await field.fill("Discard this")
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(rename).toBeFocused()
    await expect(savedLink).toBeVisible()
    await rename.click()
    await expect(field).toHaveValue(original)
    await field.fill("Discard with Escape")
    await field.press("Escape")
    await expect(rename).toBeFocused()
    await expect(savedLink).toBeVisible()
    await rename.click()
    await expect(field).toHaveValue(original)
    await field.fill("  Weekend listening  ")
    await field.press("Enter")
    await expect(field).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: /^Weekend listening/ })).toBeVisible()
    const toast = page.getByRole("dialog", {
      name: `Renamed ${kind} “${original}” to “Weekend listening”`,
      exact: true
    })
    await toast.getByRole("button", { name: "Undo", exact: true }).click()
    await expect(savedLink).toBeVisible()
    await rename.click()
    await expect(field).toHaveValue(original)
    await field.fill("Save with button")
    await save.click()
    await expect(sidebar.getByRole("link", { name: /^Save with button/ })).toBeVisible()
    await page.reload()
    await expect(field).toHaveCount(0)
    await rename.click()
    await expect(field).toHaveValue("Save with button")
  })

  test(`${kind} keeps open rename drafts across navigation and reload without applying them`, async ({
    page
  }) => {
    await page.goto(`${demo.base}${route}`)
    const rename = page.getByRole("button", { name: "Rename", exact: true })
    const field = page.getByRole("textbox", { name: "Name", exact: true })
    await rename.click()
    await field.fill("Unfinished rename")
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    await sidebar.getByRole("link", { name: "Library", exact: true }).click()
    await page.goto(`${demo.base}${route}`)
    await expect(field).toHaveValue("Unfinished rename")
    await expect(sidebar.getByRole("link", { name: new RegExp(`^${original}`) })).toBeVisible()
    await page.reload()
    await expect(field).toHaveValue("Unfinished rename")
    // An empty open draft also survives, and never falls back to the saved name.
    await field.fill("")
    await page.reload()
    await expect(field).toHaveValue("")
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
    await page.reload()
    await expect(field).toHaveCount(0)
    await rename.click()
    await expect(field).toHaveValue(original)
  })
}

for (const width of [1440, 390]) {
  for (const kind of ["View", "Playlist"] as const) {
    test(`${kind} saving status reserves its position at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(
        `${demo.base}${kind === "View" ? "/views/short?edit=true" : "/playlists/commute/settings"}`
      )
      const control =
        kind === "View"
          ? page.getByRole("combobox", { name: "Played", exact: true })
          : page.getByRole("checkbox", { name: /Clear on Played/ })
      await expect(control).toBeVisible()
      const status = page.locator(`[data-sync-feedback="${width === 390 ? "phone" : "desktop"}"]`)
      const before = await status.boundingBox()
      expect(before).not.toBeNull()
      const controlBefore = await control.boundingBox()
      await page.route("**/api/sync/push", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        await route.continue()
      })
      for (const value of ["played", "unplayed", "any"]) {
        if (kind === "View") await control.selectOption(value)
        else await control.click()
        await expect(status).toBeVisible()
        expect(await status.boundingBox()).toEqual(before)
        await expect(status).toBeHidden()
        expect(await status.boundingBox()).toEqual(before)
        expect(await control.boundingBox()).toEqual(controlBefore)
      }
    })
  }
}

test("a new View with an open rename survives leaving before any condition changes", async ({
  page
}) => {
  await page.goto(`${demo.base}/views/short`)
  const sidebar = page.getByRole("navigation", { name: "Library and lists" })
  await sidebar.getByRole("button", { name: "New View", exact: true }).click()
  await expect(page).toHaveURL(/edit=true/)
  const editorUrl = page.url()
  await page.getByRole("button", { name: "Rename", exact: true }).click()
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Keep this draft")
  await sidebar.getByRole("link", { name: "Library", exact: true }).click()
  await expect(sidebar.getByRole("link", { name: "New View", exact: true })).toBeVisible()
  await page.goto(editorUrl)
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(
    "Keep this draft"
  )
})

test("View and Playlist rename drafts coexist and View conditions remain live", async ({
  page
}) => {
  await page.goto(`${demo.base}/views/short?edit=true`)
  const rename = page.getByRole("button", { name: "Rename", exact: true })
  const field = page.getByRole("textbox", { name: "Name", exact: true })
  await rename.click()
  await field.fill("View draft")
  await page.getByRole("combobox", { name: "Played", exact: true }).selectOption("played")
  await page.goto(`${demo.base}/playlists/commute/settings`)
  await rename.click()
  await field.fill("Playlist draft")
  await page.goto(`${demo.base}/views/short?edit=true`)
  await expect(field).toHaveValue("View draft")
  await expect(page.getByRole("combobox", { name: "Played", exact: true })).toHaveValue("played")
  await page.reload()
  await expect(field).toHaveValue("View draft")
  await expect(page.getByRole("combobox", { name: "Played", exact: true })).toHaveValue("played")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await page.goto(`${demo.base}/playlists/commute/settings`)
  await expect(field).toHaveValue("Playlist draft")
})
