import { Toast } from "@base-ui/react/toast"
import { RegistryProvider } from "@effect/atom-react"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClientGate, localClient } from "#client"
import { lastScreen } from "./lib/remembered.ts"
import { routeTree } from "./routeTree.gen.ts"
import "./index.css"

// A new screen starts at the top; lists restore their own position (lib/scrollMemory.ts).
const router = createRouter({ routeTree })
router.subscribe("onResolved", ({ toLocation }) =>
  lastScreen.set(toLocation.pathname + (toLocation.searchStr ?? ""))
)

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Retire the old PWA when this entry point is reached. The old /sw.js URL also
// serves a retirement worker so cached installations can reach the new build.
if (!localClient && "serviceWorker" in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()))
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name === "artwork" || name.startsWith("workbox-"))
          .map((name) => caches.delete(name))
      )
    })
    .catch(() => {})
}

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element")

createRoot(root).render(
  <StrictMode>
    <ClientGate>
      <RegistryProvider>
        <Toast.Provider limit={1}>
          <RouterProvider router={router} />
        </Toast.Provider>
      </RegistryProvider>
    </ClientGate>
  </StrictMode>
)
