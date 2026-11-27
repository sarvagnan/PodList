import { Toast } from "@base-ui/react/toast"
import { RegistryProvider } from "@effect/atom-react"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClientGate } from "#client"
import { preserveOverlayScroll } from "./lib/overlayScroll.ts"
import { lastScreen } from "./lib/remembered.ts"
import { routeTree } from "./routeTree.gen.ts"
import "./index.css"

// A new screen starts at the top; lists restore their own position (lib/scrollMemory.ts).
if (import.meta.env.MODE === "desktop") document.documentElement.dataset.podlistDesktop = ""
const router = createRouter({ routeTree })
preserveOverlayScroll(router)
router.subscribe("onResolved", ({ toLocation }) =>
  lastScreen.set(toLocation.pathname + (toLocation.searchStr ?? ""))
)

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

if (import.meta.env.MODE === "desktop" && window.podlistApp?.bringOverSource) {
  const source = () => import("./library/BringOverSource.ts")
  window.podlistBringOverSource = {
    snapshot: () => source().then((module) => module.snapshot()),
    audioInfo: (id) => source().then((module) => module.audioInfo(id)),
    audioChunk: (id, offset, length) =>
      source().then((module) => module.audioChunk(id, offset, length))
  }
} else {
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
}
