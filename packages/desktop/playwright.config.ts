import { join } from "node:path"
import { defineConfig } from "@playwright/test"

// Keep fixture Episodes in relative-date Views as the calendar advances (as in packages/web).
process.env.PODLIST_TEST_DEMO_NOW ??= String(Date.now())

// The Tart runner gives Playwright a writable guest directory outside the checkout.
const guestOutput = process.env.PODLIST_ELECTRON_TEST_OUTPUT

// The Mac app against a seeded demo server, using the prebuilt desktop web bundle.
export default defineConfig({
  testDir: "test",
  testMatch: "**/*.spec.ts",
  outputDir: guestOutput ? join(guestOutput, "test-results") : "/tmp/podlist-playwright/desktop",
  reporter: guestOutput
    ? [["list"], ["html", { outputFolder: join(guestOutput, "playwright-report"), open: "never" }]]
    : [["list"]],
  forbidOnly: guestOutput !== undefined,
  workers: 1,
  timeout: 60_000
})
