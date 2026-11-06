import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { Filter } from "lucide-react"
import { viewCountsAtom } from "../../app/data.ts"
import { stateAtom } from "../../app/runtime.ts"
import { EmptyState, ListRow } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { describeView } from "../../lib/viewSummary.ts"

export const Route = createFileRoute("/views/")({ component: ViewsList })

function ViewsList() {
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const views = state?.views ?? []
  const counts = AsyncResult.getOrElse(
    useAtomValue(viewCountsAtom),
    () => new Map<string, number>()
  )
  return (
    <>
      <PageHeader title="Views" />
      {views.length === 0 ? (
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
