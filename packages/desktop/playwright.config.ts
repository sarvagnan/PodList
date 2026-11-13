import { defineConfig } from "@playwright/test"

// Keep fixture Episodes in relative-date Views as the calendar advances (as in packages/web).
process.env.PODLIST_TEST_DEMO_NOW ??= String(Date.now())

// The Mac app against a seeded demo server (packages/web/ui-flows/demo.mjs), using the
// current web build in packages/web/dist. macOS only; not part of CI.
export default defineConfig({
  testDir: "test",
  outputDir: "/tmp/podlist-playwright/desktop",
  reporter: [["list"]],
  workers: 1,
  timeout: 60_000
})
