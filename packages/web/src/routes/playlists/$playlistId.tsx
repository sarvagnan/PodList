import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Operation } from "@podlist/domain"
import { createFileRoute } from "@tanstack/react-router"
import { Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { entryEpisodesAtom } from "../../app/data.ts"
import { recordAtom, stateAtom } from "../../app/runtime.ts"
import { EmptyState } from "../../components/lists/ListRow.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"

export const Route = createFileRoute("/playlists/$playlistId")({ component: PlaylistDetail })

const formatTime = (seconds: number) => {
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

function PlaylistDetail() {
  const { playlistId } = Route.useParams()
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  const record = useAtomSet(recordAtom)
  const playlist = state?.playlists.find((p) => p.id === playlistId)
  if (state === null || playlist === undefined) return null
  const active = playlist.id === state.activePlaylistId

  return (
    <>
      <PageHeader
        title={playlist.name}
        back={{ to: "/playlists", label: "Playlists" }}
        subtitle={`${playlist.entries.length} Entries · ${playlist.clearOnPlayed ? "Clear on Played" : "Keeps Entries"}`}
        actions={
          active ? (
            <span className="rounded-full bg-positive-tint px-3 py-1.5 text-[13px] font-semibold text-positive">
              Playing
            </span>
          ) : (
            <button
              type="button"
              onClick={() =>
                record(
                  Schema.decodeUnknownSync(Operation.Change)({
                    _tag: "SetActivePlaylist",
                    playlistId: playlist.id
                  })
                )
              }
              className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Play this
            </button>
          )
        }
      />
      {playlist.entries.length === 0 ? (
        <EmptyState title="Nothing here yet">
          Add episodes from a View with Play Next or Play Last.
        </EmptyState>
      ) : (
        <ol className="px-3 md:px-6">
          {playlist.entries.map((entry, index) => {
            const episode = episodes.get(entry.episodeId)
            const current = entry.episodeId === playlist.cursor
            const progress = episode?.duration
              ? Math.min(100, (entry.position / episode.duration) * 100)
              : 0
            return (
              <li
                key={entry.episodeId}
                aria-current={current ? "true" : undefined}
                className={`flex items-center gap-3 rounded-xl px-2 py-2.5 ${current ? "bg-accent" : ""}`}
              >
                <span
                  className={`w-9 text-center text-xs font-semibold ${current ? "text-primary" : "text-muted-foreground"}`}
                >
                  {current ? (active ? "NOW" : "HERE") : index + 1}
                </span>
                <Artwork
                  url={episode?.artworkUrl ?? null}
                  name={episode?.podcast ?? "?"}
                  size={44}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {episode?.title ?? "Episode unavailable"}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                      <span className="block h-1 bg-primary" style={{ width: `${progress}%` }} />
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {entry.position > 0
                        ? formatTime(entry.position)
                        : episode?.duration
                          ? formatTime(episode.duration)
                          : ""}
                    </span>
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
