import { createHash } from "node:crypto"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { defineConfig, devices } from "@playwright/test"

// Browser tests run against the production build (vite preview), since the service
// worker only exists there. Artifacts stay out of the repo.
// Each checkout (a worktree too) gets its own preview port and results folder, so two
// suites running at once never test each other's build or overwrite each other's files.
const checkout = createHash("sha256")
  .update(import.meta.dirname)
  .digest("hex")
  .slice(0, 8)
const port = 4200 + (Number.parseInt(checkout, 16) % 700)

export default defineConfig({
  testDir: "e2e",
  outputDir: join(tmpdir(), `podlist-playwright-${checkout}`, "results"),
  reporter: [["list"]],
  // Each test starts its own demo server; more at once than this starves them of time.
  workers: process.env.CI ? 2 : 3,
  // A reload under that load can take a few seconds to reopen the local database.
  expect: { timeout: 10_000 },
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true
  }
})
