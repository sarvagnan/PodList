import { useAtomValue } from "@effect/atom-react"
import { Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { entryEpisodesAtom } from "../../app/data.ts"
import { useAppState, useNextLastTarget } from "../../app/hooks.ts"
import { formatLength, formatTime } from "../../lib/time.ts"
import { EmptyState } from "../lists/ListRow.tsx"
import { Artwork } from "../shell/Artwork.tsx"

/**
 * Desktop, beside a View with no Episode open (docs/design/ui-layout.md): the upcoming
 * Entries of the Playlist that Next and Last add to, so each add shows where it went.
 */
export function TargetPanel({ onOpen }: { readonly onOpen: (episodeId: string) => void }) {
  const state = useAppState()
  const target = useNextLastTarget()
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  if (state === null || target === undefined) return null
  const active = target.id === state.activePlaylistId
  const from = Math.max(
    0,
    target.entries.findIndex((e) => e.episodeId === target.cursor)
  )
  const upcoming = target.entries.slice(from)
  return (
    <section aria-labelledby="target-heading" className="px-5 pt-4">
      <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {/* What it shows: the header's picker already says Next and Last go here. */}
        Up next in
      </p>
      <h2 id="target-heading" className="mt-1 font-heading text-xl font-semibold">
        <Link
          to="/playlists/$playlistId"
          params={{ playlistId: target.id }}
          className="hover:underline"
        >
          {target.name}
        </Link>
      </h2>
      {upcoming.length === 0 ? (
        // The same dashed card as every other empty state.
        <div className="mt-3">
          <EmptyState title="Nothing up next" inPanel>
            Use Next or Last on an Episode to add it here.
          </EmptyState>
        </div>
      ) : (
        <ol className="mt-3">
          {upcoming.map((entry) => {
            const episode = episodes.get(entry.episodeId)
            const current = entry.episodeId === target.cursor
            const time =
              entry.position > 0 && episode?.duration
                ? `${formatTime(episode.duration - entry.position)} left`
                : episode?.duration
                  ? formatLength(episode.duration)
                  : ""
            return (
              <li key={entry.episodeId}>
                <Link
                  to="/episodes/$episodeId"
                  params={{ episodeId: entry.episodeId }}
                  onClick={(event) => {
                    // A plain click opens it beside the View; modified clicks stay links.
                    if (
                      event.button === 0 &&
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey
                    ) {
                      event.preventDefault()
                      onOpen(entry.episodeId)
                    }
                  }}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary ${current ? "bg-accent" : ""}`}
                >
                  <Artwork
                    url={episode?.artworkUrl ?? null}
                    name={episode?.podcast ?? "?"}
                    size={36}
                  />
                  <span className="min-w-0 flex-1">
                    {current && (
                      <span className="block text-xs font-semibold tracking-wider text-primary">
                        {active ? "NOW" : "RESUME"}
                      </span>
                    )}
                    <span className="line-clamp-2 text-row font-medium">
                      {episode?.title ?? "Episode unavailable"}
                    </span>
                    <span className="block text-small whitespace-nowrap text-muted-foreground tabular-nums">
                      {time}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
