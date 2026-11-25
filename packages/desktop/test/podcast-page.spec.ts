import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"
import { test } from "./electron-fixture.ts"

test("opens a Podcast page, adds one Episode and subscribes without a duplicate", async ({
  desktop: { launch, close }
}) => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-podcast-"))
  try {
    const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    const feedUrl = `${demo.fixtures}/feeds/long-list.xml`
    const catalogue = async () => {
      const response = await fetch(`${demo.base}/api/library/changes?since=0&limit=1000`)
      return (await response.json()) as {
        subscriptions: Array<{ id: string; feedUrl: string; unsubscribedAt: number | null }>
        episodes: Array<{ id: string; subscriptionId: string; guid: string }>
      }
    }
    await page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: "Library", exact: true })
      .click()
    await page.getByRole("button", { name: "Add podcasts" }).click()
    const sheet = page.getByRole("dialog", { name: "Add podcasts" })
    await sheet.getByRole("searchbox", { name: "Podcast Name or Feed Address" }).fill(feedUrl)
    await sheet.getByRole("link", { name: "Long listening" }).click()
    await expect(page.getByRole("heading", { name: "Long listening", level: 1 })).toBeVisible()
    expect((await catalogue()).subscriptions.find((sub) => sub.feedUrl === feedUrl)).toBeUndefined()

    await page.getByRole("searchbox", { name: "Search Episodes" }).fill("Long Episode 023")
    await page
      .getByRole("group", { name: "Long Episode 023" })
      .getByRole("button", { name: "Play Next" })
      .click()
    await expect(page.getByText(/Plays next/)).toBeVisible()
    const imported = await catalogue()
    const sub = imported.subscriptions.find((sub) => sub.feedUrl === feedUrl)
    expect(sub?.unsubscribedAt).not.toBeNull()
    const [episode] = imported.episodes.filter((episode) => episode.subscriptionId === sub?.id)
    expect(episode?.guid).toBe("long-list-22")
    expect(imported.episodes.filter((episode) => episode.subscriptionId === sub?.id)).toHaveLength(
      1
    )

    await page.getByRole("button", { name: "Subscribe to Long listening" }).click()
    await expect(page.getByRole("button", { name: "Subscribed to Long listening" })).toBeVisible()
    const subscribed = await catalogue()
    expect(
      subscribed.episodes.filter(
        (item) => item.subscriptionId === sub?.id && item.guid === episode?.guid
      )
    ).toEqual([episode])
    await page.getByRole("button", { name: "Subscribed to Long listening" }).click()
    await page.getByRole("button", { name: "Unsubscribe", exact: true }).click()
    await expect(page.getByRole("button", { name: "Subscribe to Long listening" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Long listening", level: 1 })).toBeVisible()
    await page.getByRole("link", { name: "Add Podcasts", exact: true }).click()
    await expect(
      sheet.getByRole("searchbox", { name: "Podcast Name or Feed Address" })
    ).toHaveValue(feedUrl)
    await close(app)
  } finally {
    demo.stop()
  }
})
