import { createRootRoute, Link } from "@tanstack/react-router"
import { EmptyState } from "../components/lists/ListRow.tsx"
import { AppShell } from "../components/shell/AppShell.tsx"
import { PageHeader } from "../components/shell/PageHeader.tsx"

export const Route = createRootRoute({ component: AppShell, notFoundComponent: NotFound })

function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState title="There’s nothing at this address">
        <Link to="/views" className="font-medium text-primary underline underline-offset-2">
          Go to your Views
        </Link>
      </EmptyState>
    </>
  )
}
