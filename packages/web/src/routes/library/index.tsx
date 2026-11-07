import { useAtomValue } from "@effect/atom-react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { ChevronRight, Plus, Settings } from "lucide-react"
import { useState } from "react"
import { subscriptionsAtom } from "../../app/data.ts"
import { useLibraryReady } from "../../app/hooks.ts"
import { AddPodcastSheet } from "../../components/library/AddPodcastSheet.tsx"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

// The Library (docs/design/ui-layout.md › Library and Subscriptions): every Subscription,
// each opening its settings and Episodes; Add finds podcasts, takes a feed address or an
// OPML file. Grouping by Download Rule arrives with Download Rules (pod-g1v.5).

export const Route = createFileRoute("/library/")({ component: LibraryScreen })

function LibraryScreen() {
  const result = useAtomValue(subscriptionsAtom)
  const subscriptions = AsyncResult.getOrElse(result, () => [])
  const ready = useLibraryReady()
  const [adding, setAdding] = useState(false)
  const add = (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-row font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
    >
      <Plus aria-hidden="true" className="size-4" />
      Add podcasts
    </button>
  )
  return (
    <>
      <PageHeader
        title="Library"
        {...(subscriptions.length > 0
          ? {
              subtitle: `${subscriptions.length} ${subscriptions.length === 1 ? "Subscription" : "Subscriptions"}`
            }
          : {})}
        actions={
          <div className="flex items-center gap-2">
            {/* The phone has no sidebar: Settings lives here. */}
            <Link
              to="/settings"
              aria-label="Settings"
              className="grid size-11 place-items-center rounded-full bg-secondary hover:bg-input active:bg-input/70 md:hidden"
            >
              <Settings aria-hidden="true" className="size-5" />
            </Link>
            {add}
          </div>
        }
      />
      {AsyncResult.isInitial(result) || (subscriptions.length === 0 && !ready) ? (
        <LoadingRows label="Loading your Library" />
      ) : subscriptions.length === 0 ? (
        <EmptyState title="No Subscriptions yet">
          Add podcasts by name, by feed address, or from another app’s OPML file. Their Episodes
          then appear in your Views.
        </EmptyState>
      ) : (
        <ul className="max-w-[960px] px-3 md:px-6">
          {subscriptions.map((s) => (
            <li key={s.id} className="border-b last:border-b-0">
              <Link
                to="/library/$subscriptionId"
                params={{ subscriptionId: s.id }}
                className="flex min-h-16 items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-secondary/60"
              >
                <Artwork url={s.artworkUrl} name={s.title} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-row font-medium">{s.title}</span>
                  {s.author && (
                    <span className="mt-0.5 block truncate text-small text-muted-foreground">
                      {s.author}
                    </span>
                  )}
                </span>
                <span className="text-small whitespace-nowrap text-muted-foreground">
                  {s.unplayed} unplayed
                </span>
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {adding && <AddPodcastSheet open={adding} onOpenChange={setAdding} />}
    </>
  )
}
