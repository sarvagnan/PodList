import { registerSW } from "virtual:pwa-register"
import { RegistryProvider } from "@effect/atom-react"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { TabGate } from "./app/TabGate.tsx"
import { routeTree } from "./routeTree.gen.ts"
import "./index.css"

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Keep the installed app current: a new service worker activates on the next load.
registerSW({ immediate: true })

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element")

createRoot(root).render(
  <StrictMode>
    <TabGate>
      <RegistryProvider>
        <RouterProvider router={router} />
      </RegistryProvider>
    </TabGate>
  </StrictMode>
)
