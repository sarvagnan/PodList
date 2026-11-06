import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { stateAtom } from "../../app/runtime.ts"
import { EmptyState } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

export const Route = createFileRoute("/views/$viewId")({ component: ViewDetail })

function ViewDetail() {
  const { viewId } = Route.useParams()
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const view = state?.views.find((v) => v.id === viewId)
  return (
    <>
      <PageHeader title={view?.name ?? "View"} back={{ to: "/views", label: "Views" }} />
      <EmptyState title="Episodes appear here">
        This View's episode list arrives with the Views screen.
      </EmptyState>
    </>
  )
}
