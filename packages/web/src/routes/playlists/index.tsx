import { useAtomValue } from "@effect/atom-react"
import { State } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { Plus } from "lucide-react"
import { useState } from "react"
import { entryEpisodesAtom } from "../../app/data.ts"
import { useAppState, useNowPlaying } from "../../app/hooks.ts"
import { ListRow, LoadingRows, StatusBadge } from "../../components/lists/ListRow.tsx"
import { NewPlaylistDialog } from "../../components/playlists/NewPlaylistDialog.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

export const Route = createFileRoute("/playlists/")({ component: PlaylistsList })

const entries = (n: number) => `${n} ${n === 1 ? "Entry" : "Entries"}`

function PlaylistsList() {
  const state = useAppState()
  const now = useNowPlaying()
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  const [adding, setAdding] = useState(false)
  const trashed = state === null ? 0 : State.trashOf(state).length
  return (
    <>
      <PageHeader
        narrow
        title="Playlists"
        actions={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-4 text-row font-medium hover:bg-input active:bg-input/70"
          >
            <Plus aria-hidden="true" className="size-4" />
            New Playlist
          </button>
        }
      />
      {state === null ? (
        <LoadingRows label="Loading Playlists" />
      ) : (
        <div className="max-w-[960px] px-3 md:px-6">
          {state.playlists.map((p) => {
            const active = p.id === state.activePlaylistId
            const current = p.cursor === null ? undefined : episodes.get(p.cursor)
            // "Resume" only where there's a Position to resume from (COPY-01).
            const started = (p.entries.find((e) => e.episodeId === p.cursor)?.position ?? 0) > 0
            const lines = [
              ...(current
                ? [`${active ? "Now" : started ? "Resume at" : "Next"}: ${current.title}`]
                : []),
              `${entries(p.entries.length)} · ${p.clearOnPlayed ? "Clear on Played" : "Keeps Entries"}`
            ]
            // An empty Active Playlist has nothing to be paused on: it's just the Active one.
            const status = active
              ? now?.playlistId === p.id && now.playing
                ? "Playing"
                : p.entries.length === 0
                  ? "Active"
                  : "Paused"
              : null
            return (
              <ListRow
                key={p.id}
                link={{ to: "/playlists/$playlistId", params: { playlistId: p.id } }}
                // What each Playlist is on, rather than the same icon on every row.
                icon={
                  <Artwork
                    url={current?.artworkUrl ?? null}
                    name={current?.podcast ?? p.name}
                    size={40}
                  />
                }
                title={p.name}
                badge={status ? <StatusBadge status={status} /> : undefined}
                lines={lines}
              />
            )
          })}
          {trashed > 0 && (
            <Link
              to="/playlists/trash"
              className="mt-2 flex min-h-12 items-center justify-between rounded-lg px-2 text-row text-muted-foreground hover:bg-secondary/60"
            >
              Trash
              <span className="text-small">
                {trashed} deleted {trashed === 1 ? "Playlist" : "Playlists"}
              </span>
            </Link>
          )}
        </div>
      )}
      {adding && <NewPlaylistDialog open={adding} onOpenChange={setAdding} />}
    </>
  )
}
