import adapter from "@sveltejs/adapter-static"
import { sveltekit } from "@sveltejs/kit/vite"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    sveltekit({
      preprocess: vitePreprocess(),
      // Single-page app: the client runs from local data, so there is no server rendering (ADR 0005).
      adapter: adapter({ fallback: "index.html" })
    })
  ]
})
