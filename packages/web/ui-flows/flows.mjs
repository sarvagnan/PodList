// UI flow runs for grading against ~/Documents/UI_Guidelines (CRITIQUE.md § Flow run).
// Runs the main tasks on fixed demo data at the phone, zoomed-desktop and desktop
// widths, and records, per step: core element boxes and their change, whether the
// person caused the step, focus, scroll, and a screenshot. Late arrivals are held for a
// known time so they show as their own step. Writes, under the output folder:
//   measurements.json   one row per flow, width and step
//   summary.md          FLOW-01/02 failures and timed-run response times
//   strips/<flow>/<width>/NN-step.png, and contact-<flow>.png per flow
//
//   pnpm --filter @podlist/web build && node ui-flows/flows.mjs [outDir]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"
import { startDemo } from "./demo.mjs"

const out = process.argv[2] ?? `/tmp/podlist-ui/${new Date().toISOString().replace(/[:.]/g, "-")}`
const holdMillis = 2000
const tolerance = 2

const widths = [
  {
    name: "phone",
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  { name: "zoomed", viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 },
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }
]

/** Core elements by role and name: heading, navigation, the player, the main action. */
const core = {
  heading: (page) => page.getByRole("heading", { level: 1 }),
  navigation: (page) =>
    page
      .getByRole("navigation", { name: "Sections" })
      .or(page.getByRole("navigation", { name: "Library and lists" })),
  player: (page) => page.getByRole("region", { name: "Now playing" }),
  mainAction: (page) => page.getByRole("button", { name: /^(Play this|Use here)$/ })
}

const rows = []
const failures = []
const timings = []

const box = async (locator) => {
  const visible = locator.filter({ visible: true }).first()
  if ((await visible.count()) === 0) return null
  const b = await visible.boundingBox()
  return (
    b && {
      x: Math.round(b.x),
      y: Math.round(b.y),
      width: Math.round(b.width),
      height: Math.round(b.height)
    }
  )
}

const settle = async (page) => {
  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(300)
}

class Recorder {
  constructor(page, flow, width) {
    this.page = page
    this.flow = flow
    this.width = width
    this.n = 0
    this.previous = null
    this.dir = join(out, "strips", flow, width.name)
    mkdirSync(this.dir, { recursive: true })
  }

  /** Runs an action (a click, or a wait for a late arrival), then measures. */
  async step(label, action, { caused = true, wait = settle } = {}) {
    const page = this.page
    if (action) await action(page)
    await wait(page)
    const elements = {}
    for (const [name, locate] of Object.entries(core)) elements[name] = await box(locate(page))
    // Focus is compared by element, not by its label: a button that changes its words
    // (Play to Pause) still holds focus.
    const { focus, focusId } = await page.evaluate(() => {
      const e = document.activeElement
      if (!e || e === document.body) return { focus: null, focusId: null }
      window.__focusIds = window.__focusIds ?? new WeakMap()
      const ids = window.__focusIds
      if (!ids.has(e)) {
        window.__nextFocusId = (window.__nextFocusId ?? 0) + 1
        ids.set(e, window.__nextFocusId)
      }
      const name = e.getAttribute("aria-label") ?? e.textContent?.trim().slice(0, 40) ?? ""
      return {
        focus: `${e.tagName.toLowerCase()}${e.getAttribute("role") ? `[role=${e.getAttribute("role")}]` : ""} "${name}"`,
        focusId: ids.get(e)
      }
    })
    const scroll = await page.evaluate(() => ({ x: Math.round(scrollX), y: Math.round(scrollY) }))
    const n = ++this.n
    const file = join(
      this.dir,
      `${String(n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`
    )
    await page.screenshot({ path: file })

    const moves = {}
    if (this.previous) {
      for (const [name, b] of Object.entries(elements)) {
        const before = this.previous.elements[name]
        if (b && before) moves[name] = { dx: b.x - before.x, dy: b.y - before.y }
      }
    }
    const row = {
      flow: this.flow,
      width: this.width.name,
      step: n,
      label,
      caused,
      url: new URL(page.url()).pathname,
      elements,
      moves,
      focus,
      focusId,
      scroll,
      screenshot: file
    }
    rows.push(row)
    if (!caused && this.previous) {
      for (const [name, m] of Object.entries(moves)) {
        if (Math.abs(m.dx) > tolerance || Math.abs(m.dy) > tolerance) {
          failures.push(
            `FLOW-01 ${this.flow}/${this.width.name} step ${n} "${label}": ${name} moved ${m.dx},${m.dy} px unprompted`
          )
        }
      }
      if (focusId !== this.previous.focusId) {
        failures.push(
          `FLOW-02 ${this.flow}/${this.width.name} step ${n} "${label}": focus ${this.previous.focus} → ${focus} unprompted`
        )
      }
      if (scroll.y !== this.previous.scroll.y) {
        failures.push(
          `FLOW-02 ${this.flow}/${this.width.name} step ${n} "${label}": scrolled ${this.previous.scroll.y} → ${scroll.y} unprompted`
        )
      }
    }
    this.previous = row
  }
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

const flows = {
  /** Finding your way: Views, Playlists, a Playlist's Entries, Library. */
  browse: async (rec) => {
    await rec.step("open", (p) => p.goto("/views"))
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
    await rec.step("open Default", (p) => p.goto("/playlists/default"))
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
    await rec.step("open Default", (p) => p.goto("/playlists/default"))
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
    await rec.step("open Default", (p) => p.goto("/playlists/default"), {
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
    await rec.page.goto("/views")
    await rec.page.getByRole("heading", { name: "Views" }).waitFor()
    const second = await context.newPage()
    const other = new Recorder(second, "second tab", rec.width)
    await other.step("open in a second tab", (p) => p.goto("/views"), {
      wait: (p) => p.getByRole("button", { name: "Use here" }).waitFor()
    })
    await other.step("use here", (p) => p.getByRole("button", { name: "Use here" }).click(), {
      wait: (p) => p.getByRole("heading", { name: "Views" }).waitFor()
    })
    await rec.step("first tab after takeover", null, {
      caused: false,
      wait: (p) => p.getByRole("button", { name: "Use here" }).waitFor()
    })
  }
}

const newContext = (browser, base, width) =>
  browser.newContext({
    baseURL: base,
    serviceWorkers: "block",
    viewport: width.viewport,
    deviceScaleFactor: width.deviceScaleFactor,
    isMobile: width.isMobile ?? false,
    hasTouch: width.hasTouch ?? false,
    colorScheme: "light"
  })

/** Response times at the desktop width, without held responses (RESP checks). */
const timed = async (browser, base) => {
  const width = widths.find((w) => w.name === "desktop")
  const samples = { "open a Playlist": [], "Play from here": [] }
  for (let run = 0; run < 6; run++) {
    const context = await newContext(browser, base, width)
    const page = await context.newPage()
    await page.goto("/views")
    await page.getByRole("heading", { name: "Views" }).waitFor()
    await settle(page)
    let t = performance.now()
    await page
      .getByRole("navigation", { name: "Library and lists" })
      .getByRole("link", { name: /^Workshop/ })
      .click()
    await page.getByRole("heading", { name: "Workshop", level: 1 }).waitFor()
    samples["open a Playlist"].push(performance.now() - t)
    await settle(page)
    t = performance.now()
    await page
      .getByRole("button", { name: /from here$/ })
      .first()
      .click()
    await page
      .getByRole("region", { name: "Now playing" })
      .filter({ visible: true })
      .getByRole("button", { name: "Pause", exact: true })
      .waitFor()
    samples["Play from here"].push(performance.now() - t)
    await context.close()
  }
  for (const [step, values] of Object.entries(samples)) {
    // The first run warms caches; it isn't one of the five measured runs.
    const measured = values.slice(1).sort((a, b) => a - b)
    const p75 = measured[Math.ceil(measured.length * 0.75) - 1]
    timings.push({ step, p75: Math.round(p75), runs: measured.map(Math.round) })
  }
}

const contactSheet = async (browser, flow) => {
  const groups = widths.map((w) => {
    const shots = rows.filter((r) => r.flow === flow && r.width === w.name)
    return `<section><h2>${w.name} ${w.viewport.width}×${w.viewport.height}</h2><div class="row">${shots
      .map(
        (r) =>
          `<figure><img src="data:image/png;base64,${readFileSync(r.screenshot).toString("base64")}" style="width:${w.name === "desktop" ? 520 : 260}px"><figcaption>${r.step}. ${r.label}${r.caused ? "" : " (unprompted)"}</figcaption></figure>`
      )
      .join("")}</div></section>`
  })
  const page = await browser.newPage({ viewport: { width: 1800, height: 600 } })
  await page.setContent(
    `<style>body{font:13px system-ui;margin:16px;background:#fff}h1{font-size:18px}h2{font-size:14px;margin:12px 0 6px}.row{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}figure{margin:0}img{border:1px solid #ccc;display:block}figcaption{margin-top:4px;color:#444}</style><h1>${flow}</h1>${groups.join("")}`
  )
  await page.waitForLoadState("load")
  await page.screenshot({
    path: join(out, `contact-${flow.replace(/ /g, "-")}.png`),
    fullPage: true
  })
  await page.close()
}

const demo = await startDemo()
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] })
try {
  for (const [flow, run] of Object.entries(flows)) {
    for (const width of widths) {
      const context = await newContext(browser, demo.base, width)
      const page = await context.newPage()
      await run(new Recorder(page, flow, width), context)
      await context.close()
    }
    await contactSheet(browser, flow)
  }
  await timed(browser, demo.base)
} finally {
  await browser.close()
  demo.stop()
}

writeFileSync(join(out, "measurements.json"), JSON.stringify(rows, null, 2))
const summary = [
  `# PodList flow run`,
  ``,
  `Flows: ${Object.keys(flows).join(", ")}. Widths: ${widths.map((w) => `${w.name} ${w.viewport.width}×${w.viewport.height}`).join(", ")}. Light appearance (dark isn't designed). Late arrivals held ${holdMillis} ms. Service workers blocked.`,
  ``,
  `## Stability failures`,
  ``,
  ...(failures.length ? failures.map((f) => `- ${f}`) : ["None."]),
  ``,
  `## Timed runs (desktop, 5 runs after a warm-up, no throttling, ${process.platform} ${process.arch})`,
  ``,
  `| Step | p75 ms | Runs |`,
  `|---|---:|---|`,
  ...timings.map((t) => `| ${t.step} | ${t.p75} | ${t.runs.join(", ")} |`)
].join("\n")
writeFileSync(join(out, "summary.md"), `${summary}\n`)
console.log(summary)
console.log(`\nOutput: ${out}`)
