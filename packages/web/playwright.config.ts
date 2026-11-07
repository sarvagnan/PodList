import { defineConfig, devices } from "@playwright/test"

// Browser tests run against the production build (vite preview), since the service
// worker only exists there. Artifacts stay out of the repo.
export default defineConfig({
  testDir: "e2e",
  outputDir: "/tmp/podlist-playwright/results",
  reporter: [["list"]],
  // Each test starts its own demo server; more at once than this starves them of time.
  workers: process.env.CI ? 2 : 4,
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true
  }
})
