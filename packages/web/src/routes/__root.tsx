import { createRootRoute } from "@tanstack/react-router"
import { AppShell } from "../components/shell/AppShell.tsx"

export const Route = createRootRoute({ component: AppShell })
