import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { SlidersHorizontal, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { viewEpisodesAtom } from "../../app/data.ts"
import { stateAtom } from "../../app/runtime.ts"
import { BulkBar } from "../../components/episodes/BulkBar.tsx"
import { EpisodeDetail } from "../../components/episodes/EpisodeDetail.tsx"
import { EpisodeList } from "../../components/episodes/EpisodeList.tsx"
import { NextLastTarget } from "../../components/episodes/EpisodeRow.tsx"
import { TargetPanel } from "../../components/episodes/TargetPanel.tsx"
import { EmptyState } from "../../components/lists/ListRow.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { useViewActions } from "../../components/views/useViewActions.ts"
import { ViewForm } from "../../components/views/ViewForm.tsx"
import { useMinWidth } from "../../lib/useWide.ts"
import { describeView } from "../../lib/viewSummary.ts"

export const Route = createFileRoute("/views/$viewId")({
  component: ViewDetail,
  // Wide screens show an Episode beside the list; the URL keeps it, and editing, across
  // reloads.
  validateSearch: (search: Record<string, unknown>): { episode?: string; edit?: boolean } => ({
    ...(typeof search.episode === "string" ? { episode: search.episode } : {}),
    ...(search.edit === true || search.edit === "true" ? { edit: true } : {})
  })
})

function ViewDetail() {
  const { viewId } = Route.useParams()
  const { episode: selected, edit: editing = false } = Route.useSearch()
  const navigate = Route.useNavigate()
  const wide = useMinWidth("64rem")
  const { remove } = useViewActions()
  // Desktop bulk selection, kept per View: another View starts with none. Escape clears it.
  const [selection, setSelection] = useState<{
    readonly viewId: string
    readonly ids: ReadonlySet<string>
  }>({ viewId, ids: new Set() })
  const checked: ReadonlySet<string> = selection.viewId === viewId ? selection.ids : new Set()
  const setChecked = (update: (current: ReadonlySet<string>) => ReadonlySet<string>) =>
    setSelection({ viewId, ids: update(checked) })
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const result = useAtomValue(viewEpisodesAtom(viewId))
  const episodes = AsyncResult.getOrElse(result, () => [])
  const view = state?.views.find((v) => v.id === viewId)

  const open = (episodeId: string) => navigate({ search: { episode: episodeId } })
  // Closing the panel puts focus back on the row it showed (WKEY-03).
  const closePanel = () => {
    const shown = selected
    void navigate({ search: {} }).then(() =>
      document.querySelector<HTMLElement>(`[data-episode-title="${shown}"]`)?.focus()
    )
  }
  const startEditing = () => void navigate({ search: { edit: true } })
  const doneEditing = () =>
    void navigate({ search: {} }).then(() =>
      document.querySelector<HTMLElement>("[data-edit-view]")?.focus()
    )
  // Esc, wherever focus is in the View: clears the ticks, then closes the panel or editor.
  const onEscape = useRef(() => {})
  onEscape.current = () => {
    if (checked.size > 0) setSelection({ viewId, ids: new Set() })
    else if (editing) doneEditing()
    else if (selected) closePanel()
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      // A dialog or menu takes its own Esc.
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      onEscape.current()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  if (state === null) return null
  if (view === undefined) {
    return (
      <>
        <PageHeader title="View" back={{ to: "/views", label: "Views" }} />
        <EmptyState title="This View no longer exists">
          It was deleted on another Device.
        </EmptyState>
      </>
    )
  }
  const loading = AsyncResult.isInitial(result)
  const count = `${episodes.length} ${episodes.length === 1 ? "Episode" : "Episodes"}`
  const form = <ViewForm key={view.id} view={view} onDelete={() => void remove(view)} />

  // Phone and narrow windows: the editor is a screen of its own, with a live count.
  if (editing && !wide) {
    return (
      <>
        <PageHeader
          title="Edit View"
          subtitle={`Matches ${count} now`}
          actions={
            <button
              type="button"
              onClick={doneEditing}
              className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-row font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
            >
              Done
            </button>
          }
        />
        <div className="mx-auto max-w-xl px-4 pb-8">{form}</div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={view.name}
        back={{ to: "/views", label: "Views" }}
        subtitle={loading ? describeView(view) : `${count} · ${describeView(view)}`}
        actions={
          checked.size > 0 ? (
            <BulkBar selected={[...checked]} onClear={() => setChecked(() => new Set())} />
          ) : (
            <div className="flex items-center gap-3">
              <NextLastTarget />
              {!editing && (
                <button
                  type="button"
                  data-edit-view=""
                  onClick={startEditing}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-secondary px-4 text-row font-medium hover:bg-input active:bg-input/70"
                >
                  <SlidersHorizontal aria-hidden="true" className="size-4" />
                  Edit<span className="max-md:sr-only"> View</span>
                </button>
              )}
            </div>
          )
        }
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px]">
        {!loading && episodes.length === 0 ? (
          <EmptyState title="No Episodes match this View">
            {editing
              ? "Set a row back to “Any” to widen it."
              : "New Episodes appear here as your podcasts publish them."}
          </EmptyState>
        ) : (
          <EpisodeList
            episodes={episodes}
            label={`${view.name} Episodes`}
            ready={!loading}
            selected={selected}
            onOpen={open}
            checked={checked}
            setChecked={setChecked}
          />
        )}
        {/* Beside the list: the editor, the open Episode, or where Next and Last go. */}
        <aside
          aria-label={editing ? "Edit View" : selected ? "Episode" : "Next and Last go to"}
          className="sticky top-0 hidden max-h-dvh self-start overflow-y-auto border-l pt-2 pb-28 lg:block"
        >
          {editing ? (
            <div className="px-4 pt-2">
              <div className="flex items-center justify-between pb-3">
                <h2 className="font-heading text-xl font-semibold">Edit View</h2>
                <button
                  type="button"
                  onClick={doneEditing}
                  className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-row font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                >
                  Done
                </button>
              </div>
              {form}
            </div>
          ) : selected ? (
            <>
              <div className="flex justify-end px-3">
                <button
                  type="button"
                  aria-label="Close Episode"
                  onClick={closePanel}
                  className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
              <EpisodeDetail episodeId={selected} />
            </>
          ) : (
            <TargetPanel onOpen={open} />
          )}
        </aside>
      </div>
    </>
  )
}
