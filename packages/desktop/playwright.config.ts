import { defineConfig } from "@playwright/test"

// The Mac app against a seeded demo server (packages/web/ui-flows/demo.mjs), using the
// current web build in packages/web/dist. macOS only; not part of CI.
export default defineConfig({
  testDir: "test",
  outputDir: "/tmp/podlist-playwright/desktop",
  reporter: [["list"]],
  workers: 1,
  timeout: 60_000
})
