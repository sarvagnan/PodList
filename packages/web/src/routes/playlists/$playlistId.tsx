import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Operation } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { Pause, Play, X } from "lucide-react"
import type * as React from "react"
import { useEffect, useRef } from "react"
import { entryEpisodesAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady, useNowPlaying } from "../../app/hooks.ts"
import { playbackAtom, recordAtom } from "../../app/runtime.ts"
import { EpisodeDetail } from "../../components/episodes/EpisodeDetail.tsx"
import { useEpisodeActions } from "../../components/episodes/useEpisodeActions.ts"
import { Tip } from "../../components/feedback/Tip.tsx"
import { GridCell } from "../../components/lists/Grid.tsx"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { useRowGrid } from "../../lib/rowGrid.ts"
import { useScrollMemory } from "../../lib/scrollMemory.ts"
import { formatLength, formatTime } from "../../lib/time.ts"

export const Route = createFileRoute("/playlists/$playlistId")({
  component: PlaylistDetail,
  // Wide screens show an Episode beside the Entries, as beside a View.
  validateSearch: (search: Record<string, unknown>): { episode?: string } =>
    typeof search.episode === "string" ? { episode: search.episode } : {}
})

const plainClick = (event: React.MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

function PlaylistDetail() {
  const { playlistId } = Route.useParams()
  const state = useAppState()
  const ready = useLibraryReady()
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  const record = useAtomSet(recordAtom)
  const control = useAtomSet(playbackAtom)
  const playing = useNowPlaying()
  const act = useEpisodeActions()
  const playlist = state?.playlists.find((p) => p.id === playlistId)
  const { episode: selected } = Route.useSearch()
  const navigate = Route.useNavigate()
  useScrollMemory(state !== null)
  // The Entries: one Tab stop, arrows between Entries and their buttons (lib/rowGrid.ts).
  const listRef = useRef<HTMLDivElement>(null)
  const entries = playlist?.entries ?? []
  const grid = useRowGrid(listRef, {
    count: entries.length,
    scrollToIndex: (index) =>
      listRef.current?.querySelector(`[data-row="${index}"]`)?.scrollIntoView({ block: "nearest" }),
    titleAt: (index) => episodes.get(entries[index]?.episodeId ?? "")?.title ?? ""
  })
  const closePanel = () => {
    const shown = selected
    void navigate({ search: {} }).then(() =>
      document.querySelector<HTMLElement>(`[data-episode-title="${shown}"]`)?.focus()
    )
  }
  const onEscape = useRef(() => {})
  onEscape.current = () => {
    if (selected) closePanel()
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      onEscape.current()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])
  if (state === null) return <LoadingRows label="Loading Playlist" />
  if (playlist === undefined) {
    return (
      <>
        <PageHeader title="Playlist" back={{ to: "/playlists", label: "Playlists" }} />
        <EmptyState title="This Playlist no longer exists">
          It may have been deleted on another Device.{" "}
          <Link to="/playlists" className="font-medium text-primary underline underline-offset-2">
            See your Playlists
          </Link>
        </EmptyState>
      </>
    )
  }
  const active = playlist.id === state.activePlaylistId
  const isPlaying = active && playing?.playlistId === playlist.id && playing.playing

  // One button in the header that changes its words, so focus stays put (FLOW-02).
  const headerAction = () => {
    if (active && playing?.playlistId === playlist.id) return control({ _tag: "toggle" })
    const start = playlist.cursor ?? playlist.entries[0]?.episodeId
    if (start !== undefined) {
      return control({ _tag: "playEntry", playlistId: playlist.id, episodeId: start })
    }
    // An empty Playlist just becomes the Active one.
    return record(
      Schema.decodeUnknownSync(Operation.Change)({
        _tag: "SetActivePlaylist",
        playlistId: playlist.id
      })
    )
  }

  return (
    <>
      <PageHeader
        title={playlist.name}
        back={{ to: "/playlists", label: "Playlists" }}
        subtitle={`${playlist.entries.length} ${playlist.entries.length === 1 ? "Entry" : "Entries"} · ${playlist.clearOnPlayed ? "Clear on Played" : "Keeps Entries"}`}
        actions={
          <button
            type="button"
            onClick={headerAction}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="size-4 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-4 fill-current" />
            )}
            {isPlaying ? "Pause" : active ? "Play" : "Play this"}
          </button>
        }
      />
      {playlist.entries.length === 0 ? (
        <EmptyState title="Nothing here yet">
          In a View, use Play Next or Play Last to add Episodes here.
        </EmptyState>
      ) : (
        <div className={selected ? "lg:grid lg:grid-cols-[minmax(0,1fr)_400px]" : ""}>
          {/* biome-ignore lint/a11y/useSemanticElements: a grid of flex rows (components/lists/Grid.tsx). */}
          <div
            ref={listRef}
            role="grid"
            aria-label={`${playlist.name} Entries`}
            aria-rowcount={entries.length}
            onKeyDown={grid.onKeyDown}
            onFocus={grid.onFocus}
            className="px-3 md:px-6"
          >
            {playlist.entries.map((entry, index) => {
              const episode = episodes.get(entry.episodeId)
              const current = entry.episodeId === playlist.cursor
              const live =
                playing?.playlistId === playlist.id && playing.episodeId === entry.episodeId
              const position = live ? playing.position : entry.position
              const duration = live && playing.duration ? playing.duration : episode?.duration
              const progress = duration ? Math.min(100, (position / duration) * 100) : 0
              // Started: time left. Not started: its length. Never one figure for both.
              const time =
                position > 0 && duration
                  ? `${formatTime(duration - position)} left`
                  : duration
                    ? formatLength(duration)
                    : ""
              const title = episode?.title
              return (
                // biome-ignore lint/a11y/useSemanticElements lint/a11y/useFocusableInteractive: a row of the grid above.
                <div
                  key={entry.episodeId}
                  role="row"
                  data-row={index}
                  aria-rowindex={index + 1}
                  aria-current={current ? "true" : undefined}
                  // Narrow for its text (a small phone, large text): the number column gives
                  // way, then the buttons move under the title (WTYPE-02, WTYPE-05).
                  className={`@container relative flex flex-wrap items-center gap-3 rounded-xl px-2 py-2.5 ${current ? "bg-accent" : ""}`}
                >
                  <span
                    className={`min-w-10 shrink-0 text-center text-xs font-semibold tracking-wider @max-[22rem]:hidden ${current ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {current ? (active ? "NOW" : "RESUME") : index + 1}
                  </span>
                  <Artwork
                    url={episode?.artworkUrl ?? null}
                    name={episode?.podcast ?? "?"}
                    size={44}
                  />
                  <GridCell block className="min-w-0 flex-1">
                    {current && (
                      <span className="hidden text-xs font-semibold tracking-wider text-primary @max-[22rem]:block">
                        {active ? "NOW" : "RESUME"}
                      </span>
                    )}
                    {title === undefined && !ready ? (
                      <span
                        role="status"
                        aria-label="Loading Episode"
                        className="block h-3.5 w-2/3 rounded bg-secondary"
                      />
                    ) : title === undefined ? (
                      <span className="line-clamp-2 text-row font-medium">Episode unavailable</span>
                    ) : (
                      <Link
                        to="/episodes/$episodeId"
                        params={{ episodeId: entry.episodeId }}
                        data-cell="title"
                        data-episode-title={entry.episodeId}
                        onClick={(event) => {
                          if (
                            plainClick(event) &&
                            window.matchMedia("(min-width: 64rem)").matches
                          ) {
                            event.preventDefault()
                            void navigate({ search: { episode: entry.episodeId } })
                          }
                        }}
                        className="line-clamp-3 text-row font-medium after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:underline"
                      >
                        {title}
                      </Link>
                    )}
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="progress-track h-1 flex-1 overflow-hidden rounded-full bg-border">
                        <span
                          className="progress-fill block h-1 bg-primary"
                          style={{ width: `${progress}%` }}
                        />
                      </span>
                      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                        {time}
                      </span>
                    </span>
                  </GridCell>
                  <div className="relative z-10 ml-auto flex shrink-0 @max-[15rem]:basis-full @max-[15rem]:justify-end">
                    {/* One button that stays put (and keeps focus) as it toggles. */}
                    <GridCell>
                      <Tip label={live && playing.playing ? "Pause" : "Play from here"}>
                        <button
                          type="button"
                          data-cell=""
                          aria-label={
                            live && playing.playing
                              ? `Pause ${title ?? "Entry"}`
                              : `Play ${title ?? "Entry"} from here`
                          }
                          onClick={() =>
                            control(
                              live
                                ? { _tag: "toggle" }
                                : {
                                    _tag: "playEntry",
                                    playlistId: playlist.id,
                                    episodeId: entry.episodeId
                                  }
                            )
                          }
                          className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-accent active:bg-input"
                        >
                          {live && playing.playing ? (
                            <Pause aria-hidden="true" className="size-5 fill-current" />
                          ) : (
                            <Play aria-hidden="true" className="size-5 fill-current" />
                          )}
                        </button>
                      </Tip>
                    </GridCell>
                    <GridCell>
                      <Tip label={`Remove from ${playlist.name}`}>
                        <button
                          type="button"
                          data-cell=""
                          aria-label={`Remove ${title ?? "Entry"} from ${playlist.name}`}
                          onClick={() =>
                            void act({
                              _tag: "Remove",
                              episodeId: entry.episodeId,
                              playlistId: playlist.id
                            })
                          }
                          className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input"
                        >
                          <X aria-hidden="true" className="size-5" />
                        </button>
                      </Tip>
                    </GridCell>
                  </div>
                </div>
              )
            })}
          </div>
          {selected && (
            <aside
              aria-label="Episode"
              className="sticky top-0 hidden max-h-dvh self-start overflow-y-auto border-l pt-2 pb-28 lg:block"
            >
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
            </aside>
          )}
        </div>
      )}
    </>
  )
}
