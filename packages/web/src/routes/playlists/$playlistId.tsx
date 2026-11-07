import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Operation } from "@podlist/domain"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import { GripVertical, Pause, Play, Settings, X } from "lucide-react"
import type * as React from "react"
import { useEffect, useRef } from "react"
import { entryEpisodesAtom } from "../../app/data.ts"
import { useAppState, useLibraryReady, useNowPlaying } from "../../app/hooks.ts"
import { playbackAtom, recordAtom } from "../../app/runtime.ts"
import { EpisodeDetail } from "../../components/episodes/EpisodeDetail.tsx"
import { useEpisodeActions } from "../../components/episodes/useEpisodeActions.ts"
import { Tip } from "../../components/feedback/Tip.tsx"
import { useConfirm } from "../../components/feedback/useConfirm.ts"
import { useCopyEpisodeLink } from "../../components/feedback/useCopyLink.ts"
import { GridCell } from "../../components/lists/Grid.tsx"
import { EmptyState, LoadingRows } from "../../components/lists/ListRow.tsx"
import { type RowCommand, RowMenu } from "../../components/lists/RowMenu.tsx"
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
  const confirm = useConfirm()
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
        <PageHeader title="Playlist not found" back={{ to: "/playlists", label: "Playlists" }} />
        <EmptyState title="There’s no Playlist at this address">
          It may have been deleted, here or on another Device, or the link is wrong.{" "}
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

  // One step that Undo takes back: the Entry returns after its old neighbour.
  const moveEntry = (episodeId: string, after: string | null) => {
    const index = entries.findIndex((e) => e.episodeId === episodeId)
    const before = index > 0 ? (entries[index - 1]?.episodeId ?? null) : null
    const move = (to: string | null) =>
      Schema.decodeUnknownSync(Operation.Change)({
        _tag: "MoveEntry",
        playlistId: playlist.id,
        episodeId,
        after: to
      })
    const step = {
      message: `Moved “${episodes.get(episodeId)?.title ?? "Entry"}”`,
      undo: [move(before)]
    }
    record(move(after))
    confirm(
      step,
      async () => {
        record(move(after))
        return step
      },
      () => document.querySelector<HTMLElement>(`[data-episode-title="${episodeId}"]`)
    )
  }

  return (
    <>
      <PageHeader
        narrow={!selected}
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
                <Settings aria-hidden="true" className="size-5" />
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
      <nav
        aria-label="Entries, History and Listening Timeline"
        className="@container mb-3 px-5 md:px-8"
      >
        <div className="inline-flex flex-wrap gap-1 rounded-3xl bg-secondary p-1">
          {(
            [
              [undefined, "Entries"],
              ["history", "History"],
              ["timeline", "Listening Timeline"]
            ] as const
          ).map(([value, label]) => (
            // Links to each section's own address (?tab=), so they open in a new tab, copy
            // and bookmark like any page (BROWSER-04); the current one is marked as such.
            <Link
              key={label}
              to="/playlists/$playlistId"
              params={{ playlistId: playlist.id }}
              search={value ? { tab: value } : {}}
              aria-current={tab === value ? "page" : undefined}
              activeOptions={{ exact: true, includeSearch: true }}
              className="flex h-9 items-center justify-center rounded-full px-3 text-small font-medium whitespace-nowrap text-muted-foreground aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
            >
              {value === "timeline" ? (
                // A narrow screen (or large text) keeps the three on one line.
                <span>
                  <span className="@max-[22rem]:sr-only">Listening </span>Timeline
                </span>
              ) : (
                label
              )}
            </Link>
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
              onMove={moveEntry}
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
                const episodeState = state.episodeStates[entry.episodeId]
                const starred = episodeState?.starred ?? false
                const played = (episodeState?.played ?? null) !== null
                const last = entries[entries.length - 1]?.episodeId ?? null
                const commands: ReadonlyArray<RowCommand> = [
                  live && playing.playing
                    ? { label: "Pause", run: () => control({ _tag: "toggle" }) }
                    : {
                        label: "Play from Here",
                        run: () =>
                          control(
                            live
                              ? { _tag: "toggle" }
                              : {
                                  _tag: "playEntry",
                                  playlistId: playlist.id,
                                  episodeId: entry.episodeId
                                }
                          )
                      },
                  ...(index > 0
                    ? [{ label: "Move to Top", run: () => moveEntry(entry.episodeId, null) }]
                    : []),
                  ...(index < entries.length - 1
                    ? [{ label: "Move to Bottom", run: () => moveEntry(entry.episodeId, last) }]
                    : []),
                  { separator: true },
                  {
                    label: starred ? "Unstar" : "Star",
                    run: () =>
                      void act({ _tag: "Star", episodeId: entry.episodeId, starred: !starred })
                  },
                  {
                    label: played ? "Mark Unplayed" : "Mark Played",
                    run: () =>
                      void act({ _tag: "Played", episodeId: entry.episodeId, played: !played })
                  },
                  { separator: true },
                  {
                    label: "Open Episode",
                    run: () =>
                      window.matchMedia("(min-width: 64rem)").matches
                        ? void navigate({ search: { episode: entry.episodeId } })
                        : void navigate({
                            to: "/episodes/$episodeId",
                            params: { episodeId: entry.episodeId }
                          })
                  },
                  {
                    label: `Remove from ${playlist.name}`,
                    run: () =>
                      void act({
                        _tag: "Remove",
                        episodeId: entry.episodeId,
                        playlistId: playlist.id
                      })
                  }
                ]
                return (
                  <SortableRow key={entry.episodeId} id={entry.episodeId}>
                    {(sortable) => (
                      <RowMenu
                        commands={commands}
                        link={`/episodes/${entry.episodeId}`}
                        render={
                          // biome-ignore lint/a11y/useSemanticElements lint/a11y/useFocusableInteractive lint/a11y/useKeyWithClickEvents: a row of the grid above; its click only widens the title's mouse target.
                          <div
                            ref={sortable.ref}
                            style={sortable.style}
                            role="row"
                            data-row={index}
                            aria-rowindex={index + 1}
                            aria-current={current ? "true" : undefined}
                            // Desktop: a click in the row's empty space opens the Episode too.
                            onClick={(event: React.MouseEvent) => {
                              if (
                                !plainClick(event) ||
                                !window.matchMedia("(min-width: 64rem)").matches
                              )
                                return
                              if (
                                (event.target as Element).closest("a, button, input, label, select")
                              )
                                return
                              if (window.getSelection()?.isCollapsed === false) return
                              void navigate({ search: { episode: entry.episodeId } })
                            }}
                            // Narrow for its text (a small phone, large text): the number column
                            // gives way, then the buttons stack beside the title (WTYPE-02).
                            className={`@container relative flex items-center gap-3 rounded-xl px-2 py-2.5 lg:cursor-pointer ${current ? "bg-accent" : "lg:hover:bg-secondary/60"} ${sortable.dragging ? "bg-card shadow-lg" : ""}`}
                          />
                        }
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
                          className={`hidden w-15 shrink-0 text-center text-xs font-semibold tracking-wider @min-[30rem]:block ${current ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {current
                            ? active
                              ? "NOW"
                              : position > 0
                                ? "RESUME"
                                : "HERE"
                            : index + 1}
                        </span>
                        {episode === undefined ? (
                          // A neutral tile while the details arrive: it shows on the NOW row's
                          // tint too (APPEAR-11).
                          <span
                            aria-hidden="true"
                            className="size-11 shrink-0 rounded-lg bg-secondary"
                          />
                        ) : (
                          <Artwork url={episode.artworkUrl} name={episode.podcast} size={44} />
                        )}
                        <GridCell block className="min-w-0 flex-1">
                          {current && (
                            <span className="block text-xs font-semibold tracking-wider text-primary @min-[30rem]:hidden">
                              {active ? "NOW" : position > 0 ? "RESUME" : "HERE"}
                            </span>
                          )}
                          {title === undefined && !ready ? (
                            // A title line and (below) a facts line, each the height of the
                            // real one, so nothing moves when the details arrive (APPEAR-11).
                            <span
                              role="status"
                              aria-label="Loading Episode"
                              className="flex h-[1.5em] items-center text-row"
                            >
                              <span className="block h-3.5 w-2/3 rounded bg-secondary" />
                            </span>
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
                              // The whole row on the phone; on desktop only the title is the link, so the
                              // rest of the row keeps the row's own menu (BROWSER-06).
                              className="line-clamp-3 text-row font-medium hover:underline max-lg:after:absolute max-lg:after:inset-0 max-lg:after:rounded-xl max-lg:after:content-['']"
                            >
                              {title}
                            </Link>
                          )}
                          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {/* Only a started Entry has progress to show. Too narrow for both on
                                one line, the time goes under the bar rather than squeeze it. */}
                            {position > 0 && (
                              <span className="progress-track h-1 min-w-12 flex-1 basis-12 overflow-hidden rounded-full bg-border">
                                <span
                                  className="progress-fill block h-1 bg-primary"
                                  style={{ width: `${progress}%` }}
                                />
                              </span>
                            )}
                            <span className="text-small whitespace-nowrap text-muted-foreground tabular-nums">
                              {title === undefined && !ready ? (
                                <span
                                  aria-hidden="true"
                                  className="flex h-[1.5em] w-16 items-center"
                                >
                                  <span className="block h-3 w-full rounded bg-secondary" />
                                </span>
                              ) : (
                                time
                              )}
                            </span>
                          </span>
                        </GridCell>
                        {/* Inert until the Entry's details arrive: nothing to act on yet. */}
                        <div
                          inert={title === undefined && !ready}
                          // Narrow for its text (200% on a phone): Play and Remove stack beside the
                          // title rather than on a line of their own between rows.
                          className={`relative z-10 ml-auto flex shrink-0 @max-[15rem]:flex-col ${title === undefined && !ready ? "opacity-40" : ""}`}
                        >
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
                      </RowMenu>
                    )}
                  </SortableRow>
                )
              })}
            </SortableList>
          </div>
          {selected && (
            <aside
              aria-label="Episode"
              className="sticky top-0 hidden max-h-dvh self-start overflow-y-auto border-l pt-2 pr-4 pb-28 lg:block"
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
