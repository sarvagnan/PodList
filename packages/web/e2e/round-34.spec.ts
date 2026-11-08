import { expect, type Locator, type Page, test } from "@playwright/test"
// @ts-expect-error: shared fixture helper
import { startDemo } from "../ui-flows/demo.mjs"

let demo: { base: string; stop: () => void }
test.beforeEach(async ({ page }) => {
  demo = await startDemo()
  await page.setViewportSize({ width: 1440, height: 900 })
})
test.afterEach(() => demo.stop())

const draftGone = (page: Page) =>
  expect.poll(() => page.evaluate(() => localStorage.getItem("podlist:dialog-draft"))).toBeNull()

test("New Playlist restores its open draft and clears it on Create or Cancel (DATA-01)", async ({
  page
}) => {
  await page.goto(`${demo.base}/playlists`)
  const open = page.getByRole("button", { name: "New Playlist", exact: true }).first()
  await open.click()
  const dialog = page.getByRole("dialog", { name: "New Playlist", exact: true })
  await dialog.getByRole("textbox", { name: "Name" }).fill("Weekend listening")
  await dialog.getByRole("checkbox", { name: /Clear on Played/ }).check()
  await page.reload()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue("Weekend listening")
  await expect(dialog.getByRole("checkbox", { name: /Clear on Played/ })).toBeChecked()
  await dialog.getByRole("button", { name: "Create", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Weekend listening", level: 1 })).toBeVisible()
  await draftGone(page)
  await page.reload()
  await expect(dialog).toBeHidden()
  await page.goto(`${demo.base}/playlists`)
  await open.click()
  await dialog.getByRole("textbox", { name: "Name" }).fill("Discard me")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await draftGone(page)
  await open.click()
  await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue("")
})

for (const bulk of [false, true]) {
  test(`New Playlist inside Add restores ${bulk ? "bulk" : "single"} Episode context (WDATA-01)`, async ({
    page
  }) => {
    await page.goto(`${demo.base}/views/new-this-week`)
    const rows = page.locator("main [data-row]")
    await expect(rows.first().locator('[data-cell="title"]')).toBeVisible()
    const titles = await rows.locator('[data-cell="title"]').allTextContents()
    if (bulk) {
      await rows.nth(0).getByRole("checkbox").check()
      await rows.nth(1).getByRole("checkbox").check()
      await page.getByRole("toolbar").getByRole("button", { name: "New Playlist…" }).click()
    } else {
      await rows.first().getByRole("button", { name: "Add to a Playlist…", exact: true }).click()
      await page.getByRole("radio", { name: "New Playlist…" }).check()
    }
    const dialog = page.getByRole("dialog", { name: "Add to a Playlist" })
    await dialog.getByRole("textbox", { name: "Name" }).fill("Recovered Entries")
    await page.reload()
    await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue("Recovered Entries")
    await dialog.getByRole("button", { name: "Play Next" }).click()
    await expect(dialog).toBeHidden()
    await draftGone(page)
    await page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: /^Recovered Entries/ })
      .click()
    await expect
      .poll(() => page.locator('main [data-cell="title"]').allTextContents())
      .toEqual(titles.slice(0, bulk ? 2 : 1))
  })
}

test("Save as View restores the name and search conditions, and discards on Cancel (WDATA-01)", async ({
  page
}) => {
  await page.goto(`${demo.base}/search?q=market`)
  await page.getByRole("button", { name: "Save as View" }).click()
  const dialog = page.getByRole("dialog", { name: "Save as a View" })
  await dialog.getByRole("textbox", { name: "Name" }).fill("Markets")
  await page.reload()
  await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue("Markets")
  await dialog.getByRole("button", { name: "Save View" }).click()
  await expect(page.getByRole("heading", { name: "Markets", level: 1 })).toBeVisible()
  await draftGone(page)
  await page.getByRole("button", { name: "Edit View" }).click()
  await expect(page.getByRole("searchbox", { name: "Mentions" })).toHaveValue("market")
  await page.goto(`${demo.base}/search?q=market`)
  await page.getByRole("button", { name: "Save as View" }).click()
  await dialog.getByRole("textbox", { name: "Name" }).fill("Discard")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await draftGone(page)
  await page.reload()
  await expect(dialog).toBeHidden()
})

test("Add podcasts keeps both typed fields and selected tab through reload (WDATA-01)", async ({
  page
}) => {
  await page.goto(`${demo.base}/library`)
  await page.getByRole("button", { name: "Add podcasts" }).click()
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  await sheet.getByRole("searchbox", { name: "Podcast name" }).fill("Slow Build")
  await sheet.getByRole("button", { name: "Feed address", exact: true }).click()
  await sheet.getByRole("textbox", { name: "Feed address" }).fill("https://example.com/draft.xml")
  await page.reload()
  await expect(sheet.getByRole("textbox", { name: "Feed address" })).toHaveValue(
    "https://example.com/draft.xml"
  )
  await sheet.getByRole("button", { name: "Search", exact: true }).click()
  await expect(sheet.getByRole("searchbox", { name: "Podcast name" })).toHaveValue("Slow Build")
  await sheet.getByRole("button", { name: "Close" }).click()
  await draftGone(page)
  await page.reload()
  await expect(sheet).toBeHidden()
  await page.getByRole("button", { name: "Add podcasts" }).click()
  await expect(sheet.getByRole("searchbox", { name: "Podcast name" })).toHaveValue("")
})

for (const field of ["Name", "Mentions"]) {
  test(`View ${field} follows replayed edits after reload and preserves subsequent typing (WDATA-01)`, async ({
    page
  }) => {
    await page.goto(`${demo.base}/views/starred?edit=true`)
    const input = page.getByRole(field === "Name" ? "textbox" : "searchbox", {
      name: field,
      exact: true
    })
    await expect(input).toBeVisible()
    const value = field === "Name" ? "Starred keepers" : "shipping"
    await input.fill(value)
    await page.reload()
    await expect(input).toHaveValue(value)
    await input.focus()
    await input.evaluate((element: HTMLInputElement) => {
      element.setSelectionRange(element.value.length, element.value.length)
    })
    await input.pressSequentially("!")
    await expect(input).toHaveValue(`${value}!`)
    await input.blur()
    await page.reload()
    await expect(input).toHaveValue(`${value}!`)
  })
}

for (const phone of [false, true]) {
  test(`last Playlist Entry removal focuses heading on ${phone ? "phone menu" : "desktop"} (WKEY-03)`, async ({
    page
  }) => {
    if (phone) await page.setViewportSize({ width: 412, height: 915 })
    await page.goto(`${demo.base}/playlists/commute`)
    await expect(page.locator('main [data-cell="title"]').first()).toBeVisible()
    const count = await page.locator("main [data-row]").count()
    for (let i = count; i > 0; i--) {
      if (phone) {
        await page
          .getByRole("button", { name: /^More actions for/ })
          .first()
          .click()
        await page.getByRole("menuitem", { name: "Remove from Commute" }).click()
      } else {
        const remove = page.getByRole("button", { name: /^Remove .* from Commute/ }).first()
        await remove.focus()
        await page.keyboard.press("Enter")
      }
      await expect(page.locator("main [data-row]")).toHaveCount(i - 1)
    }
    await expect(page.locator("main h1")).toBeFocused()
  })

  for (const drawerPage of phone ? ["queue"] : ["queue", "main"]) {
    test(`last Up next ${drawerPage} removal focuses the drawer heading on ${phone ? "phone menu" : "desktop"} (WKEY-03)`, async ({
      page
    }) => {
      if (phone) await page.setViewportSize({ width: 412, height: 915 })
      await page.goto(`${demo.base}/playlists/default`)
      if (drawerPage === "queue") {
        await page
          .getByRole("region", { name: "Now playing" })
          .getByRole("button", { name: /up next/i })
          .click()
      } else {
        await page.getByRole("button", { name: /^Open Now Playing/ }).click()
      }
      const drawer = page.getByRole("dialog")
      const removes = phone
        ? drawer.getByRole("button", { name: /^More actions for/ })
        : drawer.locator("[data-upnext-remove]")
      await expect(removes.first()).toBeVisible()
      const count = await removes.count()
      for (let i = count; i > 0; i--) {
        await removes.first().focus()
        await page.keyboard.press("Enter")
        if (phone) await page.getByRole("menuitem", { name: "Remove from Default" }).click()
        await expect(removes).toHaveCount(i - 1)
      }
      await expect(drawer.locator("h2")).toBeFocused()
    })
  }
}

test("directory search announces waiting in a reserved line and ignores stale responses (CTRL-08)", async ({
  page
}) => {
  let release: () => void = () => {}
  let started: () => void = () => {}
  const requested = new Promise<void>((resolve) => {
    started = resolve
  })
  const waiting = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/directory/search**", async (route) => {
    const old = route.request().url().includes("first")
    if (old) {
      started()
      await waiting
    }
    await route.fulfill({
      json: [
        {
          title: old ? "Old result" : "Latest result",
          author: null,
          feedUrl: `https://example.com/${old ? "old" : "new"}.xml`,
          artworkUrl: null,
          source: "itunes"
        }
      ]
    })
  })
  await page.goto(`${demo.base}/library`)
  await page.getByRole("button", { name: "Add podcasts" }).click()
  const sheet = page.getByRole("dialog", { name: "Add podcasts" })
  const input = sheet.getByRole("searchbox", { name: "Podcast name" })
  const before = await input.boundingBox()
  await input.fill("first")
  await expect(sheet.getByRole("status")).toHaveText("Searching…")
  await requested
  await input.fill("second")
  await expect(sheet.getByText("Latest result")).toBeVisible()
  release()
  await expect(sheet.getByText("Old result")).toHaveCount(0)
  await expect(sheet.getByRole("status")).toBeEmpty()
  expect(await input.boundingBox()).toEqual(before)
})

test("skip numerals meet 12 px and scale with text in bar and drawer (WTYPE-01)", async ({
  page
}) => {
  await page.goto(`${demo.base}/playlists/default`)
  const numerals = page
    .getByRole("region", { name: "Now playing" })
    .locator("span.absolute")
    .filter({ hasText: /^(15|30)$/ })
  const sizes = (elements: Locator) =>
    elements.evaluateAll((nodes) =>
      nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize))
    )
  await expect.poll(() => sizes(numerals)).toEqual([12, 12])
  await page.getByRole("button", { name: /^Open Now Playing/ }).click()
  const large = page
    .getByRole("dialog")
    .locator("span.absolute")
    .filter({ hasText: /^(15|30)$/ })
  await expect.poll(() => sizes(large)).toEqual([12, 12])
  await page.addStyleTag({ content: "html { font-size: 32px !important }" })
  await expect.poll(() => sizes(large)).toEqual([21, 21])
})

test("Rewind buttons have distinct resting, hover and pressed fills (CTRL-05)", async ({
  page
}) => {
  await page.goto(`${demo.base}/playlists/default?tab=timeline`)
  await page.getByRole("button", { name: "Rewind to here" }).first().click()
  const dialog = page.getByRole("alertdialog")
  for (const name of ["Cancel", "Rewind"]) {
    const button = dialog.getByRole("button", { name, exact: true })
    await page.mouse.move(0, 0)
    const resting = await button.evaluate((el) => getComputedStyle(el).backgroundColor)
    await button.hover()
    const hovered = await button.evaluate((el) => getComputedStyle(el).backgroundColor)
    await page.mouse.down()
    const pressed = await button.evaluate((el) => getComputedStyle(el).backgroundColor)
    await page.mouse.move(0, 0)
    await page.mouse.up()
    expect(hovered).not.toBe(resting)
    expect(pressed).not.toBe(hovered)
  }
})
