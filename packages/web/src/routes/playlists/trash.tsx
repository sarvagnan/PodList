import { State } from "@podlist/domain"
import { createFileRoute } from "@tanstack/react-router"
import { useAppState } from "../../app/hooks.ts"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { usePlaylistActions } from "../../components/playlists/usePlaylistActions.ts"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

// The Trash (CONTEXT.md): deleted Playlists, each restorable until the Trash lets it go.

export const Route = createFileRoute("/playlists/trash")({ component: Trash })

const day = 86_400_000
const date = (millis: number) =>
  new Date(millis).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

function Trash() {
  const state = useAppState()
  const { restore } = usePlaylistActions()
  if (state === null) return <LoadingRows label="Loading the Trash" />
  const trash = [...State.trashOf(state)].reverse()
  const days = State.trashDaysOf(state)
  return (
    <>
      <PageHeader
        title="Trash"
        subtitle={`Deleted Playlists are kept for ${days} days.`}
        back={{ to: "/playlists", label: "Playlists" }}
      />
      {trash.length === 0 ? (
        <EmptyState title="The Trash is empty">Deleted Playlists wait here for a while.</EmptyState>
      ) : (
        <ul className="max-w-[960px] px-3 md:px-6">
          {trash.map((t) => (
            <li
              key={t.playlist.id}
              className="flex min-h-16 items-center gap-3 border-b px-2 py-2.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-row font-medium">{t.playlist.name}</span>
                <span className="block text-small text-muted-foreground">
                  {t.playlist.entries.length}{" "}
                  {t.playlist.entries.length === 1 ? "Entry" : "Entries"} · deleted{" "}
                  {date(t.deletedAt)} · kept until {date(t.deletedAt + days * day)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => restore(t.playlist.id)}
                className="h-10 shrink-0 rounded-full bg-secondary px-4 text-row font-medium hover:bg-input active:bg-input/70"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
