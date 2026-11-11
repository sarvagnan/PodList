import { playwright } from "@vitest/browser-playwright"
import { defineProject } from "vitest/config"

// Platform code (SQLite in a worker, OPFS, audio) only works in a real browser, so the
// web package's tests run in headless Chromium.
export default defineProject({
  test: {
    name: "web",
    include: ["src/**/*.test.ts"],
    // Media playback stalls in a test frame that runs alongside others, so files run one at a time.
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] }
      }),
      instances: [{ browser: "chromium" }]
    }
  },
  resolve: {
    alias: { "#client": new URL("./src/data/DesktopClient.tsx", import.meta.url).pathname }
  },
  worker: { format: "es" },
  optimizeDeps: { exclude: ["@effect/wa-sqlite", "@effect/sql-sqlite-wasm"] }
})
