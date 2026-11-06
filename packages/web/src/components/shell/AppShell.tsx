import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react"
import { Link, Outlet } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { Filter, Library, ListMusic, Pause, Play, RotateCcw, RotateCw } from "lucide-react"
import { backgroundSyncAtom, nowPlayingAtom, playbackAtom, stateAtom } from "../../app/runtime.ts"
import { formatTime } from "../../lib/time.ts"
import { backSeconds, forwardSeconds } from "../../playback/Playback.ts"
import { Artwork } from "./Artwork.tsx"

// Variant A (docs/design/ui-layout.md): phone has Views / Playlists / Library tabs with a
// mini-player above them; desktop has a sidebar of Views and Playlists and a player bar.

const tabs = [
  { to: "/views", label: "Views", icon: Filter },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/library", label: "Library", icon: Library }
] as const

function useAppState() {
  return AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
}

function NowPlaying({ variant }: { readonly variant: "phone" | "desktop" }) {
  const state = useAppState()
  const current = AsyncResult.getOrElse(useAtomValue(nowPlayingAtom), () => null)
  const control = useAtomSet(playbackAtom)
  if (current === null) return null
  const playlist = state?.playlists.find((p) => p.id === current.playlistId)
  const label = `${current.podcast} · ${playlist?.name ?? ""}`
  const progress = current.duration ? Math.min(100, (current.position / current.duration) * 100) : 0
  const button =
    "grid size-11 shrink-0 place-items-center rounded-full text-player-foreground hover:bg-player-track"
  const toggle = (
    <button
      type="button"
      aria-label={current.playing ? "Pause" : "Play"}
      onClick={() => control({ _tag: "toggle" })}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-player-foreground text-player"
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
      onClick={() => control({ _tag: "skip", seconds: -backSeconds })}
      className={button}
    >
      <RotateCcw aria-hidden="true" className="size-5" />
    </button>
  )
  const forward = (
    <button
      type="button"
      aria-label={`Forward ${forwardSeconds} seconds`}
      onClick={() => control({ _tag: "skip", seconds: forwardSeconds })}
      className={button}
    >
      <RotateCw aria-hidden="true" className="size-5" />
    </button>
  )
  const bar = (
    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-player-track">
      <span className="block h-full bg-progress" style={{ width: `${progress}%` }} />
    </span>
  )
  const error = current.error && (
    <p role="alert" className="truncate text-[11px] text-player-danger">
      Can't play: {current.error}
    </p>
  )

  if (variant === "phone") {
    return (
      <section
        aria-label="Now playing"
        className="relative mx-2.5 flex items-center gap-3 overflow-hidden rounded-2xl bg-player p-2.5 text-player-foreground"
      >
        <Artwork url={current.artworkUrl} name={current.podcast} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{current.title}</p>
          {error || <p className="truncate text-[11px] text-player-muted">{label}</p>}
        </div>
        {toggle}
        {forward}
        {bar}
      </section>
    )
  }
  return (
    <section
      aria-label="Now playing"
      className="fixed inset-x-0 bottom-0 z-10 hidden items-center gap-3 bg-player px-5 py-3 text-player-foreground md:flex"
    >
      <Artwork url={current.artworkUrl} name={current.podcast} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{current.title}</p>
        {error || <p className="truncate text-xs text-player-muted">{label}</p>}
      </div>
      <div className="flex items-center gap-2">
        {back}
        {toggle}
        {forward}
      </div>
      <p className="w-40 text-right text-xs text-player-muted tabular-nums">
        {formatTime(current.position)}
        {current.duration ? ` / ${formatTime(current.duration)}` : ""}
      </p>
      {bar}
    </section>
  )
}

function Sidebar() {
  const state = useAppState()
  const link =
    "flex h-9 items-center justify-between rounded-lg px-2.5 text-sm text-foreground hover:bg-secondary [&.active]:bg-accent [&.active]:font-semibold"
  const heading =
    "px-2.5 pt-5 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
  return (
    <nav
      aria-label="Library and lists"
      className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r px-3 pt-5 pb-24 md:flex"
    >
      <p className="px-2.5 pb-2 font-heading text-lg font-semibold">PodList</p>
      <p className={heading}>Views</p>
      {state?.views.length === 0 && (
        <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">No Views yet</p>
      )}
      {state?.views.map((v) => (
        <Link key={v.id} to="/views/$viewId" params={{ viewId: v.id }} className={link}>
          {v.name}
        </Link>
      ))}
      <p className={heading}>Playlists</p>
      {state?.playlists.map((p) => (
        <Link key={p.id} to="/playlists/$playlistId" params={{ playlistId: p.id }} className={link}>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${p.id === state.activePlaylistId ? "bg-positive" : "bg-input"}`}
            />
            {p.name}
          </span>
          <span className="text-xs text-muted-foreground">{p.entries.length}</span>
        </Link>
      ))}
      <div className="flex-1" />
      <Link to="/library" className={link}>
        Library &amp; Subscriptions
      </Link>
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
          className="flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground [&.active]:text-primary"
        >
          <Icon aria-hidden="true" className="size-[22px]" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function AppShell() {
  useAtomMount(backgroundSyncAtom)
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-40 md:pb-24">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 bg-background md:hidden">
        <NowPlaying variant="phone" />
        <BottomTabs />
      </div>
      <NowPlaying variant="desktop" />
    </div>
  )
}
