import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Operation } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { GripVertical, Pause, Play, Settings2, X } from "lucide-react"
import type * as React from "react"
import { useEffect, useRef } from "react"
import { entryEpisodesAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady, useNowPlaying } from "../../app/hooks.ts"
import { playbackAtom, recordAtom } from "../../app/runtime.ts"
import { EpisodeDetail } from "../../components/episodes/EpisodeDetail.tsx"
import { useEpisodeActions } from "../../components/episodes/useEpisodeActions.ts"
import { Tip } from "../../components/feedback/Tip.tsx"
import { useCopyEpisodeLink } from "../../components/feedback/useCopyLink.ts"
import { GridCell } from "../../components/lists/Grid.tsx"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { SortableList, SortableRow } from "../../components/lists/SortableRow.tsx"
import { PlaylistHistory, PlaylistTimeline } from "../../components/playlists/PlaylistHistory.tsx"
import { Artwork } from "../../components/shell/Artwork.tsx"
import { PageHeader } from "../../components/shell/PageHeader.tsx"
import { useRowGrid } from "../../lib/rowGrid.ts"
import { useScrollMemory } from "../../lib/scrollMemory.ts"
import { formatLength, formatTime } from "../../lib/time.ts"

export const Route = createFileRoute("/playlists/$playlistId")({
  component: PlaylistDetail,
  // Wide screens show an Episode beside the Entries, as beside a View.
  validateSearch: (
    search: Record<string, unknown>
  ): { episode?: string; tab?: "history" | "timeline" } => ({
    ...(typeof search.episode === "string" ? { episode: search.episode } : {}),
    ...(search.tab === "history" || search.tab === "timeline" ? { tab: search.tab } : {})
  })
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
  const { episode: selected, tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  useScrollMemory(state !== null)
  // The Entries: one Tab stop, arrows between Entries and their buttons (lib/rowGrid.ts).
  const listRef = useRef<HTMLDivElement>(null)
  const entries = playlist?.entries ?? []
  const copyLink = useCopyEpisodeLink()
  const grid = useRowGrid(listRef, {
    count: entries.length,
    scrollToIndex: (index) =>
      listRef.current?.querySelector(`[data-row="${index}"]`)?.scrollIntoView({ block: "nearest" }),
    titleAt: (index) => episodes.get(entries[index]?.episodeId ?? "")?.title ?? "",
    onCopy: (index) => {
      const id = entries[index]?.episodeId
      if (id !== undefined) void copyLink(id)
    }
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
      if (document.querySelector('[data-sheet], [role="alertdialog"], [role="menu"]')) return
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
          <div className="flex items-center gap-2">
            <Tip label="Playlist settings">
              <Link
                to="/playlists/$playlistId/settings"
                params={{ playlistId: playlist.id }}
                aria-label="Playlist settings"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary hover:bg-input active:bg-input/70"
              >
                <Settings2 aria-hidden="true" className="size-5" />
              </Link>
            </Tip>
            {playlist.entries.length > 0 && (
              <button
                type="button"
                onClick={headerAction}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-transparent bg-primary px-4 text-row font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" className="size-4 fill-current" />
                ) : (
                  <Play aria-hidden="true" className="size-4 fill-current" />
                )}
                {isPlaying ? "Pause" : active ? "Play" : "Play this"}
              </button>
            )}
          </div>
        }
      />
      {/* Entries, History and Listening Timeline (docs/design/ui-layout.md › Desktop). */}
      <nav aria-label="Entries, History and Listening Timeline" className="mb-3 px-4 md:px-8">
        <div className="inline-grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
          {(
            [
              [undefined, "Entries"],
              ["history", "History"],
              ["timeline", "Listening Timeline"]
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={tab === value}
              onClick={() => void navigate({ search: value ? { tab: value } : {} })}
              className="flex h-9 items-center justify-center rounded-full px-3 text-small font-medium whitespace-nowrap text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
      {tab === "history" ? (
        <PlaylistHistory playlist={playlist} />
      ) : tab === "timeline" ? (
        <PlaylistTimeline playlist={playlist} />
      ) : playlist.entries.length === 0 ? (
        <EmptyState title="Nothing here yet">
          In a View, use Play Next or Play Last to add Episodes here.
        </EmptyState>
      ) : (
        <div className={selected ? "lg:grid lg:grid-cols-[minmax(0,1fr)_400px]" : "max-w-[960px]"}>
          {/* biome-ignore lint/a11y/useSemanticElements: a grid of flex rows (components/lists/Grid.tsx). */}
          <div
            ref={listRef}
            role="grid"
            aria-label={`${playlist.name} Entries`}
            aria-rowcount={entries.length}
            onKeyDown={grid.onKeyDown}
            onFocus={grid.onFocus}
            onBlur={grid.onBlur}
            className="px-3 md:px-6"
          >
            <SortableList
              ids={entries.map((e) => e.episodeId)}
              label={(id) => episodes.get(id)?.title ?? "Entry"}
              onMove={(episodeId, after) =>
                record(
                  Schema.decodeUnknownSync(Operation.Change)({
                    _tag: "MoveEntry",
                    playlistId: playlist.id,
                    episodeId,
                    after
                  })
                )
              }
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
                  <SortableRow key={entry.episodeId} id={entry.episodeId}>
                    {(sortable) => (
                      // biome-ignore lint/a11y/useSemanticElements lint/a11y/useFocusableInteractive: a row of the grid above.
                      <div
                        ref={sortable.ref}
                        style={sortable.style}
                        role="row"
                        data-row={index}
                        aria-rowindex={index + 1}
                        aria-current={current ? "true" : undefined}
                        // Narrow for its text (a small phone, large text): the number column gives
                        // way, then the buttons move under the title (WTYPE-02, WTYPE-05).
                        className={`@container relative flex flex-wrap items-center gap-3 rounded-xl px-2 py-2.5 ${current ? "bg-accent" : ""} ${sortable.dragging ? "bg-card shadow-lg" : ""}`}
                      >
                        <GridCell className="relative z-10 shrink-0">
                          <Tip label="Drag to reorder">
                            <button
                              type="button"
                              data-cell=""
                              {...sortable.handle}
                              aria-label={`Move ${title ?? "Entry"}`}
                              tabIndex={-1}
                              className="-mx-1 grid size-11 cursor-grab touch-none place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing"
                            >
                              <GripVertical aria-hidden="true" className="size-5" />
                            </button>
                          </Tip>
                        </GridCell>
                        <span
                          className={`hidden min-w-10 shrink-0 text-center text-xs font-semibold tracking-wider @min-[30rem]:block ${current ? "text-primary" : "text-muted-foreground"}`}
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
                            <span className="block text-xs font-semibold tracking-wider text-primary @min-[30rem]:hidden">
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
                            <span className="line-clamp-2 text-row font-medium">
                              Episode unavailable
                            </span>
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
                            {/* Only a started Entry has progress to show. */}
                            {position > 0 && (
                              <span className="progress-track h-1 flex-1 overflow-hidden rounded-full bg-border">
                                <span
                                  className="progress-fill block h-1 bg-primary"
                                  style={{ width: `${progress}%` }}
                                />
                              </span>
                            )}
                            <span className="text-small whitespace-nowrap text-muted-foreground tabular-nums">
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
                    )}
                  </SortableRow>
                )
              })}
            </SortableList>
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
