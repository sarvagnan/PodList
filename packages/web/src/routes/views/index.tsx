import { useAtomValue } from "@effect/atom-react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { Plus, Search } from "lucide-react"
import { useEffect } from "react"
import { viewCountsAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady } from "../../app/hooks.ts"
import { EmptyState, ListRow, LoadingRows } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { useViewActions } from "../../components/views/useViewActions.ts"
import { describeView } from "../../lib/viewSummary.ts"

export const Route = createFileRoute("/views/")({ component: ViewsList })

/** Wide screens list Views in the sidebar already, so the main area shows the first one. */
const wide = () => window.matchMedia("(min-width: 44rem)").matches

function ViewsList() {
  const state = useAppState()
  const ready = useLibraryReady()
  const navigate = Route.useNavigate()
  const { create } = useViewActions()
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
      <PageHeader
        title="Views"
        actions={
          <div className="flex items-center gap-1 md:hidden">
            <Link
              to="/search"
              aria-label="Search"
              className="grid size-11 place-items-center rounded-full hover:bg-secondary active:bg-input"
            >
              <Search aria-hidden="true" className="size-5" />
            </Link>
            <button
              type="button"
              onClick={() => void create()}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-4 text-row font-medium hover:bg-input active:bg-input/70"
            >
              <Plus aria-hidden="true" className="size-4" />
              New View
            </button>
          </div>
        }
      />
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
