import { type BrowserContext, chromium, expect, type Page, test } from "@playwright/test"
import { formatTime } from "../src/lib/time.ts"

const book = "The workshop as a notebook"
const chair = "Repairing a chair, twice"
const joinery = "Joinery without screws"
const rice = "Who sets the price of rice?"
const currency = "When a currency disappears"
const lighthouse = "Lighthouses and public goods"
const player = (page: Page) => page.getByRole("region", { name: "Now playing" })
const episodeRow = (page: Page, title: string) =>
  page.getByRole("row").filter({ has: page.getByRole("link", { name: title, exact: true }) })
const listLink = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Library and lists" })
    .getByRole("link", { name: new RegExp(`^${name}(?:$|[ ,])`) })
const action = (page: Page, name: string) => page.getByRole("button", { name, exact: true })
const pathFor = (title: string) => `/search?q=${encodeURIComponent(title)}`
const push = (page: Page, tag: string) =>
  page.waitForResponse((response) => {
    const request = response.request()
    return (
      response.url().endsWith("/api/sync/push") &&
      request.method() === "POST" &&
      response.ok() &&
      request
        .postDataJSON()
        .operations.some((operation: { change: { _tag: string } }) => operation.change._tag === tag)
    )
  })

async function open(page: Page, path: string) {
  await page.goto(path)
  await expect(page.getByRole("main")).toBeVisible()
}
async function starred(page: Page, title: string) {
  await open(page, "/views/starred")
  await expect(episodeRow(page, title)).toBeVisible()
}
async function renameCommute(page: Page) {
  await open(page, "/playlists/commute/settings")
  await action(page, "Rename").click()
  await page.getByRole("textbox", { name: "Name" }).fill("Commute Web")
  const committed = push(page, "RenamePlaylist")
  await action(page, "Save").click()
  await committed
  await expect(listLink(page, "Commute Web")).toBeVisible()
}
async function workshopOrder(page: Page, titles: string[]) {
  await open(page, "/playlists/workshop")
  await expect(page.locator("main [role=row] [data-cell=title]")).toHaveText(titles)
}
async function edit(page: Page) {
  await renameCommute(page)
  for (const [title, label, tag] of [
    [rice, "Star", "SetStar"],
    [currency, "Played", "MarkPlayed"]
  ] as const) {
    await open(page, pathFor(title))
    const toggle = episodeRow(page, title).getByRole("button", { name: label, exact: true })
    await expect(toggle).toHaveAttribute("aria-pressed", "false")
    const committed = push(page, tag)
    await toggle.click()
    await committed
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
  }
  await open(page, pathFor(joinery))
  await episodeRow(page, joinery).getByRole("button", { name: "Add to a Playlist…" }).click()
  const dialog = page.getByRole("dialog", { name: "Add to a Playlist" })
  await dialog.getByRole("radio", { name: /^Workshop/ }).check()
  const committed = push(page, "AddEntry")
  await dialog.getByRole("button", { name: "Play Last", exact: true }).click()
  await committed
  await workshopOrder(page, [book, chair, joinery])
}

async function runPhase(phase: string, page: Page) {
  switch (phase) {
    case "connect":
      await open(page, "/library")
      for (const name of ["Deep Field", "Market Hours", "Slow Build"]) {
        await expect(page.getByRole("main").getByRole("link", { name, exact: true })).toBeVisible()
      }
      for (const name of ["Default", "Commute", "Workshop"]) {
        await expect(listLink(page, name)).toBeVisible()
      }
      break
    case "web-edit":
      await edit(page)
      break
    case "mac-check":
      await starred(page, joinery)
      await expect(listLink(page, "Workshop Mac")).toBeVisible()
      break
    case "android-check":
      await starred(page, lighthouse)
      await expect(listLink(page, "Commute Android")).toBeVisible()
      break
    case "offline-check": {
      await workshopOrder(page, [joinery, book, chair])
      await expect(listLink(page, "Workshop Offline Mac")).toBeVisible()
      const position = Number(process.env.PODLIST_CROSS_SYNC_POSITION)
      const duration = Number(process.env.PODLIST_CROSS_SYNC_DURATION)
      expect(duration).toBeGreaterThan(position)
      await expect(episodeRow(page, book)).toContainText(`${formatTime(duration - position)} left`)
      break
    }
    case "handoff-check": {
      const expected = Number(process.env.PODLIST_CROSS_SYNC_POSITION)
      expect(expected).toBeGreaterThanOrEqual(150)
      await open(page, "/playlists/workshop")
      // The row action resumes this Entry even if another Entry was the active Cursor.
      await episodeRow(page, book)
        .getByRole("button", { name: `Play ${book} from here` })
        .click()
      const position = player(page).getByRole("slider", { name: "Position" })
      await expect(player(page).getByRole("button", { name: "Pause", exact: true })).toBeVisible()
      const seconds = async () => Number(await position.inputValue())
      await expect.poll(seconds).toBeGreaterThanOrEqual(expected - 1)
      const resumed = await seconds()
      expect(resumed).toBeLessThan(expected + 12)
      await expect.poll(seconds).toBeGreaterThan(resumed)
      await player(page).getByRole("button", { name: "Pause", exact: true }).click()
      await expect(player(page).getByRole("button", { name: "Play", exact: true })).toBeVisible()
      break
    }
    case "restore": {
      await open(page, "/playlists")
      await expect(listLink(page, "Commute Android")).toHaveCount(0)
      await listLink(page, "Trash").click()
      const committed = push(page, "RestorePlaylist")
      await action(page, "Restore Commute Android").click()
      await committed
      await expect(listLink(page, "Commute Android")).toBeVisible()
      break
    }
    case "restore-check":
      await open(page, "/playlists")
      await expect(listLink(page, "Commute Android")).toBeVisible()
      // The sidebar lists Trash only while it holds something; no link means it's empty.
      if (await listLink(page, "Trash").count()) {
        await listLink(page, "Trash").click()
        await expect(action(page, "Restore Commute Android")).toHaveCount(0)
      }
      break
    case "subscribe": {
      const feed = process.env.PODLIST_CROSS_SYNC_FEED ?? ""
      expect(feed).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/feeds\/long-list\.xml$/)
      await open(page, "/library")
      await action(page, "Add podcasts").click()
      const dialog = page.getByRole("dialog", { name: "Add podcasts" })
      await dialog.getByRole("button", { name: "Feed address" }).click()
      await dialog.getByRole("textbox", { name: "Feed address" }).fill(feed)
      await dialog.getByRole("button", { name: /^Subscribe to/ }).click()
      await expect(dialog.getByText("Subscribed", { exact: true })).toBeVisible()
      await dialog.getByRole("button", { name: "Close" }).click()
      await expect(page.getByRole("link", { name: "Long listening", exact: true })).toBeVisible()
      break
    }
    case "subscription-check":
      for (const title of ["Long Episode 001", "Long Episode 500"]) {
        await open(page, pathFor(title))
        await expect(episodeRow(page, title)).toBeVisible()
      }
      break
    case "unsubscribe":
      await open(page, "/library")
      await page.getByRole("link", { name: "Long listening", exact: true }).click()
      await action(page, "Subscribed to Long listening").click()
      await action(page, "Unsubscribe").click()
      await expect(action(page, "Subscribe to Long listening")).toBeVisible()
      await open(page, "/library")
      await expect(page.getByRole("link", { name: "Long listening", exact: true })).toHaveCount(0)
      break
    case "version-check":
      await open(page, "/playlists")
      await expect(listLink(page, "Commute Protocol")).toBeVisible()
      await expect(listLink(page, "Workshop Offline Mac")).toBeVisible()
      break
    default:
      throw new Error(`Unknown web phase: ${phase}`)
  }
}

const phase = process.env.PODLIST_CROSS_SYNC_PHASE ?? ""
test(`cross-client sync — ${phase}`, async () => {
  const info = test.info()
  const baseURL = process.env.PODLIST_CROSS_SYNC_ORIGIN ?? ""
  const profile = process.env.PODLIST_CROSS_SYNC_PROFILE
  expect(baseURL).toMatch(/^http:\/\/localhost:\d+$/)
  if (!profile) throw new Error("Missing cross-client browser profile")
  const context: BrowserContext = await chromium.launchPersistentContext(profile, {
    baseURL,
    headless: true,
    viewport: { width: 1440, height: 900 }
  })
  try {
    const page = context.pages()[0] ?? (await context.newPage())
    await context.tracing.start({ screenshots: true, snapshots: true })
    try {
      await runPhase(phase, page)
    } catch (error) {
      await page
        .screenshot({ path: info.outputPath("failure.png"), timeout: 5_000 })
        .catch(() => {})
      await context.tracing.stop({ path: info.outputPath("trace.zip") }).catch(() => {})
      throw error
    }
    await context.tracing.stop()
  } finally {
    await context.close()
  }
})
