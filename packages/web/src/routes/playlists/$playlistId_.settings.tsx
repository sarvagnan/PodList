import { useAtomSet } from "@effect/atom-react"
import { Operation, State } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Schema } from "effect"
import { Trash2 } from "lucide-react"
import { useEffect, useId, useState } from "react"
import { useAppState } from "../../app/hooks.ts"
import { recordAtom } from "../../app/runtime.ts"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { fieldControl, SettingsRow } from "../../components/lists/SettingsRow.tsx"
import { usePlaylistActions } from "../../components/playlists/usePlaylistActions.ts"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { useDebounced } from "../../lib/useDebounced.ts"

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
  const record = useAtomSet(recordAtom)
  const { remove } = usePlaylistActions()
  const id = useId()
  const playlist = state?.playlists.find((p) => p.id === playlistId)
  const [name, setName] = useState(playlist?.name ?? "")
  const [error, setError] = useState(false)
  const rename = (value: string) => {
    const trimmed = value.trim()
    setError(trimmed === "")
    if (playlist !== undefined && trimmed !== "" && trimmed !== playlist.name) {
      record(change({ _tag: "RenamePlaylist", playlistId, name: trimmed }))
    }
  }
  const renameLater = useDebounced(rename)
  useEffect(() => {
    if (playlist !== undefined && name === "" && !error) setName(playlist.name)
  }, [playlist, name, error])

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
        subtitle={playlist.name}
        back={{ to: `/playlists/${playlistId}`, label: playlist.name }}
      />
      <div className="max-w-[704px] space-y-5 px-5 pb-10 md:px-8">
        <div className="rounded-xl border bg-card">
          {/* The same row as every other setting: label and hint beside the field. */}
          <SettingsRow
            label="Name"
            htmlFor={`${id}-name`}
            help={
              playlist.isDefault ? "The Default Playlist keeps its name." : "Saved as you type."
            }
          >
            <input
              id={`${id}-name`}
              type="text"
              value={name}
              disabled={playlist.isDefault}
              required
              aria-invalid={error}
              aria-describedby={error ? `${id}-name-error` : undefined}
              onChange={(event) => {
                const value = event.target.value
                setName(value)
                renameLater.schedule(value)
              }}
              onBlur={(event) => renameLater.now(event.target.value)}
              className={`${fieldControl} aria-invalid:border-destructive disabled:bg-secondary disabled:text-muted-foreground`}
            />
            {error && (
              <p id={`${id}-name-error`} className="mt-1 text-small text-destructive">
                A Playlist needs a name.
              </p>
            )}
          </SettingsRow>
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
              className="mt-1 size-4 accent-primary"
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
