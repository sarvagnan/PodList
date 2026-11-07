import { expect, test } from "@playwright/test"

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test("moves between Views, Playlists and Library with the bottom tabs", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/views$/)
    await expect(page.getByRole("heading", { name: "Views" })).toBeVisible()
    const tabs = page.getByRole("navigation", { name: "Sections" })
    await tabs.getByRole("link", { name: "Playlists" }).click()
    await expect(page.getByRole("heading", { name: "Playlists" })).toBeVisible()
    await page.getByRole("link", { name: /Default/ }).click()
    await expect(page.getByRole("heading", { name: "Default" })).toBeVisible()
    await page.getByRole("link", { name: "Playlists" }).first().click()
    await tabs.getByRole("link", { name: "Library" }).click()
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible()
  })
})

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test("lists Playlists in the sidebar and opens one as the main view", async ({ page }) => {
    await page.goto("/")
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    await sidebar.getByRole("link", { name: /Default/ }).click()
    await expect(page).toHaveURL(/\/playlists\/default$/)
    await expect(page.getByRole("heading", { name: "Default" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden()
  })
})

test("a second tab offers to take over the Library", async ({ page, context }) => {
  await page.goto("/")
  await expect(page.locator("main h1")).toBeVisible()
  const second = await context.newPage()
  await second.goto("/")
  await expect(
    second.getByRole("heading", { name: "PodList is open in another tab" })
  ).toBeVisible()
  await second.getByRole("button", { name: "Use here" }).click()
  await expect(second.locator("main h1")).toBeVisible()
  await expect(page.getByRole("heading", { name: "PodList is open in another tab" })).toBeVisible()
})
