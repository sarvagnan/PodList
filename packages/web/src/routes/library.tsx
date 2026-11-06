import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { subscriptionsAtom } from "../app/data.ts"
import { useLibraryReady } from "../app/hooks.ts"
import { EmptyState, LoadingRows } from "../components/lists/ListRow.tsx"
import { Artwork } from "../components/shell/Artwork.tsx"
import { PageHeader } from "../components/shell/PageHeader.tsx"

export const Route = createFileRoute("/library")({ component: LibraryScreen })

function LibraryScreen() {
  const result = useAtomValue(subscriptionsAtom)
  const subscriptions = AsyncResult.getOrElse(result, () => [])
  const ready = useLibraryReady()
  return (
    <>
      <PageHeader title="Library" />
      {AsyncResult.isInitial(result) || (subscriptions.length === 0 && !ready) ? (
        <LoadingRows label="Loading your Library" />
      ) : subscriptions.length === 0 ? (
        <EmptyState title="No Subscriptions yet">
          Podcasts you subscribe to appear here, with their Episodes in your Views. Subscribing from
          the app arrives with Library settings; until then, subscribe or import OPML on the server.
        </EmptyState>
      ) : (
        <ul className="px-3 md:px-6">
          {subscriptions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 border-b px-2 py-2.5 last:border-b-0">
              <Artwork url={s.artworkUrl} name={s.title} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-row font-medium">{s.title}</span>
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
