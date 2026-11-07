import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { Filter } from "lucide-react"
import { useEffect } from "react"
import { viewCountsAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady } from "../../app/hooks.ts"
import { EmptyState, ListRow, LoadingRows } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { describeView } from "../../lib/viewSummary.ts"

export const Route = createFileRoute("/views/")({ component: ViewsList })

/** Wide screens list Views in the sidebar already, so the main area shows the first one. */
const wide = () => window.matchMedia("(min-width: 48rem)").matches

function ViewsList() {
  const state = useAppState()
  const ready = useLibraryReady()
  const navigate = Route.useNavigate()
  const views = state?.views ?? []
  const first = views[0]?.id
  useEffect(() => {
    if (first !== undefined && wide()) {
      void navigate({ to: "/views/$viewId", params: { viewId: first }, replace: true })
    }
  }, [first, navigate])
  const counts = AsyncResult.getOrElse(
    useAtomValue(viewCountsAtom),
    () => new Map<string, number>()
  )
  return (
    <>
      <PageHeader title="Views" />
      {state === null || (views.length === 0 && !ready) ? (
        <LoadingRows label="Loading Views" />
      ) : views.length === 0 ? (
        <EmptyState title="No Views yet">
          A View is a saved filter over your Library, such as new episodes this week.
        </EmptyState>
      ) : (
        <div className="px-3 md:px-6">
          {views.map((v) => (
            <ListRow
              key={v.id}
              link={{ to: "/views/$viewId", params: { viewId: v.id } }}
              icon={<Filter aria-hidden="true" className="size-5" />}
              title={v.name}
              lines={[describeView(v)]}
              trailing={counts.has(v.id) ? String(counts.get(v.id)) : undefined}
            />
          ))}
        </div>
      )}
    </>
  )
}
