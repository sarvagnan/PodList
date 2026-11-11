import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    ...(mode === "desktop"
      ? []
      : [
          {
            name: "retire-pwa",
            generateBundle() {
              this.emitFile({
                type: "asset",
                fileName: "sw.js",
                source: `// Wait for old controlled pages to close before activating. skipWaiting would
// trigger the old vite-pwa autoUpdate listener to reload and lose its JS tail.
// Then pass through to the network; the new page carries over local changes
// before unregistering and clearing caches.
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));`
              })
            }
          } satisfies Plugin
        ])
  ],
  build: { outDir: mode === "desktop" ? "dist-desktop" : "dist" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "#client": fileURLToPath(
        new URL(
          mode === "desktop" ? "./src/data/DesktopClient.tsx" : "./src/data/WebClient.tsx",
          import.meta.url
        )
      )
    }
  }
}))
