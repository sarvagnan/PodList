// Shared screen walks for web flows and hidden Electron captures. No launch side effects.
export const holdMillis = 2000

export const settle = async (page) => {
  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(300)
}

/** Phone and zoomed widths drill down through lists; the desktop uses the sidebar. */
const openPlaylist = (name) => async (page) => {
  const tabs = page.getByRole("navigation", { name: "Sections" })
  if (await tabs.isVisible()) {
    await tabs.getByRole("link", { name: "Playlists" }).click()
    await page.getByRole("heading", { name: "Playlists", level: 1 }).waitFor()
    await page
      .getByRole("main")
      .getByRole("link", { name: new RegExp(`^${name}`) })
      .click()
  } else {
    await page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: new RegExp(`^${name}`) })
      .click()
  }
  await page.getByRole("heading", { name, level: 1 }).waitFor()
}

/** A control in the visible player (phone mini-player or desktop bar). */
const playerButton = (page, name) =>
  page
    .getByRole("region", { name: "Now playing" })
    .filter({ visible: true })
    .getByRole("button", { name, exact: true })

const holdCatalogue = (page) =>
  page.route("**/api/library/changes**", async (route) => {
    await new Promise((r) => setTimeout(r, holdMillis))
    await route.continue()
  })

export const createFlows = (Recorder, goto = (page, path) => page.goto(path)) => ({
  /** Finding your way: Views, Playlists, a Playlist's Entries, Library. */
  browse: async (rec) => {
    await rec.step("open", (p) => goto(p, "/views"))
    await rec.step("Commute Playlist", openPlaylist("Commute"))
    await rec.step("Default Playlist", openPlaylist("Default"))
    await rec.step("Library", async (p) => {
      const tabs = p.getByRole("navigation", { name: "Sections" })
      if (await tabs.isVisible()) await tabs.getByRole("link", { name: "Library" }).click()
      else await p.getByRole("link", { name: /Library/ }).click()
    })
  },

  /** Listening: play an Entry, pause, skip, then switch to another Playlist. */
  listen: async (rec) => {
    await rec.step("open Default", (p) => goto(p, "/playlists/default"))
    await rec.step("play third Entry", (p) =>
      p
        .getByRole("button", { name: /from here$/ })
        .nth(1)
        .click()
    )
    await rec.step("playing", null, {
      caused: false,
      wait: (p) => playerButton(p, "Pause").waitFor()
    })
    await rec.step("pause", (p) => playerButton(p, "Pause").click())
    await rec.step("forward 30", (p) =>
      p
        .getByRole("button", { name: /^Forward/ })
        .filter({ visible: true })
        .first()
        .click()
    )
    await rec.step("open Commute", openPlaylist("Commute"))
    await rec.step("play this", (p) => p.getByRole("button", { name: "Play this" }).click())
    await rec.step("Commute playing", null, {
      caused: false,
      wait: (p) => playerButton(p, "Pause").waitFor()
    })
  },

  /** Now Playing: open the drawer, go to Up next, play from it, read the Episode, close. */
  "now playing": async (rec) => {
    await rec.step("open Default", (p) => goto(p, "/playlists/default"))
    await rec.step(
      "play an Entry",
      (p) =>
        p
          .getByRole("button", { name: /from here$/ })
          .first()
          .click(),
      {
        wait: (p) => playerButton(p, "Pause").waitFor()
      }
    )
    await rec.step("open the drawer", (p) =>
      p
        .getByRole("button", { name: /^Open Now Playing/ })
        .filter({ visible: true })
        .click()
    )
    await rec.step("Up next", async (p) => {
      const dialog = p.getByRole("dialog")
      const page = dialog.getByRole("button", { name: /^Up next/ })
      if (await page.isVisible()) await page.click()
    })
    await rec.step("play from Up next", (p) =>
      p
        .getByRole("dialog")
        .getByRole("button", { name: /from here$/ })
        .last()
        .click()
    )
    await rec.step("Episode page", (p) =>
      p.getByRole("dialog").getByRole("button", { name: "Episode" }).click()
    )
    await rec.step("close", (p) => p.getByRole("button", { name: "Close Now Playing" }).click())
  },

  /** A fresh Device whose catalogue arrives 2 s after its State. */
  "fresh device": async (rec) => {
    await holdCatalogue(rec.page)
    await rec.step("open Default", (p) => goto(p, "/playlists/default"), {
      wait: (p) => p.getByRole("heading", { name: "Default", level: 1 }).waitFor()
    })
    await rec.step("catalogue arrives", null, {
      caused: false,
      wait: async (p) => {
        await p.waitForTimeout(holdMillis + 500)
        await settle(p)
      }
    })
  },

  /** A second tab offers to take over the local database. */
  "second tab": async (rec, context) => {
    await goto(rec.page, "/views")
    await rec.page.locator("main h1").waitFor()
    const second = await context.newPage()
    const other = new Recorder(second, "second tab", rec.width)
    await other.step("open in a second tab", (p) => goto(p, "/views"), {
      wait: (p) => p.getByRole("button", { name: "Use here" }).waitFor()
    })
    await other.step("use here", (p) => p.getByRole("button", { name: "Use here" }).click(), {
      wait: (p) => p.locator("main h1").waitFor()
    })
    await rec.step("first tab after takeover", null, {
      caused: false,
      wait: (p) => p.getByRole("button", { name: "Use here" }).waitFor()
    })
  }
})
