import { Drawer } from "@base-ui/react/drawer"
import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ListMusic,
  ListOrdered,
  Pause,
  Play,
  SkipBack,
  SkipForward
} from "lucide-react"
import type { ReactNode } from "react"
import { entryEpisodesAtom } from "../../app/data.ts"
import { type DrawerPage, drawerAtom } from "../../app/drawer.ts"
import { useAppState, useNowPlaying } from "../../app/hooks.ts"
import { playbackAtom } from "../../app/runtime.ts"
import { chapterAt, nextChapterStart, previousChapterStart } from "../../lib/chapters.ts"
import { formatLength, formatTime } from "../../lib/time.ts"
import type { NowPlaying } from "../../playback/Playback.ts"
import { backSeconds, forwardSeconds } from "../../playback/Playback.ts"
import { EpisodeDetail } from "../episodes/EpisodeDetail.tsx"
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
    home: () => setDrawer({ open: true, stack: [] }),
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
      className="inline-flex h-11 items-center gap-2 rounded-full bg-player-track px-4 text-sm font-medium hover:bg-player-track/80 active:bg-player-track/60"
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
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-6 pb-8">
      <Artwork
        url={chapter?.artworkUrl ?? current.artworkUrl}
        name={current.podcast}
        size={320}
        className="aspect-square h-auto w-full max-w-[min(20rem,38dvh)] rounded-2xl shadow-lg"
      />
      {current.chapters.length > 0 && (
        <div className="flex w-full items-center gap-2">
          <button
            type="button"
            aria-label="Previous Chapter"
            title="Previous Chapter"
            onClick={() => seek(previousChapterStart(current.chapters, current.position))}
            className={iconButton}
          >
            <SkipBack aria-hidden="true" className="size-5 fill-current" />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-small text-player-muted">
            {chapter?.title ?? "Before the first Chapter"}
          </p>
          <button
            type="button"
            aria-label="Next Chapter"
            title="Next Chapter"
            disabled={nextChapterStart(current.chapters, current.position) === null}
            onClick={() => seek(nextChapterStart(current.chapters, current.position))}
            className={iconButton}
          >
            <SkipForward aria-hidden="true" className="size-5 fill-current" />
          </button>
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
            className="font-semibold text-player-foreground underline underline-offset-2"
          >
            Try again
          </button>
        </p>
      )}
      <div className="flex items-center gap-6">
        <button
          type="button"
          aria-label={`Back ${backSeconds} seconds`}
          title={`Back ${backSeconds} seconds`}
          onClick={() => control({ _tag: "skip", seconds: -backSeconds })}
          className={`${iconButton} size-14`}
        >
          <SkipIcon seconds={backSeconds} direction="back" large />
        </button>
        <button
          type="button"
          aria-label={current.playing ? "Pause" : "Play"}
          title={current.playing ? "Pause" : "Play"}
          onClick={() => control({ _tag: "toggle" })}
          className="grid size-18 place-items-center rounded-full border border-transparent bg-player-foreground text-player hover:bg-player-foreground/90 active:bg-player-foreground/75"
        >
          {current.playing ? (
            <Pause aria-hidden="true" className="size-8 fill-current" />
          ) : (
            <Play aria-hidden="true" className="size-8 translate-x-0.5 fill-current" />
          )}
        </button>
        <button
          type="button"
          aria-label={`Forward ${forwardSeconds} seconds`}
          title={`Forward ${forwardSeconds} seconds`}
          onClick={() => control({ _tag: "skip", seconds: forwardSeconds })}
          className={`${iconButton} size-14`}
        >
          <SkipIcon seconds={forwardSeconds} direction="forward" large />
        </button>
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
            Up next · {queued}
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
            <span className="w-14 shrink-0 text-xs text-player-muted tabular-nums">
              {formatTime(c.start)}
            </span>
            <span className={`flex-1 text-sm ${i === playing ? "font-semibold" : ""}`}>
              {c.title}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

function UpNext({ current }: { readonly current: NowPlaying }) {
  const state = useAppState()
  const control = useAtomSet(playbackAtom)
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  const { home, push } = useDrawer()
  const playlist = state?.playlists.find((p) => p.id === current.playlistId)
  if (!playlist) return null
  return (
    <div className="px-3">
      <div className="flex items-center justify-between px-3 pb-2">
        <p className="text-small text-player-muted">From {playlist.name}</p>
        <button
          type="button"
          onClick={() => push("playlists")}
          className="h-10 rounded-full px-3 text-sm font-medium text-player-foreground underline-offset-2 hover:underline"
        >
          Switch Playlist
        </button>
      </div>
      <ol aria-label={`${playlist.name} Entries`}>
        {playlist.entries.map((entry) => {
          const episode = episodes.get(entry.episodeId)
          const isCurrent = entry.episodeId === current.episodeId
          return (
            <li key={entry.episodeId}>
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
                    control({
                      _tag: "playEntry",
                      playlistId: playlist.id,
                      episodeId: entry.episodeId
                    })
                  }
                  home()
                }}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-player-track ${isCurrent ? "bg-player-track" : ""}`}
              >
                <Artwork
                  url={episode?.artworkUrl ?? null}
                  name={episode?.podcast ?? "?"}
                  size={40}
                />
                <span className="min-w-0 flex-1">
                  <span className={`line-clamp-2 text-sm ${isCurrent ? "font-semibold" : ""}`}>
                    {episode?.title ?? "Episode unavailable"}
                  </span>
                  <span className="text-xs text-player-muted">
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
            </li>
          )
        })}
      </ol>
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
                <span className={`block text-sm ${active ? "font-semibold" : ""}`}>{p.name}</span>
                <span className="block truncate text-xs text-player-muted">
                  {active
                    ? "Playing from here"
                    : start
                      ? `Resume at: ${episodes.get(start)?.title ?? ""}`
                      : "No Entries"}
                </span>
              </span>
              <span className="text-xs text-player-muted">{p.entries.length}</span>
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
  if (current === null) return null
  return (
    <Drawer.Root
      open={drawer.open}
      onOpenChange={(open) => setDrawer({ open, stack: open ? drawer.stack : [] })}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Drawer.Popup className="surface-dark fixed inset-x-0 bottom-0 z-50 flex h-[calc(100dvh-2.5rem)] translate-y-[var(--drawer-swipe-movement-y)] flex-col rounded-t-3xl bg-player text-player-foreground shadow-2xl transition-transform duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full md:h-[min(46rem,calc(100dvh-4rem))] md:rounded-t-2xl">
          <div className="flex h-14 shrink-0 items-center gap-2 px-3">
            {page ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-sm font-medium hover:bg-player-track"
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
            {page && (
              <h2 className="flex-1 text-center text-sm font-semibold">{pageTitles[page]}</h2>
            )}
            <button
              type="button"
              aria-label="Close Now Playing"
              title="Close"
              onClick={close}
              className={`${iconButton} ${page ? "" : "absolute right-3"}`}
            >
              <ChevronDown aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {page === undefined && (
              <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-6 md:px-6">
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
            {page === "queue" && <UpNext current={current} />}
            {page === "chapters" && <ChaptersList current={current} />}
            {page === "playlists" && <SwitchPlaylist />}
            {page === "episode" && (
              <EpisodeDetail episodeId={current.episodeId} tone="dark" onPlay={home} />
            )}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
