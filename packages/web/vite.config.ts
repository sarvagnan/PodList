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
                source: `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name === "artwork" || name.startsWith("workbox-")).map((name) => caches.delete(name)));
  await self.registration.unregister();
  for (const client of await self.clients.matchAll({ type: "window" })) await client.navigate(client.url);
})()));`
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
