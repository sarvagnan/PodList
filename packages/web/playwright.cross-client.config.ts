import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "e2e",
  testMatch: "cross-client-sync.scenario.ts",
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 60_000 },
  reporter: [["list"]]
})
