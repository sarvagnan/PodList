import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      "packages/domain",
      "packages/api",
      "packages/server",
      "packages/web",
      "packages/desktop"
    ]
  }
})
