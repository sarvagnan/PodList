import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      // Icons and head links are generated from public/favicon.svg (pwa-assets.config.ts).
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        id: "/",
        name: "PodList",
        short_name: "PodList",
        description: "Podcasts as Views and Playlists.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F6F5F2",
        theme_color: "#F6F5F2"
      },
      workbox: {
        // Precache the app shell (including the SQLite WASM binary) so the app opens offline.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,wasm,woff2}"],
        navigateFallback: "index.html",
        // Artwork, once seen, shows offline too.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/api/artwork",
            handler: "CacheFirst",
            options: {
              cacheName: "artwork",
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
  }
})
