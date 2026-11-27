import { mkdtempSync } from "node:fs"
import { rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test as base, type ElectronApplication, _electron as electron } from "@playwright/test"

export const appDir = join(import.meta.dirname, "..")
/** Outside Electron, the electron package exports the path to its binary. */
export const electronBinary = createRequire(import.meta.url)("electron") as string
export const environment = (env: Record<string, string>) => ({
  ...(process.env as Record<string, string>),
  ...env
})

type DesktopFixture = {
  launch: (env: Record<string, string>) => Promise<ElectronApplication>
  close: (app: ElectronApplication) => Promise<void>
}

export const test = base.extend<{ desktop: DesktopFixture }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires fixture dependency destructuring.
  desktop: async ({}, use, testInfo) => {
    const evidence = process.env.PODLIST_ELECTRON_TEST_OUTPUT
      ? mkdtempSync(join(tmpdir(), "podlist-electron-evidence-"))
      : undefined
    const apps = new Map<ElectronApplication, { id: number; tracing: boolean }>()
    const attachments: { name: "trace" | "screenshot"; path: string }[] = []
    const diagnosticErrors: string[] = []
    let nextId = 0

    const launch: DesktopFixture["launch"] = async (env) => {
      const app = await electron.launch({
        args: ["."],
        // Electron supplies the native appearance. Playwright otherwise emulates light.
        colorScheme: null,
        cwd: appDir,
        executablePath: electronBinary,
        env: environment(env)
      })
      const session = { id: ++nextId, tracing: false }
      apps.set(app, session)
      if (evidence) {
        try {
          await app.context().tracing.start({ screenshots: true, snapshots: true, sources: true })
          session.tracing = true
        } catch (error) {
          diagnosticErrors.push(`Launch ${session.id} could not start tracing: ${error}`)
        }
      }
      return app
    }

    const close: DesktopFixture["close"] = async (app) => {
      const session = apps.get(app)
      if (!session) return
      apps.delete(app)
      if (evidence) {
        // Electron contexts are outside the runner's browser fixtures. Save evidence before
        // the app closes, then keep it only if the test fails.
        const windows = app.windows()
        if (windows.length === 0)
          diagnosticErrors.push(`Launch ${session.id} had no window to capture`)
        await Promise.all(
          windows.map(async (page, index) => {
            const path = join(evidence, `launch-${session.id}-window-${index + 1}.png`)
            try {
              await page.screenshot({ path, timeout: 5000 })
              attachments.push({ name: "screenshot", path })
            } catch (error) {
              diagnosticErrors.push(`Screenshot ${path}: ${error}`)
            }
          })
        )
        if (session.tracing) {
          const path = join(evidence, `launch-${session.id}-trace.zip`)
          try {
            await app.context().tracing.stop({ path })
            attachments.push({ name: "trace", path })
          } catch (error) {
            diagnosticErrors.push(`Trace ${path}: ${error}`)
          }
        }
      }
      await app.close()
    }

    await use({ launch, close })
    try {
      // A failed assertion can bypass a test's explicit close. Capture that app too.
      const closed = await Promise.allSettled([...apps.keys()].map(close))
      const closeErrors = closed
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason)
      if (testInfo.status !== testInfo.expectedStatus || closeErrors.length > 0) {
        for (const { name, path } of attachments) await testInfo.attach(name, { path })
        const errors = [...diagnosticErrors, ...closeErrors]
        if (errors.length > 0)
          await testInfo.attach("Electron evidence diagnostics", {
            body: errors.join("\n"),
            contentType: "text/plain"
          })
      }
      if (closeErrors.length > 0) throw new AggregateError(closeErrors, "Could not close Electron")
    } finally {
      if (evidence) await rm(evidence, { recursive: true, force: true })
    }
  }
})
