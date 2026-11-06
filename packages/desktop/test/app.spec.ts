import { spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { _electron as electron, expect, test } from "@playwright/test"
// @ts-expect-error: a plain .mjs helper shared with the web flow runs
import { startDemo } from "../../web/ui-flows/demo.mjs"

const appDir = join(import.meta.dirname, "..")
/** Outside Electron, the electron package exports the path to its binary. */
const electronBinary = createRequire(import.meta.url)("electron") as string
const environment = (env: Record<string, string>) => ({
  ...(process.env as Record<string, string>),
  ...env
})
const launch = (env: Record<string, string>) =>
  electron.launch({ args: ["."], cwd: appDir, env: environment(env) })

test("runs the web app with its local database, and opens offline after the first visit", async () => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const app = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    const sidebar = page.getByRole("navigation", { name: "Library and lists" })
    await expect(page.getByRole("heading", { name: "Views", level: 1 })).toBeVisible()
    // Synced into SQLite on OPFS inside Electron.
    await expect(sidebar.getByRole("link", { name: /^Commute/ })).toBeVisible()
    await page.evaluate("navigator.serviceWorker.ready.then(() => true)")
    await app.close()

    demo.stop()
    const offline = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    const again = await offline.firstWindow()
    await expect(again.getByRole("heading", { name: "Views", level: 1 })).toBeVisible()
    await expect(
      again
        .getByRole("navigation", { name: "Library and lists" })
        .getByRole("link", { name: /^Commute/ })
    ).toBeVisible()
    await offline.close()
  } finally {
    demo.stop()
  }
})

test("asks for the server address on first launch and checks it answers", async () => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const app = await launch({ PODLIST_USER_DATA: profile })
    const page = await app.firstWindow()
    await expect(
      page.getByRole("heading", { name: "Connect to your PodList server" })
    ).toBeVisible()
    const address = page.getByRole("textbox", { name: "Server address" })
    await expect(address).toBeFocused()
    await address.fill("127.0.0.1:1")
    await page.getByRole("button", { name: "Connect" }).click()
    await expect(page.getByRole("alert")).toContainText("Couldn't reach 127.0.0.1:1")
    await address.fill(demo.base)
    await page.getByRole("button", { name: "Connect" }).click()
    await expect(page.getByRole("heading", { name: "Views", level: 1 })).toBeVisible()
    await app.close()
  } finally {
    demo.stop()
  }
})

test("a second launch hands over to the open window", async () => {
  const demo = await startDemo()
  const profile = mkdtempSync(join(tmpdir(), "podlist-desktop-"))
  try {
    const first = await launch({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    await (await first.firstWindow()).getByRole("heading", { name: "Views", level: 1 }).waitFor()
    const second = spawn(electronBinary, ["."], {
      cwd: appDir,
      env: environment({ PODLIST_URL: demo.base, PODLIST_USER_DATA: profile })
    })
    const code = await new Promise<number | null>((resolve) => second.once("exit", resolve))
    expect(code).toBe(0)
    expect(first.windows()).toHaveLength(1)
    await first.close()
  } finally {
    demo.stop()
  }
})
