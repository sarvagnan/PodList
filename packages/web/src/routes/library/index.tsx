import { useAtomValue } from "@effect/atom-react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { ChevronRight, Plus, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { subscriptionsAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady } from "../../app/hooks.ts"
import { deviceIdAtom } from "../../app/runtime.ts"
import { AddPodcastSheet } from "../../components/library/AddPodcastSheet.tsx"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

// The Library (docs/design/ui-layout.md › Library and Subscriptions): every Subscription,
// each opening its settings and Episodes; Add finds podcasts, takes a feed address or an
// OPML file. Grouping by Download Rule arrives with Download Rules (pod-g1v.5).

export const Route = createFileRoute("/library/")({
  component: LibraryScreen,
  // ?add=true opens Add podcasts (the Mac app's File › Add Podcasts).
  validateSearch: (search: Record<string, unknown>): { add?: boolean } =>
    search.add === true || search.add === "true" ? { add: true } : {}
})

function LibraryScreen() {
  const result = useAtomValue(subscriptionsAtom)
  const subscriptions = AsyncResult.getOrElse(result, () => [])
  const ready = useLibraryReady()
  const [adding, setAdding] = useState(false)
  // ?add=true (File › Add Podcasts in the Mac app) opens the sheet once, then leaves the
  // URL so a reload doesn't open it again.
  const { add: addFromUrl } = Route.useSearch()
  const navigate = Route.useNavigate()
  useEffect(() => {
    if (!addFromUrl) return
    // Clean the URL first: the sheet's Back step must not lead back to ?add=true.
    void navigate({ search: {}, replace: true }).then(() => setAdding(true))
  }, [addFromUrl, navigate])
  const state = useAppState()
  const deviceId = AsyncResult.getOrElse(useAtomValue(deviceIdAtom), () => "")
  const modeOf = (subscriptionId: string) =>
    state?.downloadRules.find((r) => r.subscriptionId === subscriptionId && r.deviceId === deviceId)
      ?.mode ?? "never"
  const groups = (
    [
      ["allNew", "Downloads every new Episode"],
      ["onEntry", "Downloads Entries"],
      ["never", "Streams"]
    ] as const
  ).map(([mode, title]) => ({
    mode,
    title,
    items: subscriptions.filter((s) => modeOf(s.id) === mode)
  }))
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
        // Grouped by what this Device stores for each podcast (design C).
        <div className="max-w-[960px] space-y-5 px-3 md:px-6">
          {groups.map(({ mode, title, items }) =>
            items.length === 0 ? null : (
              <section key={mode} aria-labelledby={`group-${mode}`}>
                <h2
                  id={`group-${mode}`}
                  className="px-2 pb-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
                >
                  {title} · {items.length}
                </h2>
                <ul>
                  {items.map((s) => (
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
              </section>
            )
          )}
        </div>
      )}
      {adding && <AddPodcastSheet open={adding} onOpenChange={setAdding} />}
    </>
  )
}
