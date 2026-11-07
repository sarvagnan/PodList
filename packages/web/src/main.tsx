import { registerSW } from "virtual:pwa-register"
import { Toast } from "@base-ui/react/toast"
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
// The Mac app carries its own copy (app://), so it has no service worker.
if (location.protocol !== "app:") registerSW({ immediate: true })

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element")

createRoot(root).render(
  <StrictMode>
    <TabGate>
      <RegistryProvider>
        <Toast.Provider limit={1}>
          <RouterProvider router={router} />
        </Toast.Provider>
      </RegistryProvider>
    </TabGate>
  </StrictMode>
)
