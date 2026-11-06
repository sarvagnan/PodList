import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import {
  ArrowDownToLine,
  Check,
  ListEnd,
  ListPlus,
  ListStart,
  Play,
  Plus,
  Star
} from "lucide-react"
import type * as React from "react"
import { type ReactNode, useState } from "react"
import type { ViewEpisode } from "../../app/data.ts"
import { nextLastTargetAtom } from "../../app/episodeActions.ts"
import { stateAtom } from "../../app/runtime.ts"
import { formatLength, formatPublished } from "../../lib/time.ts"
import { Artwork } from "../shell/Artwork.tsx"
import { AddToPlaylist } from "./AddToPlaylist.tsx"
import { DownloadButton, useDownloadStatus } from "./DownloadButton.tsx"
import { useEpisodeActions } from "./useEpisodeActions.ts"

function IconButton({
  label,
  onClick,
  pressed,
  children,
  className = "",
  buttonProps
}: {
  readonly label: string
  readonly onClick?: () => void
  readonly pressed?: boolean
  readonly children: ReactNode
  readonly className?: string
  readonly buttonProps?: React.ComponentProps<"button">
}) {
  return (
    <button
      type="button"
      {...buttonProps}
      aria-label={label}
      title={label}
      aria-pressed={buttonProps ? undefined : pressed}
      onClick={onClick ?? buttonProps?.onClick}
      className={`grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input ${className}`}
    >
      {children}
    </button>
  )
}

/**
 * One Episode in a View. Phone: Add (a sheet to choose the Playlist) then Play. Desktop:
 * Play Next, Play Last, Add to…, Star, Played, and Play last of all (docs/design/ui-layout.md).
 */
export function EpisodeRow({
  episode,
  onOpen,
  selected = false
}: {
  readonly episode: ViewEpisode
  /** Wide screens: show the Episode beside the list instead of navigating. */
  readonly onOpen?: (episodeId: string) => void
  readonly selected?: boolean
}) {
  const act = useEpisodeActions()
  const downloaded = useDownloadStatus(episode.id)?._tag === "Stored"
  const [adding, setAdding] = useState(false)
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const chosen = useAtomValue(nextLastTargetAtom)
  const target =
    state?.playlists.find((p) => p.id === chosen) ??
    state?.playlists.find((p) => p.id === state.activePlaylistId)
  const meta = [
    episode.podcast,
    formatPublished(episode.published),
    ...(episode.duration ? [formatLength(episode.duration)] : [])
  ].join(" · ")
  const play = (
    <button
      type="button"
      aria-label={`Play ${episode.title}`}
      title="Play now"
      onClick={() => void act({ _tag: "PlayNow", episodeId: episode.id })}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
    >
      <Play aria-hidden="true" className="size-[18px] translate-x-px fill-current" />
    </button>
  )
  const addTo = (placement: "next" | "last") =>
    target && void act({ _tag: "Add", episodeId: episode.id, playlistId: target.id, placement })

  return (
    <div className="flex min-h-[4.75rem] items-center gap-3 border-b px-2 py-2">
      <Artwork url={episode.artworkUrl} name={episode.podcast} size={48} />
      <div className="min-w-0 flex-1">
        {/* The title opens the Episode: a screen on the phone, a panel beside the View on wide screens. */}
        <Link
          to="/episodes/$episodeId"
          params={{ episodeId: episode.id }}
          onClick={(event) => {
            if (onOpen && window.matchMedia("(min-width: 64rem)").matches) {
              event.preventDefault()
              onOpen(episode.id)
            }
          }}
          className={`line-clamp-2 text-row leading-snug font-medium hover:underline ${episode.played ? "text-muted-foreground" : ""} ${selected ? "text-primary" : ""}`}
        >
          {episode.title}
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {episode.played && (
            <span className="inline-flex items-center gap-0.5 font-medium text-positive">
              <Check aria-hidden="true" className="size-3.5" />
              Played
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
            </span>
          )}
          {episode.starred && (
            <Star
              aria-label="Starred"
              className="size-3.5 shrink-0 fill-star text-star md:hidden"
            />
          )}
          {downloaded && (
            <ArrowDownToLine aria-label="Downloaded" className="size-3.5 shrink-0 text-positive" />
          )}
          <span className="truncate">{meta}</span>
        </p>
      </div>

      <div className="flex items-center gap-1 md:hidden">
        <IconButton label={`Add ${episode.title} to a Playlist`} onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" className="size-5" />
        </IconButton>
        {play}
      </div>

      <div className="hidden items-center gap-0.5 md:flex">
        <IconButton
          label={`Play Next in ${target?.name ?? "Playlist"}`}
          onClick={() => addTo("next")}
        >
          <ListStart aria-hidden="true" className="size-[18px]" />
        </IconButton>
        <IconButton
          label={`Play Last in ${target?.name ?? "Playlist"}`}
          onClick={() => addTo("last")}
        >
          <ListEnd aria-hidden="true" className="size-[18px]" />
        </IconButton>
        <IconButton label="Add to another Playlist…" onClick={() => setAdding(true)}>
          <ListPlus aria-hidden="true" className="size-[18px]" />
        </IconButton>
        <IconButton
          label="Star"
          pressed={episode.starred}
          onClick={() =>
            void act({ _tag: "Star", episodeId: episode.id, starred: !episode.starred })
          }
          className={episode.starred ? "text-star hover:text-star" : ""}
        >
          <Star
            aria-hidden="true"
            className={`size-[18px] ${episode.starred ? "fill-current" : ""}`}
          />
        </IconButton>
        <IconButton
          label="Played"
          pressed={episode.played}
          onClick={() =>
            void act({ _tag: "Played", episodeId: episode.id, played: !episode.played })
          }
          className={episode.played ? "text-positive hover:text-positive" : ""}
        >
          <Check aria-hidden="true" className="size-[18px]" />
        </IconButton>
        <DownloadButton
          episodeId={episode.id}
          renderButton={({ icon, label, pressed, onClick, buttonProps }) => (
            <IconButton
              label={label}
              pressed={pressed}
              {...(onClick ? { onClick } : {})}
              {...(buttonProps ? { buttonProps } : {})}
              className={pressed ? "text-positive hover:text-positive" : ""}
            >
              {icon}
            </IconButton>
          )}
        />
        <span className="ml-2">{play}</span>
      </div>

      {adding && <AddToPlaylist episode={episode} open={adding} onOpenChange={setAdding} />}
    </div>
  )
}

/** Desktop toolbar: which Playlist Play Next and Play Last go to. */
export function NextLastTarget() {
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const chosen = useAtomValue(nextLastTargetAtom)
  const set = useAtomSet(nextLastTargetAtom)
  if (state === null) return null
  const value = state.playlists.some((p) => p.id === chosen) ? chosen : state.activePlaylistId
  return (
    <label className="hidden items-center gap-2 text-small text-muted-foreground md:flex">
      Next / Last go to
      <select
        value={value ?? ""}
        onChange={(event) => set(event.target.value)}
        className="h-9 rounded-lg border border-input bg-card px-2 text-sm font-medium text-foreground"
      >
        {state.playlists.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.id === state.activePlaylistId ? " (active)" : ""}
          </option>
        ))}
      </select>
    </label>
  )
}
