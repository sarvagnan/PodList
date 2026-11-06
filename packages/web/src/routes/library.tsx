import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { subscriptionsAtom } from "../app/data.ts"
import { EmptyState } from "../components/lists/ListRow.tsx"
import { Artwork } from "../components/shell/Artwork.tsx"
import { PageHeader } from "../components/shell/PageHeader.tsx"

export const Route = createFileRoute("/library")({ component: LibraryScreen })

function LibraryScreen() {
  const subscriptions = AsyncResult.getOrElse(useAtomValue(subscriptionsAtom), () => [])
  return (
    <>
      <PageHeader title="Library" />
      {subscriptions.length === 0 ? (
        <EmptyState title="No Subscriptions yet">Podcasts you follow appear here.</EmptyState>
      ) : (
        <ul className="px-3 md:px-6">
          {subscriptions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 border-b px-2 py-2.5 last:border-b-0">
              <Artwork url={s.artworkUrl} name={s.title} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{s.title}</span>
                {s.author && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {s.author}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{s.unplayed} unplayed</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
