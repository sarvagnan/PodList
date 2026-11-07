import { createFileRoute, redirect } from "@tanstack/react-router"
import { lastScreen } from "../lib/remembered.ts"

// Launching the app (or its installed icon) reopens the screen you left (DATA-06).
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const last = lastScreen.get()
    throw last === null ? redirect({ to: "/views" }) : redirect({ href: last })
  }
})
