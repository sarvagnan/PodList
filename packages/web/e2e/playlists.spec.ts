import { expect, type Page, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the UI flow runs
import { startDemo } from "../ui-flows/demo.mjs"

// Playlists: create, settings, Trash and reordering (docs/design/ui-layout.md).

let demo: { base: string; stop: () => void }
test.beforeEach(async () => {
  demo = await startDemo()
})
test.afterEach(() => demo.stop())

const titles = (page: Page) =>
  page
    .locator("main [role=row]")
    .evaluateAll((rows) => rows.map((r) => r.querySelector("[data-cell=title]")?.textContent ?? ""))

test("creates, renames, deletes to the Trash and restores a Playlist", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists`)
  await page.getByRole("button", { name: "New Playlist" }).first().click()
  const dialog = page.getByRole("dialog", { name: "New Playlist" })
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog.getByText("A Playlist needs a name.")).toBeVisible()
  await dialog.getByRole("textbox", { name: "Name" }).fill("Long drives")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("heading", { name: "Long drives", level: 1 })).toBeVisible()

  await page.getByRole("link", { name: "Playlist settings" }).click()
  const name = page.getByRole("textbox", { name: "Name" })
  await name.fill("Road trips")
  await name.blur()
  const sidebar = page.getByRole("navigation", { name: "Library and lists" })
  await expect(sidebar.getByRole("link", { name: /^Road trips/ })).toBeVisible()
  const clear = page.getByRole("checkbox", { name: /Clear on Played/ })
  await clear.click()
  await expect(clear).toBeChecked()

  await page.getByRole("button", { name: "Delete Playlist" }).click()
  await expect(page).toHaveURL(/\/playlists$/)
  await expect(page.getByText("Moved “Road trips” to the Trash")).toBeVisible()
  await expect(sidebar.getByRole("link", { name: /^Road trips/ })).toHaveCount(0)
  await sidebar.getByRole("link", { name: /^Trash/ }).click()
  await page.getByRole("button", { name: "Restore Road trips" }).click()
  await expect(sidebar.getByRole("link", { name: /^Road trips/ })).toBeVisible()
})

test("the Default Playlist keeps its name and can't be deleted", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/default/settings`)
  await expect(page.getByRole("textbox", { name: "Name" })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Delete Playlist" })).toHaveCount(0)
})

test("reorders Entries with the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/default`)
  // Titles arrive with the catalogue; until then rows show placeholders.
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const before = await titles(page)
  const handle = page
    .locator("main [role=row]")
    .first()
    .locator('[aria-roledescription="sortable"]')
  await expect(handle).toHaveAccessibleName(`Move ${before[0]}`)
  await handle.focus()
  await page.keyboard.press("Space")
  await expect(handle).toHaveAttribute("aria-pressed", "true")
  // dnd-kit starts listening for arrows a moment after the pick-up (a timer), so an
  // arrow pressed at once can go unheard. Press again only if the move wasn't announced.
  const moved = page.getByText(`${before[0]} is at position 2 of`)
  await expect(async () => {
    if ((await moved.count()) === 0) await page.keyboard.press("ArrowDown")
    await expect(moved).toBeAttached({ timeout: 1000 })
  }).toPass()
  // The move animates; dropping before it lands keeps the old place.
  await page.waitForTimeout(400)
  await page.keyboard.press("Space")
  await expect.poll(() => titles(page)).toEqual([before[1], before[0], ...before.slice(2)])
  // It stays that way after a reload: the move was recorded.
  await page.reload()
  await page.locator("main [role=row]").first().waitFor()
  await expect.poll(() => titles(page)).toEqual([before[1], before[0], ...before.slice(2)])
})

test("the Listening Timeline rewinds to a moment, with Undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/default`)
  const sections = page.getByRole("navigation", { name: "Entries, History and Listening Timeline" })
  await sections.getByRole("link", { name: "History" }).click()
  await expect(page).toHaveURL(/tab=history/)
  await expect(sections.getByRole("link", { name: "History" })).toHaveAttribute(
    "aria-current",
    "page"
  )
  await expect(sections.getByRole("link", { name: "Entries" })).not.toHaveAttribute(
    "aria-current",
    "page"
  )
  await sections.getByRole("link", { name: "Listening Timeline" }).click()
  await page.getByRole("button", { name: "Rewind to here" }).first().click()
  const dialog = page.getByRole("alertdialog", { name: /^Rewind Default to/ })
  await expect(dialog).toContainText("Kept: Entries you added or moved since")
  await dialog.getByRole("button", { name: "Rewind" }).click()
  await expect(page.getByText(/^Rewound Default to/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible()
})

test("right-click on an Entry moves it to the bottom, with Undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/default`)
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const before = await titles(page)
  await page.locator('main [data-row="0"]').click({ button: "right" })
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem", { name: "Move to Top" })).toHaveCount(0)
  await expect(menu.getByRole("menuitem", { name: "Copy Link" })).toBeVisible()
  await menu.getByRole("menuitem", { name: "Move to Bottom" }).click()
  await expect.poll(() => titles(page)).toEqual([...before.slice(1), before[0]])
  await page.getByRole("button", { name: "Undo" }).click()
  await expect.poll(() => titles(page)).toEqual(before)
})

test("on the phone, Entries move without a drag, from their More menu (AX-04)", async ({
  page
}) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto(`${demo.base}/playlists/commute`)
  await page.locator("main [role=row] [data-cell=title]").first().waitFor()
  const before = await titles(page)
  const second = before[1] ?? ""
  await page.getByRole("button", { name: `More actions for ${second}` }).click()
  await page.getByRole("menuitem", { name: "Move Up" }).click()
  await expect.poll(async () => (await titles(page))[0]).toBe(second)
  // Remove is there too.
  await page.getByRole("button", { name: `More actions for ${second}` }).click()
  await expect(page.getByRole("menuitem", { name: "Remove from Commute" })).toBeVisible()
  await page.keyboard.press("Escape")

  // Up next in the drawer: the same menu.
  await page.goto(`${demo.base}/playlists/default`)
  await page.getByRole("button", { name: /^Open Now Playing/ }).click()
  const drawer = page.getByRole("dialog")
  await drawer.getByRole("button", { name: /^Up next/ }).click()
  const more = drawer.getByRole("button", { name: /^More actions for / })
  await expect(more.first()).toBeVisible()
  const lastName = ((await more.last().getAttribute("aria-label")) ?? "").replace(
    "More actions for ",
    ""
  )
  await more.last().click()
  await page.getByRole("menuitem", { name: "Move to Top" }).click()
  await expect(more.first()).toHaveAttribute("aria-label", `More actions for ${lastName}`)
})

test("a Playlist's name field keeps what's typed, an empty field included (WDATA-03)", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${demo.base}/playlists/commute/settings`)
  const name = page.getByRole("textbox", { name: "Name" })
  await expect(name).toHaveValue("Commute")
  await name.fill("")
  await page.waitForTimeout(400)
  await expect(name).toHaveValue("")
  await name.pressSequentially("Bus")
  await expect(name).toHaveValue("Bus")
  await name.blur()
  await expect(page.getByRole("heading", { name: /Playlist settings/, level: 1 })).toBeVisible()
  await expect(
    page.getByRole("navigation", { name: "Library and lists" }).getByRole("link", { name: /^Bus/ })
  ).toBeVisible()
})
