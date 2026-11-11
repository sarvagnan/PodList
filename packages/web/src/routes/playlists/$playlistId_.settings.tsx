import { Operation, State } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Schema } from "effect"
import { Trash2 } from "lucide-react"
import { useAppState } from "../../app/hooks.ts"
import { useJournaledRecord } from "../../app/journal.ts"
import { useConfirm } from "../../components/feedback/useConfirm.ts"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { RenameableName } from "../../components/lists/RenameableName.tsx"
import { usePlaylistActions } from "../../components/playlists/usePlaylistActions.ts"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

// A Playlist's settings (docs/design/ui-layout.md › Playlist settings): its name, Clear
// on Played, and Delete, which sends it with its History and Listening Timeline to the
// Trash. The Default Playlist keeps its name and can't be deleted.

export const Route = createFileRoute("/playlists/$playlistId_/settings")({
  component: PlaylistSettings
})

const change = Schema.decodeUnknownSync(Operation.Change)

function PlaylistSettings() {
  const { playlistId } = Route.useParams()
  const state = useAppState()
  // Typed: journaled until recorded, so closing the page at once can't lose it (DATA-01).
  const record = useJournaledRecord()
  const { remove } = usePlaylistActions()
  const confirm = useConfirm()
  const playlist = state?.playlists.find((p) => p.id === playlistId)
  const rename = async (name: string) => {
    if (!playlist || playlist.isDefault) return
    const next = change({ _tag: "RenamePlaylist", playlistId, name })
    const step = {
      message: `Renamed Playlist “${playlist.name}” to “${name}”`,
      undo: [change({ _tag: "RenamePlaylist", playlistId, name: playlist.name })]
    }
    await record(next)
    confirm(step, async () => {
      await record(next)
      return step
    })
  }

  if (state === null) return <LoadingRows label="Loading Playlist" />
  if (playlist === undefined) {
    return (
      <>
        <PageHeader
          backOnDesktop
          title="Playlist settings"
          back={{ to: "/playlists", label: "Playlists" }}
        />
        <EmptyState title="This Playlist no longer exists">
          <Link to="/playlists" className="font-medium text-primary underline underline-offset-2">
            See your Playlists
          </Link>
        </EmptyState>
      </>
    )
  }
  return (
    <>
      <PageHeader
        backOnDesktop
        title="Playlist settings"
        tabTitle={`${playlist.name} settings`}
        back={{ to: `/playlists/${playlistId}`, label: playlist.name }}
      />
      <div className="max-w-[704px] space-y-5 px-5 pb-10 md:px-8">
        <div className="rounded-xl border bg-card">
          <div className="border-b">
            <RenameableName
              key={playlist.id}
              kind="Playlist"
              entityId={playlist.id}
              name={playlist.name}
              names={state.playlists}
              disabled={playlist.isDefault}
              onSave={rename}
            />
          </div>
          <label className="flex items-start gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={playlist.clearOnPlayed}
              onChange={(event) =>
                record(
                  change({
                    _tag: "SetClearOnPlayed",
                    playlistId,
                    clearOnPlayed: event.target.checked
                  })
                )
              }
              // Keep the checkbox square beside wrapping text (WTYPE-04).
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span>
              <span className="block text-row font-medium">Clear on Played</span>
              <span className="block text-small text-muted-foreground">
                An Entry leaves once its Episode is Played, wherever you heard it. Turning it on
                keeps Entries that are already Played.
              </span>
            </span>
          </label>
        </div>
        {!playlist.isDefault && (
          <div>
            <button
              type="button"
              onClick={() => void remove(playlistId, playlist.name)}
              // Its icon on the page's edge; the hover fill reaches past it.
              className="-ml-3 inline-flex h-10 items-center gap-2 rounded-full px-3 text-row font-medium text-destructive hover:bg-secondary active:bg-input"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete Playlist
            </button>
            <p className="mt-1 text-small text-muted-foreground">
              It goes to the Trash with its History and Listening Timeline, and can be restored for{" "}
              {State.trashDaysOf(state)} days.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
