/// <reference lib="dom" />
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { cpus, totalmem } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, type Locator } from "@playwright/test"

const iterations = 5
const warmups = 3
const timeout = 30_000
const episodeTitle = "Who sets the price of rice?"
const labels = {
  sidebar: "Sidebar → New this week Episode list",
  inspectorOpens: "Select Episode → Episode Inspector (pane opens)",
  inspector: "Select Episode → Episode Inspector (pane stays open)",
  playlist: "New Playlist button → dialog",
  settings: "Settings sidebar link → Settings page",
  filter: "Final e in rice → filtered Episode list"
}
type Step = keyof typeof labels
type Result = { ms: number } | { error: string }
type ExpectedResult = { selector: string; text: string; query?: string }
type Input = { type: "pointerdown" } | { type: "keydown"; key: string }

declare global {
  interface Window {
    podlistResponseTiming?: Promise<Result>
  }
}

async function measure(target: Locator, input: Input, expected: ExpectedResult): Promise<number> {
  // Arm before driving the input. The renderer owns both clocks and the result check.
  await target.evaluate(
    (element, { input, expected, timeout }) => {
      const resultElement = () => {
        if (expected.query && new URLSearchParams(location.search).get("q") !== expected.query)
          return undefined
        return [...document.querySelectorAll<HTMLElement>(expected.selector)].find(
          (node) => node.textContent?.trim() === expected.text
        )
      }
      if (resultElement()) throw new Error(`Result present before input: ${expected.text}`)
      window.podlistResponseTiming = new Promise((resolve) => {
        const listener = new AbortController()
        let frameRequest = 0
        let appeared: number | undefined
        let started: number | undefined
        const finish = (result: Result) => {
          listener.abort()
          observer.disconnect()
          cancelAnimationFrame(frameRequest)
          clearTimeout(deadline)
          resolve(result)
        }
        const onFrame = (timestamp: number) => {
          frameRequest = 0
          const result = resultElement()
          if (!result) {
            appeared = undefined
            if (expected.query) frameRequest = requestAnimationFrame(onFrame)
            return
          }
          appeared ??= performance.now()
          const rect = result.getBoundingClientRect()
          const visible =
            document.visibilityState === "visible" &&
            result.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < innerHeight &&
            rect.left < innerWidth
          // rAF runs before paint and can carry an earlier frame time. Require a
          // timestamp after observation and a result the frame can actually draw.
          if (visible && timestamp > appeared && started !== undefined && timestamp >= started)
            finish({ ms: timestamp - started })
          else frameRequest = requestAnimationFrame(onFrame)
        }
        const observer = new MutationObserver(() => {
          if (!resultElement()) {
            appeared = undefined
            return
          }
          appeared ??= performance.now()
          if (!frameRequest) frameRequest = requestAnimationFrame(onFrame)
        })
        const deadline = setTimeout(() => {
          finish({
            error:
              started === undefined
                ? `No ${input.type} reached the expected control`
                : `No eligible frame showed ${expected.text}`
          })
        }, timeout)
        window.addEventListener(
          input.type,
          (event) => {
            if (!event.isTrusted || !event.composedPath().includes(element)) return
            if (input.type === "keydown") {
              if (!(event instanceof KeyboardEvent) || event.key !== input.key || event.repeat)
                return
            } else if (!(event instanceof PointerEvent) || event.button !== 0) return
            started = event.timeStamp
            listener.abort()
            observer.observe(document.body, {
              attributes: true,
              characterData: true,
              childList: true,
              subtree: true
            })
            // A new Search URL can reuse an identical set of rows without mutating the DOM.
            if (expected.query) frameRequest = requestAnimationFrame(onFrame)
          },
          { capture: true, signal: listener.signal }
        )
      })
    },
    { input, expected, timeout }
  )
  if (input.type === "pointerdown") await target.click()
  else await target.press(input.key)
  const result = await target.page().evaluate(() => window.podlistResponseTiming)
  assert(result, "Renderer navigated away before returning the timing sample")
  if ("error" in result) throw new Error(result.error)
  return result.ms
}

const run = process.argv[2]
assert(
  process.platform === "darwin" &&
    process.arch === "arm64" &&
    run === "/private/tmp/podlist-uitour-run" &&
    existsSync(join(run, "uitour-vm")),
  "Electron timings require the arm64 Tart guest staging directory"
)
assert(!process.env.ELECTRON_RUN_AS_NODE, "Unset ELECTRON_RUN_AS_NODE before launching Electron")
const origin = readFileSync(join(run, "origin"), "utf8")
assert.match(origin, /^http:\/\/127\.0\.0\.1:[0-9]+$/, "Use the guest's seeded demo server")
const desktop = join(import.meta.dirname, "..")
const executable = join(desktop, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron")
assert(existsSync(executable), "The read-only repo share must contain the installed Electron app")
assert.match(
  execFileSync("/usr/bin/file", ["-b", executable], { encoding: "utf8" }),
  /\barm64\b/,
  "The guest needs the macOS arm64 Electron executable"
)

const samples: Record<Step, number[]> = {
  sidebar: [],
  inspectorOpens: [],
  inspector: [],
  playlist: [],
  settings: [],
  filter: []
}
const systemValue = (command: string, ...args: string[]) =>
  execFileSync(command, args, { encoding: "utf8" }).trim()
const report = () => {
  const model = systemValue("/usr/sbin/sysctl", "-n", "hw.model")
  const version = systemValue("/usr/bin/sw_vers", "-productVersion")
  const build = systemValue("/usr/bin/sw_vers", "-buildVersion")
  return [
    "Appearance: light",
    `VM hardware model: ${model} (${cpus().length} CPUs, ${Math.floor(totalmem() / 2 ** 30)} GiB RAM)`,
    `macOS: Version ${version} (Build ${build})`,
    "Method: renderer input event to the first eligible animation frame in the VM. Ends at the first requestAnimationFrame timestamp after the committed result is detected by a MutationObserver or frame check, with the result visible. The callback is pre-paint.",
    "The first Episode click opens the hidden Inspector. The second click changes its selection with the Inspector already open. Each selected title is the result marker.",
    "New Playlist and Settings use Enter on their sidebar controls. Search uses the separate Library Search page, including its query debounce.",
    "Default window size, local demo Library, p75 by nearest rank. RESP-01 target: p75 ≤ 200 ms over at least five samples.",
    "",
    ...Object.entries(samples).map(([step, values]) => {
      const coverage = `${labels[step as Step]}: samples=${values.length}/${iterations}`
      const sorted = values.toSorted((a, b) => a - b)
      const max = sorted.at(-1)
      const p75 = sorted[Math.ceil(iterations * 0.75) - 1]
      if (max === undefined || p75 === undefined || sorted.length !== iterations)
        return `${coverage}, unobserved (short sample count)`
      return `${coverage}, p75=${p75.toFixed(1)} ms, max=${max.toFixed(1)} ms`
    }),
    ""
  ].join("\n")
}

const app = await electron.launch({
  cwd: desktop,
  args: ["."],
  executablePath: executable,
  colorScheme: null,
  timeout,
  env: {
    ...process.env,
    PODLIST_URL: origin,
    PODLIST_USER_DATA: join(run, "electron-profile"),
    PODLIST_WEB_ROOT: join(desktop, "../web/dist-desktop"),
    PODLIST_HIDDEN_WINDOW: "0"
  }
})
try {
  await app.evaluate(({ nativeTheme }) => {
    nativeTheme.themeSource = "light"
  })
  const page = await app.firstWindow({ timeout })
  page.setDefaultTimeout(timeout)
  page.on("pageerror", (error) => console.error(error))
  const sidebar = page.getByRole("navigation", { name: "Library and lists" })
  const library = sidebar.getByRole("link", { name: "Library", exact: true })
  const subscription = page
    .getByRole("main")
    .getByRole("link", { name: "Market Hours", exact: true })
  const newThisWeek = sidebar.getByRole("link", { name: "New this week", exact: true })
  const weekList = page.getByRole("grid", { name: "New this week Episodes", exact: true })
  const riceEpisode = weekList.getByRole("link", { name: episodeTitle, exact: true })
  const inspector = page.getByRole("complementary", { name: "Episode Inspector", exact: true })
  const playlist = sidebar.getByRole("button", { name: "New Playlist", exact: true })
  const dialog = page.getByRole("dialog", { name: "New Playlist", exact: true })
  const settings = sidebar.getByRole("link", { name: "Settings", exact: true })
  const search = page.getByRole("searchbox", { name: "Search the Library" })
  const mouse = { type: "pointerdown" } as const
  const enter = { type: "keydown", key: "Enter" } as const
  const assertion = { timeout }

  await expect(riceEpisode).toBeVisible(assertion)
  await expect(playlist).toBeEnabled(assertion)
  const window = await app.browserWindow(page)
  await window.evaluate((win) => win.focus())
  await expect
    .poll(() => window.evaluate((win) => win.isVisible() && win.isFocused()), assertion)
    .toBe(true)
  assert(
    await page.evaluate(() => matchMedia("(min-width: 950px)").matches),
    "Electron timings require the default wide layout"
  )

  for (let round = 0; round < warmups + iterations; round += 1) {
    const recording = round >= warmups
    console.log(recording ? `Measured iteration ${round - warmups + 1}` : `Warm-up ${round + 1}`)
    const perform = async (step: Step, target: Locator, input: Input, result: ExpectedResult) => {
      console.log(labels[step])
      const ms = await measure(target, input, result)
      if (recording) samples[step].push(ms)
    }

    await library.click()
    await expect(subscription).toBeVisible(assertion)

    // The Cocoa menu owns Cmd+N and Cmd+,. Use renderer controls to capture keydown.
    await perform("playlist", playlist, enter, {
      selector: '[role="dialog"][data-sheet="dialog"] h2',
      text: "New Playlist"
    })
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(dialog).toBeHidden(assertion)

    await perform("settings", settings, enter, { selector: "main h1", text: "Settings" })
    await library.click()
    await expect(subscription).toBeVisible(assertion)

    await perform("sidebar", newThisWeek, mouse, {
      selector: '[role="grid"][aria-label="New this week Episodes"] [data-episode-title]',
      text: episodeTitle
    })
    await expect(inspector).toBeHidden(assertion)
    await perform("inspectorOpens", riceEpisode, mouse, {
      selector: "#episode-inspector article h2",
      text: episodeTitle
    })
    await expect(inspector.getByRole("heading", { name: episodeTitle, exact: true })).toBeVisible(
      assertion
    )
    const second = weekList.locator("[data-episode-title]").nth(1)
    const title = (await second.textContent())?.trim()
    assert(title && title !== episodeTitle, "The second Episode must have a different title")
    await perform("inspector", second, mouse, {
      selector: "#episode-inspector article h2",
      text: title
    })
    await second.press("Escape")
    await expect(inspector).toBeHidden(assertion)

    await sidebar.locator('a[href="/search"]').click()
    await expect(search).toHaveValue("", assertion)
    await search.pressSequentially("ric")
    await expect(search).toHaveValue("ric", assertion)
    await perform(
      "filter",
      search,
      { type: "keydown", key: "e" },
      {
        selector:
          '[role="grid"][aria-label="Search results"][aria-rowcount="1"] [data-episode-title]',
        text: episodeTitle,
        query: "rice"
      }
    )
    await search.fill("")
    await expect(page).toHaveURL(/\/search$/, assertion)
  }
} finally {
  try {
    await app.close()
  } finally {
    writeFileSync(join(run, "timings.txt"), report())
  }
}
