import { useAtomValue } from "@effect/atom-react"
import { createFileRoute } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { entryEpisodesAtom } from "../../app/data.ts"
import { useAppState, useNowPlaying } from "../../app/hooks.ts"
import { ListRow, LoadingRows, StatusBadge } from "../../components/lists/ListRow.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

export const Route = createFileRoute("/playlists/")({ component: PlaylistsList })

const entries = (n: number) => `${n} ${n === 1 ? "Entry" : "Entries"}`

function PlaylistsList() {
  const state = useAppState()
  const now = useNowPlaying()
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  return (
    <>
      <PageHeader title="Playlists" />
      {state === null ? (
        <LoadingRows label="Loading Playlists" />
      ) : (
        <div className="px-3 md:px-6">
          {state.playlists.map((p) => {
            const active = p.id === state.activePlaylistId
            const current = p.cursor === null ? undefined : episodes.get(p.cursor)
            const lines = [
              ...(current ? [`${active ? "Now" : "Resume at"}: ${current.title}`] : []),
              `${entries(p.entries.length)} · ${p.clearOnPlayed ? "Clear on Played" : "Keeps Entries"}`
            ]
            const status = active
              ? now?.playlistId === p.id && now.playing
                ? "Playing"
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
        </div>
      )}
    </>
  )
}
