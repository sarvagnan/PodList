import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { ArrowDownToLine, Check, ListPlus, Play, Plus, Star } from "lucide-react"
import type * as React from "react"
import { type ReactNode, useState } from "react"
import type { ViewEpisode } from "../../app/data.ts"
import { nextLastTargetAtom } from "../../app/episodeActions.ts"
import { stateAtom } from "../../app/runtime.ts"
import { nextLastTarget } from "../../lib/remembered.ts"
import { formatLength, formatPublished } from "../../lib/time.ts"
import { Tip } from "../feedback/Tip.tsx"
import { GridCell } from "../lists/Grid.tsx"
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
    <GridCell className="shrink-0">
      <Tip label={label}>
        <button
          type="button"
          {...buttonProps}
          data-cell=""
          aria-label={label}
          aria-pressed={buttonProps ? undefined : pressed}
          onClick={onClick ?? buttonProps?.onClick}
          className={`grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input ${className}`}
        >
          {children}
        </button>
      </Tip>
    </GridCell>
  )
}

/** Play Next / Play Last: words, not two near-identical list glyphs (APPEAR-09). */
function TextAction({
  label,
  onClick,
  children
}: {
  readonly label: string
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <GridCell className="shrink-0">
      <Tip label={label}>
        <button
          type="button"
          data-cell=""
          aria-label={label}
          onClick={onClick}
          className="h-9 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input"
        >
          {children}
        </button>
      </Tip>
    </GridCell>
  )
}

/** A plain left click; modified clicks keep their browser meaning (new tab, window). */
const plainClick = (event: React.MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/**
 * One Episode in a View, a row of the View's grid (lib/rowGrid.ts). Phone: Add (a sheet
 * to choose the Playlist) then Play. Desktop: Next, Last, Add to…, Star, Played,
 * Download, and Play last of all (docs/design/ui-layout.md); all but Play show on hover,
 * focus or selection, so the list reads as titles. Their states show in the facts line.
 */
export function EpisodeRow({
  episode,
  onOpen,
  selected = false,
  checked = false,
  onCheck
}: {
  readonly episode: ViewEpisode
  /** Wide screens: show the Episode beside the list instead of navigating. */
  readonly onOpen?: (episodeId: string) => void
  /** Open in the panel beside the list. */
  readonly selected?: boolean
  /** Desktop: ticked for bulk actions. */
  readonly checked?: boolean
  /** Desktop: tick or untick; with Shift, the range from the last tick. */
  readonly onCheck?: (checked: boolean, range: boolean) => void
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
  const shown = selected || checked
  const play = (
    <GridCell className="shrink-0">
      <Tip label="Play Now">
        <button
          type="button"
          data-cell=""
          aria-label={`Play ${episode.title}`}
          onClick={() => void act({ _tag: "PlayNow", episodeId: episode.id })}
          // Quiet until the row is in hand, so a View reads as titles, not a column of buttons.
          className={`grid size-11 place-items-center rounded-full hover:bg-primary hover:text-primary-foreground active:bg-primary/80 ${
            shown
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-primary group-focus-within:bg-primary group-focus-within:text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground"
          }`}
        >
          <Play aria-hidden="true" className="size-[18px] translate-x-px fill-current" />
        </button>
      </Tip>
    </GridCell>
  )
  const addTo = (placement: "next" | "last") =>
    target && void act({ _tag: "Add", episodeId: episode.id, playlistId: target.id, placement })

  return (
    <div
      className={`group flex min-h-[76px] items-center gap-3 border-b px-2 py-2 ${
        selected
          ? "selected-row bg-accent shadow-[inset_3px_0_0_var(--color-primary)]"
          : checked
            ? "bg-accent/60"
            : ""
      }`}
    >
      {onCheck && (
        <GridCell className="hidden shrink-0 md:block">
          <input
            type="checkbox"
            data-cell=""
            checked={checked}
            readOnly
            onClick={(event) => onCheck(event.currentTarget.checked, event.shiftKey)}
            aria-label={`Select ${episode.title}`}
            className="block size-4 accent-primary"
          />
        </GridCell>
      )}
      <Artwork url={episode.artworkUrl} name={episode.podcast} size={48} />
      <GridCell block className="min-w-0 flex-1">
        {/* The title opens the Episode: a screen on the phone, a panel beside the View on wide screens. */}
        <Link
          to="/episodes/$episodeId"
          params={{ episodeId: episode.id }}
          data-cell="title"
          data-episode-title={episode.id}
          onClick={(event) => {
            if (onOpen && plainClick(event) && window.matchMedia("(min-width: 64rem)").matches) {
              event.preventDefault()
              onOpen(episode.id)
            }
          }}
          className={`line-clamp-2 text-row leading-snug font-medium hover:underline ${episode.played ? "text-muted-foreground" : ""} ${selected ? "text-primary" : ""}`}
        >
          {episode.title}
        </Link>
        <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
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
            <Star aria-label="Starred" className="size-3.5 shrink-0 fill-star text-star" />
          )}
          {downloaded && (
            <ArrowDownToLine aria-label="Downloaded" className="size-3.5 shrink-0 text-positive" />
          )}
          {/* Wraps rather than cut off at large text sizes (WTYPE-02). */}
          <span className="line-clamp-2">{meta}</span>
        </p>
      </GridCell>

      <div className="flex items-center gap-1 md:hidden">
        <IconButton label={`Add ${episode.title} to a Playlist`} onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" className="size-5" />
        </IconButton>
        {play}
      </div>

      <div className="hidden items-center gap-0.5 md:flex">
        <div
          className={`flex items-center gap-0.5 ${
            shown
              ? ""
              : "transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 group-has-[[data-popup-open]]:opacity-100"
          }`}
        >
          <TextAction
            label={`Play Next in ${target?.name ?? "Playlist"}`}
            onClick={() => addTo("next")}
          >
            Next
          </TextAction>
          <TextAction
            label={`Play Last in ${target?.name ?? "Playlist"}`}
            onClick={() => addTo("last")}
          >
            Last
          </TextAction>
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
        </div>
        <span className="ml-2 flex">{play}</span>
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
        onChange={(event) => {
          set(event.target.value)
          nextLastTarget.set(event.target.value)
        }}
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
