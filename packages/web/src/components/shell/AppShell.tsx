import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react"
import { State } from "@podlist/domain"
import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import {
  AudioLines,
  Filter,
  Library,
  ListMusic,
  Pause,
  Play,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Trash2
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { type DrawerPage, drawerAtom } from "../../app/drawer.ts"
import { useAppState, useLibraryReady, useNowPlaying } from "../../app/hooks.ts"
import { backgroundSyncAtom, nowPlayingAtom, playbackAtom } from "../../app/runtime.ts"
import { cameFrom, sectionOf } from "../../lib/cameFrom.ts"
import { chapterAt, nextChapterStart, previousChapterStart } from "../../lib/chapters.ts"
import { singleKeyShortcuts } from "../../lib/remembered.ts"
import { leftFrom, selectorFor } from "../../lib/returnFocus.ts"
import { inMacApp } from "../../lib/share.ts"
import { backSeconds, forwardSeconds } from "../../playback/Playback.ts"
import { openShortcuts, Shortcuts } from "../feedback/Shortcuts.tsx"
import { Tip } from "../feedback/Tip.tsx"
import { Toasts } from "../feedback/Toasts.tsx"
import { UndoShortcut } from "../feedback/UndoShortcut.tsx"
import { NowPlayingDrawer } from "../player/NowPlayingDrawer.tsx"
import { PlayerMenus } from "../player/PlayerMenus.tsx"
import { Scrubber } from "../player/Scrubber.tsx"
import { SkipIcon } from "../player/SkipIcon.tsx"
import { usePlaybackProblem } from "../player/usePlaybackProblem.ts"
import { NewPlaylistDialog } from "../playlists/NewPlaylistDialog.tsx"
import { useViewActions } from "../views/useViewActions.ts"
import { Artwork } from "./Artwork.tsx"
import { FirstRun, showGettingStarted } from "./FirstRun.tsx"
import { SyncIndicator } from "./SyncIndicator.tsx"
import { VersionNotice } from "./VersionNotice.tsx"

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
  // "Unavailable" only once it has had a moment to arrive: a cold start looks the Episode
  // up after the bar first draws, and mustn't flash an error meanwhile (APPEAR-11).
  const [patient, setPatient] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setPatient(false), 2000)
    return () => clearTimeout(timer)
  }, [])
  if (title === "" && (!ready || patient)) {
    // As many lines as the title will take (two where the bar is narrow), so the bar keeps
    // its height when the title arrives (FLOW-01).
    return (
      <div className="@container min-w-0">
        <span role="status" aria-label="Loading Episode" className="block">
          <span className={`flex h-[1lh] items-center font-semibold ${className}`}>
            <span className="block h-3.5 w-40 max-w-full rounded bg-player-track" />
          </span>
          <span
            className={`hidden h-[1lh] items-center font-semibold @max-[6rem]:flex ${className}`}
          >
            <span className="block h-3.5 w-20 max-w-full rounded bg-player-track" />
          </span>
        </span>
      </div>
    )
  }
  // One line, so the bar keeps its height as titles arrive; a second line only when the
  // text is large for the space (WTYPE-02), measured in rem.
  return (
    <div className="@container min-w-0">
      <p className={`line-clamp-1 font-semibold break-words @max-[6rem]:line-clamp-2 ${className}`}>
        {title || "Episode unavailable"}
      </p>
    </div>
  )
}

function NowPlaying({ variant }: { readonly variant: "phone" | "desktop" }) {
  const state = useAppState()
  const current = AsyncResult.getOrElse(useAtomValue(nowPlayingAtom), () => null)
  const control = useAtomSet(playbackAtom)
  const setDrawer = useAtomSet(drawerAtom)
  const openDrawer = (stack: ReadonlyArray<DrawerPage>) =>
    setDrawer({ open: true, stack, openedOn: stack.length })
  const problem = usePlaybackProblem(current)
  if (current === null) return null
  const playlist = state?.playlists.find((p) => p.id === current.playlistId)
  // Nothing half-filled while the catalogue arrives on a new Device (APPEAR-11).
  const label = current.title ? `${current.podcast} · ${playlist?.name ?? ""}` : "\u00a0"
  const progress = current.duration ? Math.min(100, (current.position / current.duration) * 100) : 0
  const queued = playlist
    ? playlist.entries.length -
      1 -
      playlist.entries.findIndex((e) => e.episodeId === current.episodeId)
    : 0
  const button =
    "grid size-11 shrink-0 place-items-center rounded-full text-player-foreground hover:bg-player-track active:bg-player-track/70"
  const toggle = (
    <Tip label={current.playing ? "Pause" : "Play"}>
      <button
        type="button"
        aria-label={current.playing ? "Pause" : "Play"}
        onClick={() => control({ _tag: "toggle" })}
        className="grid size-11 shrink-0 place-items-center rounded-full border border-transparent bg-player-foreground text-player hover:bg-player-foreground/90 active:bg-player-foreground/75"
      >
        {current.playing ? (
          <Pause aria-hidden="true" className="size-5 fill-current" />
        ) : (
          <Play aria-hidden="true" className="size-5 translate-x-px fill-current" />
        )}
      </button>
    </Tip>
  )
  const back = (
    <Tip label={`Back ${backSeconds} seconds`}>
      <button
        type="button"
        aria-label={`Back ${backSeconds} seconds`}
        onClick={() => control({ _tag: "skip", seconds: -backSeconds })}
        className={button}
      >
        <SkipIcon seconds={backSeconds} direction="back" />
      </button>
    </Tip>
  )
  const forward = (
    <Tip label={`Forward ${forwardSeconds} seconds`}>
      <button
        type="button"
        aria-label={`Forward ${forwardSeconds} seconds`}
        onClick={() => control({ _tag: "skip", seconds: forwardSeconds })}
        className={button}
      >
        <SkipIcon seconds={forwardSeconds} direction="forward" />
      </button>
    </Tip>
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
  const error = problem && (
    <p role="alert" className="flex items-center gap-2 text-small text-player-danger">
      <span className="truncate" title={problem.long}>
        {problem.short}
      </span>
      <span className="sr-only">{problem.long}</span>
      {problem.retry && (
        <button
          type="button"
          onClick={problem.retry}
          className="shrink-0 rounded-full bg-player-track px-3 py-1 font-semibold text-player-foreground hover:bg-player-track/80 active:bg-player-track/60"
        >
          Try again
        </button>
      )}
    </p>
  )

  if (variant === "phone") {
    return (
      <section
        aria-label="Now playing"
        className="@container surface-dark relative mx-2.5 flex items-center gap-2 overflow-hidden rounded-2xl bg-player p-2.5 text-player-foreground forced-colors:border forced-colors:border-[CanvasText]"
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
            {problem ? (
              // The short form fits the bar; the drawer says the rest.
              <span role="alert" className="block truncate text-small text-player-danger">
                {problem.short}
                <span className="sr-only">. {problem.long}</span>
              </span>
            ) : (
              <span className="block truncate text-small text-player-muted">{label}</span>
            )}
          </span>
        </button>
        {problem?.retry ? (
          <button
            type="button"
            onClick={problem.retry}
            className="h-9 shrink-0 rounded-full bg-player-track px-3 text-small font-semibold text-player-foreground active:bg-player-track/70"
          >
            Try again
          </button>
        ) : (
          // Large text on a small phone: the title keeps the room; back 15 is in Now Playing.
          // Back 15 as the design has it; only the narrowest bar gives it up for the title.
          <span className="contents @max-[20rem]:hidden">{back}</span>
        )}
        {toggle}
        {forward}
        {/* The queue badge (docs/design/ui-layout.md): Entries after this one; it opens
            Now Playing on Up next. */}
        {playlist && (
          <button
            type="button"
            aria-label={`Up next: ${queued} in ${playlist.name}`}
            onClick={() => openDrawer(["queue"])}
            className={`${button} relative @max-[17rem]:hidden`}
          >
            <ListMusic aria-hidden="true" className="size-5" />
            {queued > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0.5 right-0 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-player-foreground px-1 text-xs leading-none font-bold text-player tabular-nums"
              >
                {queued}
              </span>
            )}
          </button>
        )}
        {bar}
      </section>
    )
  }
  const chapter = current.chapters[chapterAt(current.chapters, current.position)]
  const chapterButton = (label: string, target: number | null, Icon: typeof SkipBack) => (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        disabled={target === null}
        onClick={() => target !== null && control({ _tag: "seek", seconds: target })}
        className={`${button} disabled:opacity-40 disabled:hover:bg-transparent`}
      >
        <Icon aria-hidden="true" className="size-5 fill-current" />
      </button>
    </Tip>
  )
  return (
    <section
      aria-label="Now playing"
      className="surface-dark fixed inset-x-0 bottom-0 z-10 hidden grid-cols-[minmax(160px,1fr)_minmax(260px,608px)_minmax(0,1fr)] items-center gap-6 bg-player px-5 py-2.5 text-player-foreground short:py-1.5 md:grid forced-colors:border-t forced-colors:border-[CanvasText]"
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
          {/* Fills the column, so the title has its width (not the subtitle's). */}
          <span className="min-w-0 flex-1">
            <TrackTitle title={current.title} className="text-row" />
            {!current.error && (
              <span className="block truncate text-small text-player-muted">
                {/* Nothing until the title arrives: no half-filled line (APPEAR-11). */}
                {chapter && current.title ? `${chapter.title} · ${label}` : label}
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
      <div className="@container flex min-w-0 items-center justify-end gap-1">
        {/* Speed and sleep beside Up next on wide windows (docs/design/ui-layout.md). */}
        <span className="hidden @min-[18rem]:flex">
          <PlayerMenus current={current} />
        </span>
        {playlist && (
          <Tip label={`Up next in ${playlist.name}`}>
            <button
              type="button"
              onClick={() => openDrawer(["queue"])}
              className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-row whitespace-nowrap text-player-foreground hover:bg-player-track active:bg-player-track/70"
            >
              <ListMusic aria-hidden="true" className="size-5" />
              <span>
                {queued} <span className="text-player-muted max-lg:sr-only">up next</span>
              </span>
            </button>
          </Tip>
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
  const now = useNowPlaying()
  const state = useAppState()
  const { create: createView } = useViewActions()
  const [newPlaylist, setNewPlaylist] = useState(false)
  const router = useRouter()
  // The Mac app's File and Help menus.
  useEffect(() => {
    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<string>).detail
      if (command === "newPlaylist") setNewPlaylist(true)
      if (command === "newView") void createView()
      if (command === "gettingStarted") showGettingStarted((to) => router.navigate({ to }))
    }
    document.addEventListener("podlist:command", onCommand)
    return () => document.removeEventListener("podlist:command", onCommand)
  }, [createView, router])
  const ready = useLibraryReady()
  // An Episode keeps the highlight of the list it was opened from (LIST-06).
  const path = useRouterState({ select: (r) => r.location.pathname })
  const entry = useRouterState({ select: (r) => r.location.state.__TSR_key ?? "initial" })
  const from = path.startsWith("/episodes") ? cameFrom.of(entry) : null
  const held = (to: string) =>
    from !== null && (from === to || from.startsWith(`${to}/`)) ? " active" : ""
  const link =
    "flex min-h-9 items-center justify-between gap-2 rounded-lg px-2.5 text-row text-foreground hover:bg-secondary active:bg-input [&.active]:bg-accent [&.active]:font-semibold [&.active]:shadow-[inset_3px_0_0_var(--color-primary)]"
  // The section headings lead to their overviews (all Views, all Playlists), and show
  // as selected there.
  const heading =
    "mt-4 flex min-h-8 items-center rounded-lg px-2.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
  return (
    <nav
      aria-label="Library and lists"
      className="sticky top-0 hidden h-dvh w-56 shrink-0 scroll-pb-28 flex-col gap-0.5 overflow-y-auto border-r px-3 pt-5 pb-24 md:flex"
    >
      <p className="px-2.5 pb-2 font-heading text-lg font-semibold">PodList</p>
      <Link
        to="/search"
        className={`mb-1 flex h-10 items-center gap-2 rounded-lg bg-secondary px-2.5 text-row text-muted-foreground hover:bg-input active:bg-input/70 [&.active]:bg-accent [&.active]:text-foreground${held("/search")}`}
      >
        <Search aria-hidden="true" className="size-4" />
        <span className="flex-1">Search</span>
        {/Mac/.test(navigator.platform) && (
          <kbd className="rounded border border-input px-1.5 font-sans text-xs">⌘K</kbd>
        )}
      </Link>
      <div className="flex items-center justify-between">
        <Link to="/views" activeOptions={{ exact: true }} className={heading}>
          Views
        </Link>
        <Tip label="New View">
          <button
            type="button"
            aria-label="New View"
            onClick={() => void createView()}
            className="mt-4 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </Tip>
      </div>
      {state === null && <SidebarSkeleton />}
      {state?.views.length === 0 && ready && (
        <p className="px-2.5 py-1.5 text-small text-muted-foreground">No Views yet</p>
      )}
      {state?.views.map((v) => (
        <Link
          key={v.id}
          to="/views/$viewId"
          params={{ viewId: v.id }}
          className={`${link}${held(`/views/${v.id}`)}`}
        >
          {v.name}
        </Link>
      ))}
      <div className="flex items-center justify-between">
        <Link to="/playlists" activeOptions={{ exact: true }} className={heading}>
          Playlists
        </Link>
        <Tip label="New Playlist">
          <button
            type="button"
            aria-label="New Playlist"
            onClick={() => setNewPlaylist(true)}
            className="mt-4 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </Tip>
      </div>
      {state === null && <SidebarSkeleton />}
      {state?.playlists.map((p) => {
        const active = p.id === state.activePlaylistId
        return (
          <Link
            key={p.id}
            to="/playlists/$playlistId"
            params={{ playlistId: p.id }}
            className={`${link}${held(`/playlists/${p.id}`)}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{p.name}</span>
              {/* A shape and a name, not only a colour (AX-02). */}
              {/* The Active Playlist: a waveform while it plays, a dot while it waits, so the
                  mark doesn't say "playing" when nothing is (a shape too, not only colour). */}
              {active &&
                (now?.playlistId === p.id && now.playing ? (
                  <AudioLines
                    aria-label="Active Playlist, playing"
                    className="size-4 shrink-0 text-primary"
                  />
                ) : (
                  // Said in words on hover and focus too, not only to screen readers.
                  <Tip label="Active Playlist">
                    <span
                      role="img"
                      aria-label="Active Playlist"
                      // Forced colours drop backgrounds: it keeps the text colour (APPEAR-03).
                      className="size-2 shrink-0 rounded-full bg-primary forced-colors:bg-[CanvasText] forced-colors:forced-color-adjust-none"
                    />
                  </Tip>
                ))}
            </span>
            <span className="text-small text-muted-foreground">{p.entries.length}</span>
          </Link>
        )
      })}
      {state !== null && State.trashOf(state).length > 0 && (
        // Set apart from the Playlists above it: an icon and a little space, so it doesn't
        // read as one of them.
        <Link to="/playlists/trash" className={`${link} mt-1 text-muted-foreground`}>
          <span className="flex items-center gap-2">
            <Trash2 aria-hidden="true" className="size-4" />
            Trash
          </span>
          <span className="text-xs">{State.trashOf(state).length}</span>
        </Link>
      )}
      {newPlaylist && <NewPlaylistDialog open={newPlaylist} onOpenChange={setNewPlaylist} />}
      <div className="flex-1" />
      <SyncIndicator variant="desktop" />
      <Link to="/library" className={`${link}${held("/library")}`}>
        Library
      </Link>
      <Link to="/settings" className={link}>
        Settings
      </Link>
      <button type="button" onClick={openShortcuts} className={`${link} text-muted-foreground`}>
        Keyboard shortcuts
        <kbd className="rounded border border-input px-1.5 font-sans text-xs whitespace-nowrap">
          {/Mac/.test(navigator.platform) ? "⌘/" : "Ctrl+/"}
        </kbd>
      </button>
    </nav>
  )
}

function BottomTabs() {
  // Screens reached from a tab keep that tab selected: Episodes and Search from Views,
  // Settings from Library (LIST-06).
  const path = useRouterState({ select: (r) => r.location.pathname })
  const entry = useRouterState({ select: (r) => r.location.state.__TSR_key ?? "initial" })
  // An Episode belongs to the section it was opened from (a Playlist, a podcast, a View).
  const episodeSection = path.startsWith("/episodes") ? sectionOf(cameFrom.of(entry)) : null
  const section = (to: string) =>
    episodeSection === to ||
    (to === "/views" && path.startsWith("/search")) ||
    (to === "/library" && path.startsWith("/settings"))
  return (
    <nav
      aria-label="Sections"
      className="flex gap-1 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          aria-current={section(to) ? "page" : undefined}
          className={`group flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-small font-medium text-muted-foreground [&.active]:font-bold [&.active]:text-primary ${section(to) ? "active" : ""}`}
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

/**
 * After moving to another screen, focus its heading, as a page load would; coming back
 * (Back or Forward), focus the control that took you away, so the place is kept (WKEY-03).
 */
/** A file dropped anywhere but a drop area must not open in place of the app (DRAG-01). */
function useStrayDropGuard() {
  useEffect(() => {
    const guard = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('[data-file-drop], input[type="file"]')) return
      event.preventDefault()
      if (event.type === "dragover") event.dataTransfer.dropEffect = "none"
    }
    window.addEventListener("dragover", guard)
    window.addEventListener("drop", guard)
    return () => {
      window.removeEventListener("dragover", guard)
      window.removeEventListener("drop", guard)
    }
  }, [])
}

function useFocusOnNavigation() {
  const router = useRouter()
  useEffect(() => {
    const keyOf = (location: { readonly state: { readonly __TSR_key?: string } }) =>
      location.state.__TSR_key ?? "initial"
    const leaving = router.subscribe("onBeforeNavigate", (event) => {
      if (event.fromLocation === undefined || !event.pathChanged) return
      // Before the next screen renders, so its back link can name where it came from.
      cameFrom.set(event.fromLocation.pathname, keyOf(event.toLocation))
      const selector = selectorFor(document.activeElement)
      if (selector) leftFrom.set(keyOf(event.fromLocation), selector)
    })
    const arrived = router.subscribe("onResolved", (event) => {
      if (event.fromLocation === undefined || !event.pathChanged) return
      const back = leftFrom.get(keyOf(event.toLocation))
      // The heading or the row may arrive a moment later, with the screen's data: try for
      // a second.
      let tries = 60
      const focusHere = () => {
        // A screen that put focus somewhere itself (Search's field) keeps it; a heading
        // focused for want of anything better gives way to the row it was left from.
        const main = document.querySelector("main")
        const active = document.activeElement
        if (
          main?.contains(active) &&
          active !== main &&
          !(back && active instanceof HTMLElement && active.matches("main h1"))
        )
          return
        // The row it left from, once its list is back; the heading if it doesn't return.
        const target =
          (back ? document.querySelector<HTMLElement>(back) : null) ??
          (back && tries > 1 ? null : document.querySelector<HTMLElement>("main h1"))
        if (target !== null) target.focus({ preventScroll: true })
        else if (--tries > 0) requestAnimationFrame(focusHere)
      }
      requestAnimationFrame(focusHere)
    })
    return () => {
      leaving()
      arrived()
    }
  }, [router])
}

/** The Mac app's Controls menu: play/pause, skips and Chapters, sent as an event. */
function useMenuControls() {
  const control = useAtomSet(playbackAtom)
  const current = useRef<ReturnType<typeof useNowPlaying>>(null)
  current.current = useNowPlaying()
  useEffect(() => {
    const onControl = (event: Event) => {
      const playing = current.current
      if (playing === null) return
      const seek = (seconds: number | null) =>
        seconds !== null && control({ _tag: "seek", seconds })
      switch ((event as CustomEvent<string>).detail) {
        case "toggle":
          return control({ _tag: "toggle" })
        case "back":
          return control({ _tag: "skip", seconds: -backSeconds })
        case "forward":
          return control({ _tag: "skip", seconds: forwardSeconds })
        case "previousChapter":
          return seek(previousChapterStart(playing.chapters, playing.position))
        case "nextChapter":
          return seek(nextChapterStart(playing.chapters, playing.position))
      }
    }
    document.addEventListener("podlist:control", onControl)
    // The Mac app's ⌘← ⌘→ (skips) and ⌥⌘← ⌥⌘→ (Chapters), which its menu shows but
    // leaves to the page, so text fields keep them for the caret (BROWSER-07).
    const onKey = (event: KeyboardEvent) => {
      if (!inMacApp || !event.metaKey || event.ctrlKey || event.shiftKey) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      const target = event.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable]")) return
      event.preventDefault()
      const left = event.key === "ArrowLeft"
      const command = event.altKey
        ? left
          ? "previousChapter"
          : "nextChapter"
        : left
          ? "back"
          : "forward"
      document.dispatchEvent(new CustomEvent("podlist:control", { detail: command }))
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("podlist:control", onControl)
      document.removeEventListener("keydown", onKey)
    }
  }, [control])
}

/** Cmd/Ctrl-K: Search, from anywhere. Also the Mac app's Go menu ("podlist:go"). */
function useSearchKey() {
  const router = useRouter()
  useEffect(() => {
    const go = (event: Event) => void router.navigate({ to: (event as CustomEvent<string>).detail })
    document.addEventListener("podlist:go", go)
    return () => document.removeEventListener("podlist:go", go)
  }, [router])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // ⌘K on a Mac; elsewhere Ctrl+K is the browser's own (BROWSER-05). "/" everywhere,
      // as on the web's search boxes, when not typing.
      const commandK =
        event.key.toLowerCase() === "k" && event.metaKey && !event.ctrlKey && !event.altKey
      const slash =
        event.key === "/" &&
        singleKeyShortcuts.get() &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !(event.target as HTMLElement).closest(
          "input, textarea, select, [contenteditable], [role=dialog]"
        )
      if (!commandK && !slash) return
      event.preventDefault()
      const field = document.querySelector<HTMLInputElement>('main input[type="search"]')
      if (router.state.location.pathname === "/search" && field) field.focus()
      else void router.navigate({ to: "/search" })
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [router])
}

/** Space plays or pauses when no control has focus, as in other media apps. */
function usePlayPauseKey() {
  const control = useAtomSet(playbackAtom)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key !== " " ||
        !singleKeyShortcuts.get() ||
        event.repeat ||
        event.shiftKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
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
  useStrayDropGuard()
  usePlayPauseKey()
  useSearchKey()
  useMenuControls()
  // Toasts sit just above the phone's bottom stack, however tall it is (the Offline strip
  // comes and goes): its height is --bottom-stack.
  const bottomStack = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const stack = bottomStack.current
    if (stack === null) return
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty("--bottom-stack", `${stack.offsetHeight}px`)
    )
    observer.observe(stack)
    return () => observer.disconnect()
  }, [])
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-lg bg-card px-4 py-2.5 text-row font-semibold shadow focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-44 outline-none md:pb-28">
        <VersionNotice />
        <FirstRun />
        <Outlet />
      </main>
      <div ref={bottomStack} className="fixed inset-x-0 bottom-0 z-10 bg-background md:hidden">
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
