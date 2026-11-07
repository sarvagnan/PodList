import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react"
import { Link, Outlet, useRouter } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import {
  AudioLines,
  Filter,
  Library,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward
} from "lucide-react"
import { useEffect } from "react"
import { type DrawerPage, drawerAtom } from "../../app/drawer.ts"
import { useAppState, useLibraryReady } from "../../app/hooks.ts"
import { backgroundSyncAtom, nowPlayingAtom, playbackAtom } from "../../app/runtime.ts"
import { chapterAt, nextChapterStart, previousChapterStart } from "../../lib/chapters.ts"
import { backSeconds, forwardSeconds } from "../../playback/Playback.ts"
import { openShortcuts, Shortcuts } from "../feedback/Shortcuts.tsx"
import { Toasts } from "../feedback/Toasts.tsx"
import { UndoShortcut } from "../feedback/UndoShortcut.tsx"
import { NowPlayingDrawer } from "../player/NowPlayingDrawer.tsx"
import { Scrubber } from "../player/Scrubber.tsx"
import { SkipIcon } from "../player/SkipIcon.tsx"
import { Artwork } from "./Artwork.tsx"
import { SyncIndicator } from "./SyncIndicator.tsx"

// Variant A (docs/design/ui-layout.md): phone has Views / Playlists / Library tabs with a
// mini-player above them; desktop has a sidebar of Views and Playlists and a player bar.

const tabs = [
  { to: "/views", label: "Views", icon: Filter },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/library", label: "Library", icon: Library }
] as const

/** The playing Episode's title; a placeholder bar while its details are still syncing. */
function TrackTitle({ title, className }: { readonly title: string; readonly className: string }) {
  const ready = useLibraryReady()
  if (title === "" && !ready) {
    return (
      <span
        role="status"
        aria-label="Loading Episode"
        className="block h-3.5 w-40 rounded bg-player-track"
      />
    )
  }
  return <p className={`truncate font-semibold ${className}`}>{title || "Episode unavailable"}</p>
}

function NowPlaying({ variant }: { readonly variant: "phone" | "desktop" }) {
  const state = useAppState()
  const current = AsyncResult.getOrElse(useAtomValue(nowPlayingAtom), () => null)
  const control = useAtomSet(playbackAtom)
  const setDrawer = useAtomSet(drawerAtom)
  const openDrawer = (stack: ReadonlyArray<DrawerPage>) => setDrawer({ open: true, stack })
  if (current === null) return null
  const playlist = state?.playlists.find((p) => p.id === current.playlistId)
  const label = `${current.podcast} · ${playlist?.name ?? ""}`
  const progress = current.duration ? Math.min(100, (current.position / current.duration) * 100) : 0
  const button =
    "grid size-11 shrink-0 place-items-center rounded-full text-player-foreground hover:bg-player-track active:bg-player-track/70"
  const toggle = (
    <button
      type="button"
      aria-label={current.playing ? "Pause" : "Play"}
      title={current.playing ? "Pause" : "Play"}
      onClick={() => control({ _tag: "toggle" })}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-transparent bg-player-foreground text-player hover:bg-player-foreground/90 active:bg-player-foreground/75"
    >
      {current.playing ? (
        <Pause aria-hidden="true" className="size-5 fill-current" />
      ) : (
        <Play aria-hidden="true" className="size-5 translate-x-px fill-current" />
      )}
    </button>
  )
  const back = (
    <button
      type="button"
      aria-label={`Back ${backSeconds} seconds`}
      title={`Back ${backSeconds} seconds`}
      onClick={() => control({ _tag: "skip", seconds: -backSeconds })}
      className={button}
    >
      <SkipIcon seconds={backSeconds} direction="back" />
    </button>
  )
  const forward = (
    <button
      type="button"
      aria-label={`Forward ${forwardSeconds} seconds`}
      title={`Forward ${forwardSeconds} seconds`}
      onClick={() => control({ _tag: "skip", seconds: forwardSeconds })}
      className={button}
    >
      <SkipIcon seconds={forwardSeconds} direction="forward" />
    </button>
  )
  const bar = (
    <span
      aria-hidden="true"
      className="progress-track absolute inset-x-0 bottom-0 h-0.5 bg-player-track"
    >
      <span className="progress-fill block h-full bg-progress" style={{ width: `${progress}%` }} />
    </span>
  )
  // Plain words and a way forward, not the media element's own text (COPY-02).
  const error = current.error && (
    <p role="alert" className="flex items-center gap-2 text-xs text-player-danger">
      <span className="truncate">Couldn’t play this Episode.</span>
      <button
        type="button"
        onClick={() => control({ _tag: "retry" })}
        className="shrink-0 rounded-full bg-player-track px-3 py-1 font-semibold text-player-foreground hover:bg-player-track/80 active:bg-player-track/60"
      >
        Try again
      </button>
    </p>
  )

  if (variant === "phone") {
    return (
      <section
        aria-label="Now playing"
        className="surface-dark relative mx-2.5 flex items-center gap-2 overflow-hidden rounded-2xl bg-player p-2.5 text-player-foreground"
      >
        {/* Tapping the bar outside its buttons opens Now Playing. */}
        <button
          type="button"
          aria-label={`Open Now Playing: ${current.title}`}
          onClick={() => openDrawer([])}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left"
        >
          <Artwork url={current.artworkUrl} name={current.podcast} size={44} />
          <span className="min-w-0 flex-1 pl-1">
            <TrackTitle title={current.title} className="text-small" />
            {current.error ? (
              <span role="alert" className="block truncate text-xs text-player-danger">
                Couldn’t play this Episode.
              </span>
            ) : (
              <span className="block truncate text-xs text-player-muted">{label}</span>
            )}
          </span>
        </button>
        {current.error ? (
          <button
            type="button"
            onClick={() => control({ _tag: "retry" })}
            className="h-9 shrink-0 rounded-full bg-player-track px-3 text-xs font-semibold text-player-foreground active:bg-player-track/70"
          >
            Try again
          </button>
        ) : (
          back
        )}
        {toggle}
        {forward}
        {bar}
      </section>
    )
  }
  const chapter = current.chapters[chapterAt(current.chapters, current.position)]
  const queued = playlist
    ? playlist.entries.length -
      1 -
      playlist.entries.findIndex((e) => e.episodeId === current.episodeId)
    : 0
  const chapterButton = (label: string, target: number | null, Icon: typeof SkipBack) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={target === null}
      onClick={() => target !== null && control({ _tag: "seek", seconds: target })}
      className={`${button} disabled:opacity-40 disabled:hover:bg-transparent`}
    >
      <Icon aria-hidden="true" className="size-5 fill-current" />
    </button>
  )
  return (
    <section
      aria-label="Now playing"
      className="surface-dark fixed inset-x-0 bottom-0 z-10 hidden grid-cols-[minmax(0,1fr)_minmax(0,608px)_minmax(0,1fr)] items-center gap-6 bg-player px-5 py-2.5 text-player-foreground md:grid"
    >
      <div className="flex min-w-0 flex-col">
        <button
          type="button"
          aria-label={`Open Now Playing: ${current.title}`}
          onClick={() => openDrawer([])}
          className="flex min-w-0 items-center gap-3 rounded-xl text-left"
        >
          {/* Chapter artwork, then the Episode's, then the podcast's. */}
          <Artwork
            url={chapter?.artworkUrl ?? current.artworkUrl}
            name={current.podcast}
            size={48}
          />
          <span className="min-w-0">
            <TrackTitle title={current.title} className="text-sm" />
            {!current.error && (
              <span className="block truncate text-xs text-player-muted">
                {chapter ? `${chapter.title} · ${label}` : label}
              </span>
            )}
          </span>
        </button>
        {error}
      </div>
      <div className="flex flex-col items-stretch">
        <div className="flex items-center justify-center gap-1.5">
          {current.chapters.length > 0 &&
            chapterButton(
              "Previous Chapter",
              previousChapterStart(current.chapters, current.position),
              SkipBack
            )}
          {back}
          {toggle}
          {forward}
          {current.chapters.length > 0 &&
            chapterButton(
              "Next Chapter",
              nextChapterStart(current.chapters, current.position),
              SkipForward
            )}
        </div>
        <Scrubber
          position={current.position}
          duration={current.duration}
          chapters={current.chapters}
          onSeek={(seconds) => control({ _tag: "seek", seconds })}
        />
      </div>
      <div className="flex justify-end">
        {playlist && (
          <button
            type="button"
            onClick={() => openDrawer(["queue"])}
            title={`Up next in ${playlist.name}`}
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm whitespace-nowrap text-player-foreground hover:bg-player-track active:bg-player-track/70"
          >
            <ListMusic aria-hidden="true" className="size-5" />
            <span>
              {queued} <span className="text-player-muted">up next</span>
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

/** Placeholder rows while the Library loads, so headings never sit over nothing (FLOW-06). */
function SidebarSkeleton() {
  return (
    <span role="status" aria-label="Loading" className="flex flex-col gap-0.5">
      {[0.7, 0.55, 0.62].map((width) => (
        <span key={width} className="flex min-h-9 items-center px-2.5">
          <span className="h-3 rounded bg-secondary" style={{ width: `${width * 100}%` }} />
        </span>
      ))}
    </span>
  )
}

function Sidebar() {
  const state = useAppState()
  const ready = useLibraryReady()
  const link =
    "flex min-h-9 items-center justify-between gap-2 rounded-lg px-2.5 text-sm text-foreground hover:bg-secondary active:bg-input [&.active]:bg-accent [&.active]:font-semibold"
  const heading =
    "px-2.5 pt-5 pb-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
  return (
    <nav
      aria-label="Library and lists"
      className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r px-3 pt-5 pb-24 md:flex"
    >
      <p className="px-2.5 pb-2 font-heading text-lg font-semibold">PodList</p>
      <p className={heading}>Views</p>
      {state === null && <SidebarSkeleton />}
      {state?.views.length === 0 && ready && (
        <p className="px-2.5 py-1.5 text-small text-muted-foreground">No Views yet</p>
      )}
      {state?.views.map((v) => (
        <Link key={v.id} to="/views/$viewId" params={{ viewId: v.id }} className={link}>
          {v.name}
        </Link>
      ))}
      <p className={heading}>Playlists</p>
      {state === null && <SidebarSkeleton />}
      {state?.playlists.map((p) => {
        const active = p.id === state.activePlaylistId
        return (
          <Link
            key={p.id}
            to="/playlists/$playlistId"
            params={{ playlistId: p.id }}
            className={link}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{p.name}</span>
              {/* A shape and a name, not only a colour (AX-02). */}
              {active && (
                <AudioLines
                  aria-label="Active Playlist"
                  className="size-4 shrink-0 text-positive"
                />
              )}
            </span>
            <span className="text-xs text-muted-foreground">{p.entries.length}</span>
          </Link>
        )
      })}
      <div className="flex-1" />
      <SyncIndicator variant="desktop" />
      <Link to="/library" className={link}>
        Library
      </Link>
      <button type="button" onClick={openShortcuts} className={`${link} text-muted-foreground`}>
        Keyboard shortcuts
        <kbd className="rounded border border-input px-1.5 font-sans text-xs">?</kbd>
      </button>
    </nav>
  )
}

function BottomTabs() {
  return (
    <nav
      aria-label="Sections"
      className="flex gap-1 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground [&.active]:font-bold [&.active]:text-primary"
        >
          {/* The selected tab gets a pill behind its icon as well as colour (AX-02). */}
          <span className="tab-indicator grid h-8 w-16 place-items-center rounded-full group-[.active]:bg-accent">
            <Icon aria-hidden="true" className="size-[1.375rem]" />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  )
}

/** After moving to another screen, focus its heading, as a page load would (WKEY-03). */
function useFocusOnNavigation() {
  const router = useRouter()
  useEffect(
    () =>
      router.subscribe("onResolved", (event) => {
        if (event.fromLocation === undefined || !event.pathChanged) return
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true })
          window.scrollTo(0, 0)
        })
      }),
    [router]
  )
}

/** Space plays or pauses when no control has focus, as in other media apps. */
function usePlayPauseKey() {
  const control = useAtomSet(playbackAtom)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " || event.repeat || event.metaKey || event.ctrlKey || event.altKey)
        return
      const target = event.target as HTMLElement
      if (target.closest("input, textarea, select, button, a, [contenteditable], [role=dialog]")) {
        return
      }
      event.preventDefault()
      control({ _tag: "toggle" })
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [control])
}

export function AppShell() {
  useAtomMount(backgroundSyncAtom)
  useFocusOnNavigation()
  usePlayPauseKey()
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-lg bg-card px-4 py-2.5 text-sm font-semibold shadow focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-44 outline-none md:pb-28">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 bg-background md:hidden">
        <SyncIndicator variant="phone" />
        <NowPlaying variant="phone" />
        <BottomTabs />
      </div>
      <NowPlaying variant="desktop" />
      <NowPlayingDrawer />
      <Toasts />
      <UndoShortcut />
      <Shortcuts />
    </div>
  )
}
