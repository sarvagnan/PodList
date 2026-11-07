import { Drawer } from "@base-ui/react/drawer"
import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react"
import { Operation, type Playlist } from "@podlist/domain"
import { Schema } from "effect"
import { AsyncResult } from "effect/reactivity"
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  GripVertical,
  ListMusic,
  ListOrdered,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { entryEpisodesAtom } from "../../app/data.ts"
import { type DrawerPage, drawerAtom } from "../../app/drawer.ts"
import { useAppState, useNowPlaying } from "../../app/hooks.ts"
import { playbackAtom, recordAtom } from "../../app/runtime.ts"
import { useBackLayers } from "../../lib/backLayers.ts"
import { chapterAt, nextChapterStart, previousChapterStart } from "../../lib/chapters.ts"
import { focusAfterRemoval } from "../../lib/focusAfterRemoval.ts"
import { wrapTab } from "../../lib/focusTrap.ts"
import { formatLength, formatTime } from "../../lib/time.ts"
import type { NowPlaying } from "../../playback/Playback.ts"
import { backSeconds, forwardSeconds } from "../../playback/Playback.ts"
import { EpisodeDetail } from "../episodes/EpisodeDetail.tsx"
import { useEpisodeActions } from "../episodes/useEpisodeActions.ts"
import { Tip } from "../feedback/Tip.tsx"
import { useConfirm } from "../feedback/useConfirm.ts"
import { SortableList, SortableRow } from "../lists/SortableRow.tsx"
import { Artwork } from "../shell/Artwork.tsx"
import { PlayerMenus } from "./PlayerMenus.tsx"
import { Scrubber } from "./Scrubber.tsx"
import { SkipIcon } from "./SkipIcon.tsx"

// The Now Playing drawer (docs/design/ui-layout.md): it slides up over the current
// screen, and everything opened from it (Up next, Episode, Chapters, Switch Playlist)
// opens inside it as a stacked page with Back, until the drawer is dismissed.

const pageTitles: Record<DrawerPage, string> = {
  queue: "Up next",
  episode: "Episode",
  chapters: "Chapters",
  playlists: "Switch Playlist"
}

const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-full text-player-foreground hover:bg-player-track active:bg-player-track/70 disabled:opacity-40 disabled:hover:bg-transparent"

function useDrawer() {
  const [drawer, setDrawer] = useAtom(drawerAtom)
  return {
    drawer,
    push: (page: DrawerPage) => setDrawer({ open: true, stack: [...drawer.stack, page] }),
    back: () => setDrawer({ ...drawer, stack: drawer.stack.slice(0, -1) }),
    /** After starting playback from a page: back to the drawer's main page. */
    home: () => {
      setDrawer({ open: true, stack: [] })
      // Back at the main page's top, so what now plays is in view (not scrolled away).
      document.querySelector('[data-sheet="drawer"] .overflow-y-auto')?.scrollTo({ top: 0 })
    },
    close: () => setDrawer({ ...drawer, open: false })
  }
}

function PillButton({
  icon,
  children,
  onClick
}: {
  readonly icon: ReactNode
  readonly children: ReactNode
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-player-track px-4 text-row font-medium hover:bg-player-track/80 active:bg-player-track/60"
    >
      {icon}
      {children}
    </button>
  )
}

function MainPage({ current }: { readonly current: NowPlaying }) {
  const state = useAppState()
  const control = useAtomSet(playbackAtom)
  const { push } = useDrawer()
  const playlist = state?.playlists.find((p) => p.id === current.playlistId)
  const chapter = current.chapters[chapterAt(current.chapters, current.position)]
  const queued = playlist
    ? playlist.entries.length -
      1 -
      playlist.entries.findIndex((e) => e.episodeId === current.episodeId)
    : 0
  const seek = (seconds: number | null) => seconds !== null && control({ _tag: "seek", seconds })
  return (
    // A short window (a zoomed laptop) keeps Play in view: smaller artwork, tighter gaps.
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-6 pb-8 short:gap-2 short:pb-3">
      <Artwork
        url={chapter?.artworkUrl ?? current.artworkUrl}
        name={current.podcast}
        size={320}
        className="aspect-square h-auto w-full max-w-[min(20rem,38dvh)] rounded-2xl shadow-lg short:max-w-[min(20rem,18dvh)]"
      />
      {current.chapters.length > 0 && (
        <div className="flex w-full items-center gap-2">
          <Tip label={"Previous Chapter"}>
            <button
              type="button"
              aria-label="Previous Chapter"
              onClick={() => seek(previousChapterStart(current.chapters, current.position))}
              className={iconButton}
            >
              <SkipBack aria-hidden="true" className="size-5 fill-current" />
            </button>
          </Tip>
          <p className="min-w-0 flex-1 truncate text-center text-small text-player-muted">
            {chapter?.title ?? "Before the first Chapter"}
          </p>
          <Tip label={"Next Chapter"}>
            <button
              type="button"
              aria-label="Next Chapter"
              disabled={nextChapterStart(current.chapters, current.position) === null}
              onClick={() => seek(nextChapterStart(current.chapters, current.position))}
              className={iconButton}
            >
              <SkipForward aria-hidden="true" className="size-5 fill-current" />
            </button>
          </Tip>
        </div>
      )}
      <div className="w-full text-center">
        <Drawer.Title className="line-clamp-2 font-heading text-xl font-semibold">
          {current.title || "Episode unavailable"}
        </Drawer.Title>
        <Drawer.Description className="mt-1 truncate text-small text-player-muted">
          {current.podcast} · {playlist?.name ?? ""}
        </Drawer.Description>
      </div>
      <div className="w-full">
        <Scrubber
          position={current.position}
          duration={current.duration}
          chapters={current.chapters}
          onSeek={(seconds) => control({ _tag: "seek", seconds })}
        />
      </div>
      {current.error && (
        <p role="alert" className="text-small text-player-danger">
          Couldn’t play this Episode.{" "}
          <button
            type="button"
            onClick={() => control({ _tag: "retry" })}
            className="ml-1 rounded-full bg-player-track px-3 py-1 font-semibold text-player-foreground hover:bg-player-track/80 active:bg-player-track/60"
          >
            Try again
          </button>
        </p>
      )}
      <div className="flex items-center gap-6">
        <Tip label={`Back ${backSeconds} seconds`}>
          <button
            type="button"
            aria-label={`Back ${backSeconds} seconds`}
            onClick={() => control({ _tag: "skip", seconds: -backSeconds })}
            className={`${iconButton} size-14`}
          >
            <SkipIcon seconds={backSeconds} direction="back" large />
          </button>
        </Tip>
        <Tip label={current.playing ? "Pause" : "Play"}>
          <button
            type="button"
            aria-label={current.playing ? "Pause" : "Play"}
            onClick={() => control({ _tag: "toggle" })}
            className="grid size-18 place-items-center rounded-full border border-transparent bg-player-foreground text-player hover:bg-player-foreground/90 active:bg-player-foreground/75"
          >
            {current.playing ? (
              <Pause aria-hidden="true" className="size-8 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-8 translate-x-0.5 fill-current" />
            )}
          </button>
        </Tip>
        <Tip label={`Forward ${forwardSeconds} seconds`}>
          <button
            type="button"
            aria-label={`Forward ${forwardSeconds} seconds`}
            onClick={() => control({ _tag: "skip", seconds: forwardSeconds })}
            className={`${iconButton} size-14`}
          >
            <SkipIcon seconds={forwardSeconds} direction="forward" large />
          </button>
        </Tip>
      </div>
      <PlayerMenus current={current} />
      <div className="flex flex-wrap justify-center gap-2">
        {current.chapters.length > 0 && (
          <span className="md:hidden">
            <PillButton
              icon={<ListOrdered aria-hidden="true" className="size-4" />}
              onClick={() => push("chapters")}
            >
              Chapters
            </PillButton>
          </span>
        )}
        <PillButton
          icon={<BookOpen aria-hidden="true" className="size-4" />}
          onClick={() => push("episode")}
        >
          Episode
        </PillButton>
        <span className="md:hidden">
          <PillButton
            icon={<ListMusic aria-hidden="true" className="size-4" />}
            onClick={() => push("queue")}
          >
            {queued > 0 ? `Up next · ${queued}` : "Up next"}
          </PillButton>
        </span>
      </div>
    </div>
  )
}

function ChaptersList({ current }: { readonly current: NowPlaying }) {
  const control = useAtomSet(playbackAtom)
  const { home } = useDrawer()
  const playing = chapterAt(current.chapters, current.position)
  return (
    <ol aria-label="Chapters" className="px-3">
      {current.chapters.map((c, i) => (
        <li key={c.start}>
          <button
            type="button"
            aria-current={i === playing ? "true" : undefined}
            onClick={() => {
              control({ _tag: "seek", seconds: c.start })
              home()
            }}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-player-track ${i === playing ? "bg-player-track" : ""}`}
          >
            <span className="min-w-14 shrink-0 text-small whitespace-nowrap text-player-muted tabular-nums">
              {formatTime(c.start)}
            </span>
            <span className={`flex-1 text-row ${i === playing ? "font-semibold" : ""}`}>
              {c.title}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

const decodeChange = Schema.decodeUnknownSync(Operation.Change)

function UpNext({ current }: { readonly current: NowPlaying }) {
  const state = useAppState()
  const control = useAtomSet(playbackAtom)
  const record = useAtomSet(recordAtom)
  const confirm = useConfirm()
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  const { home, push } = useDrawer()
  const act = useEpisodeActions()
  const playlist = state?.playlists.find((p) => p.id === current.playlistId)
  if (!playlist) return null
  // What plays now and after it: Entries before it aren't "up next".
  const at = playlist.entries.findIndex((e) => e.episodeId === current.episodeId)
  const nowEntry = at >= 0 ? playlist.entries[at] : undefined
  const after = playlist.entries.slice(at + 1)
  const title = (episodeId: string) => episodes.get(episodeId)?.title ?? "Entry"
  // The Queue reorders (docs/design/ui-layout.md): a move is one step, with Undo; what
  // plays now stays first.
  const moveEntry = (episodeId: string, to: string | null) => {
    const entries = playlist.entries
    const index = entries.findIndex((e) => e.episodeId === episodeId)
    const before = index > 0 ? (entries[index - 1]?.episodeId ?? null) : null
    const move = (target: string | null) =>
      decodeChange({ _tag: "MoveEntry", playlistId: playlist.id, episodeId, after: target })
    const step = { message: `Moved “${title(episodeId)}”`, undo: [move(before)] }
    const target = to ?? nowEntry?.episodeId ?? null
    record(move(target))
    confirm(step, async () => {
      record(move(target))
      return step
    })
  }
  const row = (entry: Playlist.Entry, isCurrent: boolean, handle?: ReactNode) => {
    const episode = episodes.get(entry.episodeId)
    return (
      <>
        {handle}
        <button
          type="button"
          aria-current={isCurrent ? "true" : undefined}
          aria-label={
            isCurrent
              ? `${episode?.title ?? "Entry"}, playing now`
              : `Play ${episode?.title ?? "Entry"} from here`
          }
          onClick={() => {
            if (!isCurrent) {
              control({ _tag: "playEntry", playlistId: playlist.id, episodeId: entry.episodeId })
            }
            home()
          }}
          className={`flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-player-track ${isCurrent ? "bg-player-track" : ""}`}
        >
          <Artwork url={episode?.artworkUrl ?? null} name={episode?.podcast ?? "?"} size={40} />
          <span className="min-w-0 flex-1">
            <span className={`line-clamp-2 text-row ${isCurrent ? "font-semibold" : ""}`}>
              {episode?.title ?? "Episode unavailable"}
            </span>
            <span className="text-small text-player-muted">
              {isCurrent
                ? "Now"
                : entry.position > 0 && episode?.duration
                  ? `${formatTime(episode.duration - entry.position)} left`
                  : episode?.duration
                    ? formatLength(episode.duration)
                    : ""}
            </span>
          </span>
        </button>
        {!isCurrent && (
          <Tip label={`Remove from ${playlist.name}`}>
            <button
              type="button"
              aria-label={`Remove ${episode?.title ?? "Entry"} from ${playlist.name}`}
              data-upnext-remove=""
              onClick={(event) => {
                focusAfterRemoval(event.currentTarget, "[data-upnext-remove]")
                void act({ _tag: "Remove", episodeId: entry.episodeId, playlistId: playlist.id })
              }}
              className="grid size-11 shrink-0 place-items-center rounded-full text-player-muted hover:bg-player-track hover:text-player-foreground"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </Tip>
        )}
      </>
    )
  }
  return (
    <div className="px-3">
      <div className="flex items-center justify-between px-3 pb-2">
        <p className="text-small text-player-muted">From {playlist.name}</p>
        <button
          type="button"
          onClick={() => push("playlists")}
          className="h-10 rounded-full bg-player-track px-4 text-row font-medium text-player-foreground hover:bg-player-track/80 active:bg-player-track/60"
        >
          Switch Playlist
        </button>
      </div>
      <ol aria-label={`Up next in ${playlist.name}`}>
        {nowEntry && <li className="flex items-center gap-1">{row(nowEntry, true)}</li>}
        {/* Dragged by pointer or touch; from the keyboard its handle takes the arrows. */}
        <SortableList
          ids={after.map((e) => e.episodeId)}
          label={title}
          onMove={moveEntry}
          keyboard={false}
        >
          {after.map((entry) => (
            <SortableRow key={entry.episodeId} id={entry.episodeId}>
              {(sortable) => (
                <li
                  ref={sortable.ref}
                  style={sortable.style}
                  className={`flex items-center gap-1 rounded-xl ${sortable.dragging ? "bg-player-track shadow-lg" : ""}`}
                >
                  {row(
                    entry,
                    false,
                    <Tip label="Drag to reorder">
                      <button
                        type="button"
                        {...sortable.handle}
                        aria-label={`Move ${title(entry.episodeId)}`}
                        aria-description="Up and down arrows move it one place"
                        onKeyDown={(event) => {
                          const index = after.findIndex((e) => e.episodeId === entry.episodeId)
                          if (event.key === "ArrowUp" && index > 0) {
                            event.preventDefault()
                            moveEntry(entry.episodeId, after[index - 2]?.episodeId ?? null)
                          } else if (event.key === "ArrowDown" && index < after.length - 1) {
                            event.preventDefault()
                            moveEntry(entry.episodeId, after[index + 1]?.episodeId ?? null)
                          }
                        }}
                        className="-mr-1 grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-full text-player-muted hover:bg-player-track hover:text-player-foreground active:cursor-grabbing"
                      >
                        <GripVertical aria-hidden="true" className="size-5" />
                      </button>
                    </Tip>
                  )}
                </li>
              )}
            </SortableRow>
          ))}
        </SortableList>
      </ol>
      {after.length === 0 && (
        // The same dashed card as every other empty state.
        <p className="mx-3 mt-2 rounded-2xl border border-dashed border-player-track px-4 py-5 text-center text-small text-player-muted">
          Nothing after this. In a View, use Play Next or Play Last to add Episodes.
        </p>
      )}
    </div>
  )
}

function SwitchPlaylist() {
  const state = useAppState()
  const control = useAtomSet(playbackAtom)
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  const { home } = useDrawer()
  return (
    <ul aria-label="Playlists" className="px-3">
      {state?.playlists.map((p) => {
        const start = p.cursor ?? p.entries[0]?.episodeId
        const active = p.id === state.activePlaylistId
        return (
          <li key={p.id}>
            <button
              type="button"
              disabled={start === undefined}
              onClick={() => {
                if (start !== undefined && !active) {
                  control({ _tag: "playEntry", playlistId: p.id, episodeId: start })
                }
                home()
              }}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-player-track disabled:opacity-50 ${active ? "bg-player-track" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className={`block text-row ${active ? "font-semibold" : ""}`}>{p.name}</span>
                <span className="block truncate text-small text-player-muted">
                  {active
                    ? "Playing from here"
                    : start
                      ? `${(p.entries.find((e) => e.episodeId === start)?.position ?? 0) > 0 ? "Resume at" : "Next"}: ${episodes.get(start)?.title ?? ""}`
                      : "No Entries"}
                </span>
              </span>
              <span className="text-small text-player-muted">{p.entries.length}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function NowPlayingDrawer() {
  const current = useNowPlaying()
  const { drawer, back, close, home } = useDrawer()
  const setDrawer = useAtomSet(drawerAtom)
  const page = drawer.stack.at(-1)
  // The Episode page stays on the Episode it opened for, even when Played moves playback on.
  const [pinned, setPinned] = useState<string | null>(null)
  if (page === "episode" && pinned === null && current !== null) setPinned(current.episodeId)
  if (page !== "episode" && pinned !== null) setPinned(null)
  // Back pops a stacked page, then closes the drawer (BROWSER-01).
  useBackLayers(drawer.open && current !== null ? 1 + drawer.stack.length : 0, () =>
    setDrawer((d) =>
      d.stack.length > 0 ? { ...d, stack: d.stack.slice(0, -1) } : { open: false, stack: [] }
    )
  )
  if (current === null) return null
  return (
    <Drawer.Root
      open={drawer.open}
      onOpenChange={(open, details) => {
        // Esc on a stacked page goes back one page, as Back does; on the main page it closes.
        if (
          !open &&
          details.reason === "escape-key" &&
          drawer.stack.length > (drawer.openedOn ?? 0)
        ) {
          details.cancel()
          setDrawer({ ...drawer, stack: drawer.stack.slice(0, -1) })
          return
        }
        setDrawer({ open, stack: open ? drawer.stack : [] })
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Drawer.Popup
          data-sheet="drawer"
          onKeyDown={wrapTab}
          // While a toast shows, its foot is kept free for it (components/feedback/Toasts).
          className="forced-colors:border forced-colors:border-[CanvasText] surface-dark fixed inset-x-0 bottom-0 z-50 flex h-[calc(100dvh-2.5rem)] pb-[var(--toast-space,0px)] translate-y-[var(--drawer-swipe-movement-y)] flex-col rounded-t-3xl bg-player text-player-foreground shadow-2xl transition-transform duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:h-[min(46rem,calc(100dvh-4rem))] md:rounded-t-2xl short:md:h-[calc(100dvh-1rem)] focus-visible:outline-none"
        >
          <div className="flex h-14 shrink-0 items-center gap-2 px-3">
            {page ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-row font-medium hover:bg-player-track"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
                Back
              </button>
            ) : (
              <span
                aria-hidden="true"
                className="mx-auto mt-1 h-1 w-10 rounded-full bg-player-track md:hidden"
              />
            )}
            {/* The top page's heading names the dialog (AX-01), as the Episode's title does
                on the main page. */}
            {page && (
              <Drawer.Title className="flex-1 text-center text-row font-semibold">
                {pageTitles[page]}
              </Drawer.Title>
            )}
            <Tip label={"Close"}>
              <button
                type="button"
                aria-label="Close Now Playing"
                onClick={close}
                className={`${iconButton} ${page ? "" : "absolute right-3"}`}
              >
                <ChevronDown aria-hidden="true" className="size-6" />
              </button>
            </Tip>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {page === undefined && (
              // Desktop: the player and Up next side by side in one centred column, not at
              // the sheet's far edges.
              <div className="md:mx-auto md:grid md:max-w-[64rem] md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-8 md:px-6">
                <MainPage current={current} />
                {/* Desktop: Chapters and Up next beside the player. */}
                <aside className="hidden space-y-6 md:block">
                  {current.chapters.length > 0 && (
                    <section>
                      <h3 className="px-6 pb-2 text-xs font-semibold tracking-[0.08em] text-player-muted uppercase">
                        Chapters
                      </h3>
                      <ChaptersList current={current} />
                    </section>
                  )}
                  <section>
                    <h3 className="px-6 pb-2 text-xs font-semibold tracking-[0.08em] text-player-muted uppercase">
                      Up next
                    </h3>
                    <UpNext current={current} />
                  </section>
                </aside>
              </div>
            )}
            {/* Each page centred under its centred title. */}
            {page !== undefined && (
              <div className="mx-auto w-full max-w-[44rem]">
                {page === "queue" && <UpNext current={current} />}
                {page === "chapters" && <ChaptersList current={current} />}
                {page === "playlists" && <SwitchPlaylist />}
                {page === "episode" && (
                  <EpisodeDetail
                    episodeId={pinned ?? current.episodeId}
                    tone="dark"
                    onPlay={home}
                  />
                )}
              </div>
            )}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
