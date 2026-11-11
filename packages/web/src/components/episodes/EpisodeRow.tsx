import { Menu } from "@base-ui/react/menu"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Link, useNavigate } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { ArrowDownToLine, Check, Ellipsis, Play, Plus, Star } from "lucide-react"
import type * as React from "react"
import { Fragment, type ReactNode, useState } from "react"
import { localClient } from "#client"
import type { ViewEpisode } from "../../app/data.ts"
import { nextLastTargetAtom } from "../../app/episodeActions.ts"
import { downloadAtom, stateAtom } from "../../app/runtime.ts"
import { nextLastTarget } from "../../lib/remembered.ts"
import { formatLength, formatPublished } from "../../lib/time.ts"
import { useMinWidth } from "../../lib/useWide.ts"
import { Tip } from "../feedback/Tip.tsx"
import { GridCell } from "../lists/Grid.tsx"
import { type RowCommand, RowMenu, RowMenuItems } from "../lists/RowMenu.tsx"
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
    <GridCell className="relative z-10 shrink-0">
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
    <GridCell className="relative z-10 shrink-0">
      <Tip label={label}>
        <button
          type="button"
          data-cell=""
          aria-label={label}
          onClick={onClick}
          className="h-9 rounded-full px-3 text-row font-medium text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input"
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
  onCheck,
  showPodcast = true
}: {
  readonly episode: ViewEpisode
  /** Off on a podcast's own page, whose title already names it. */
  readonly showPodcast?: boolean
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
  const navigate = useNavigate()
  const downloadStatus = useDownloadStatus(episode.id)
  const downloaded = downloadStatus?._tag === "Stored"
  const runDownload = useAtomSet(downloadAtom)
  const [adding, setAdding] = useState(false)
  const [creating, setCreating] = useState(false)
  const state = AsyncResult.getOrElse(useAtomValue(stateAtom), () => null)
  const starred = state?.episodeStates[episode.id]?.starred ?? episode.starred
  const played = state?.episodeStates[episode.id]
    ? state.episodeStates[episode.id]?.played != null
    : episode.played
  const chosen = useAtomValue(nextLastTargetAtom)
  const target =
    state?.playlists.find((p) => p.id === chosen) ??
    state?.playlists.find((p) => p.id === state.activePlaylistId)
  // Each fact stays in one piece when the line wraps ("26 min", not "26 / min").
  const facts = [
    ...(showPodcast ? [episode.podcast] : []),
    formatPublished(episode.published),
    ...(episode.duration ? [formatLength(episode.duration)] : [])
  ]
  // The "·" ends a line rather than starting the next when the line wraps.
  const meta = facts.map((fact, i) => (
    <Fragment key={fact}>
      <span className="whitespace-nowrap">
        {fact}
        {i < facts.length - 1 ? " ·" : ""}
      </span>
      {i < facts.length - 1 && " "}
    </Fragment>
  ))
  // Ticked rows stay quiet: the bulk bar acts on them.
  const shown = selected
  // The row's secondary actions (or their More menu) show on hover, on focus, or while a
  // menu of the row's is open; on touch, always.
  const quiet = shown
    ? ""
    : "transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 group-has-[[data-popup-open]]:opacity-100"
  const wide = useMinWidth("64rem")
  const play = (
    <GridCell className="relative z-10 shrink-0">
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
  const open = () =>
    onOpen && window.matchMedia("(min-width: 64rem)").matches
      ? onOpen(episode.id)
      : void navigate({ to: "/episodes/$episodeId", params: { episodeId: episode.id } })
  // One list of commands for the right-click menu and the narrow row's More menu.
  const commands: ReadonlyArray<RowCommand> = [
    { label: "Play Now", run: () => void act({ _tag: "PlayNow", episodeId: episode.id }) },
    { label: `Play Next in ${target?.name ?? "Playlist"}`, run: () => addTo("next") },
    { label: `Play Last in ${target?.name ?? "Playlist"}`, run: () => addTo("last") },
    { label: "Add to a Playlist…", run: () => setAdding(true) },
    {
      label: "New Playlist…",
      run: () => {
        setCreating(true)
        setAdding(true)
      }
    },
    { separator: true },
    {
      label: starred ? "Unstar" : "Star",
      run: () =>
        void act({
          _tag: "Star",
          episodeId: episode.id,
          starred: !starred
        })
    },
    {
      label: played ? "Mark Unplayed" : "Mark Played",
      run: () =>
        void act({
          _tag: "Played",
          episodeId: episode.id,
          played: !played
        })
    },
    // Download, as the row's own button offers it, so the menu has the row's every command.
    ...(localClient
      ? [
          downloaded
            ? {
                label: "Remove Download",
                run: () => runDownload({ _tag: "remove", episodeId: episode.id })
              }
            : downloadStatus?._tag === "Downloading"
              ? {
                  label: "Stop Download",
                  run: () => runDownload({ _tag: "cancel", episodeId: episode.id })
                }
              : {
                  label: "Download",
                  run: () => runDownload({ _tag: "download", episodeId: episode.id })
                }
        ]
      : []),
    { separator: true },
    { label: "Open Episode", run: open }
  ]
  const link = `/episodes/${episode.id}`
  const rowClass = `group @container relative flex min-h-[76px] items-center gap-3 border-b px-2 py-2 lg:cursor-pointer ${
    selected
      ? "selected-row bg-secondary shadow-[inset_3px_0_0_var(--color-primary)]"
      : checked
        ? "bg-accent/60"
        : "hover:bg-secondary/60"
  } data-[popup-open]:bg-secondary`
  const body = (
    <>
      {onCheck && (
        <GridCell className="relative z-10 hidden shrink-0 md:block">
          {/* A 40 px target around the box, clear of the row's link (WTYPE-04). */}
          <label className="-m-3 grid size-10 cursor-pointer place-items-center">
            <input
              type="checkbox"
              data-cell=""
              checked={checked}
              readOnly
              onClick={(event) => onCheck(event.currentTarget.checked, event.shiftKey)}
              aria-label={`Select ${episode.title}`}
              className="block size-4 accent-primary"
            />
          </label>
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
          // Phone: stretched over the row, so the whole row opens the Episode (controls sit
          // above). Desktop: just the title, so it keeps the browser's link menu and text
          // can be selected; the row opens the Episode from its empty space instead.
          className={`line-clamp-3 text-row leading-snug font-medium after:absolute after:inset-0 after:content-[''] hover:underline lg:after:hidden ${played ? "text-muted-foreground" : ""} ${selected ? "text-primary" : ""}`}
        >
          {episode.title}
        </Link>
        {/* One run of text, so a wrapped line starts at the edge, not under a badge; it
            wraps rather than cut off at large text sizes (WTYPE-02). */}
        <p className="mt-0.5 line-clamp-2 text-small text-muted-foreground">
          {played && (
            <>
              <span className="font-medium whitespace-nowrap text-positive">
                <Check aria-hidden="true" className="mr-0.5 inline size-3.5 align-[-2px]" />
                Played ·
              </span>{" "}
            </>
          )}
          {starred && (
            <>
              <Star
                aria-label="Starred"
                className="inline size-3.5 align-[-2px] fill-star text-star"
              />{" "}
            </>
          )}
          {downloaded && (
            <>
              <ArrowDownToLine
                aria-label="Downloaded"
                className="inline size-3.5 align-[-2px] text-foreground"
              />{" "}
            </>
          )}
          {meta}
        </p>
      </GridCell>

      <div className="flex items-center gap-1 lg:hidden">
        <IconButton label={`Add ${episode.title} to a Playlist`} onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" className="size-5" />
        </IconButton>
        {play}
      </div>

      <div className="hidden items-center gap-0.5 lg:flex">
        {/* Too narrow for every action (a side panel open, a small window): one menu,
            quiet until the row is in hand, as the actions it stands for are. */}
        <GridCell className={`relative z-10 hidden shrink-0 @max-[46rem]:block ${quiet}`}>
          <Menu.Root>
            <Tip label="More actions">
              <Menu.Trigger
                data-cell=""
                aria-label={`More actions for ${episode.title}`}
                className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-input data-[popup-open]:bg-secondary"
              >
                <Ellipsis aria-hidden="true" className="size-5" />
              </Menu.Trigger>
            </Tip>
            <Menu.Portal>
              <Menu.Positioner sideOffset={6} align="end" className="z-50">
                <Menu.Popup className="min-w-56 rounded-xl border bg-popover p-1 text-row text-popover-foreground shadow-lg">
                  <RowMenuItems commands={commands} link={link} />
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </GridCell>
        <div className={`hidden items-center gap-0.5 @min-[46rem]:flex ${quiet}`}>
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
          <IconButton label="Add to a Playlist…" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" className="size-[18px]" />
          </IconButton>
          <IconButton
            label="Star"
            pressed={state?.episodeStates[episode.id]?.starred ?? episode.starred}
            onClick={() =>
              void act({
                _tag: "Star",
                episodeId: episode.id,
                starred: !starred
              })
            }
            className={starred ? "text-star hover:text-star" : ""}
          >
            <Star aria-hidden="true" className={`size-[18px] ${starred ? "fill-current" : ""}`} />
          </IconButton>
          <IconButton
            label="Played"
            pressed={
              state?.episodeStates[episode.id]
                ? state.episodeStates[episode.id]?.played != null
                : episode.played
            }
            onClick={() =>
              void act({
                _tag: "Played",
                episodeId: episode.id,
                played: !played
              })
            }
            className={played ? "text-positive hover:text-positive" : ""}
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
                className={pressed ? "text-foreground" : ""}
              >
                {icon}
              </IconButton>
            )}
          />
        </div>
        <span className="ml-2 flex">{play}</span>
      </div>

      {adding && (
        <AddToPlaylist
          episode={episode}
          startNew={creating}
          open={adding}
          onOpenChange={(open) => {
            setAdding(open)
            if (!open) setCreating(false)
          }}
        />
      )}
    </>
  )
  // Desktop: a click in the row's empty space opens the Episode, as the title does.
  const onRowClick = (event: React.MouseEvent) => {
    if (!wide || !plainClick(event)) return
    if ((event.target as Element).closest("a, button, input, label, select")) return
    if (window.getSelection()?.isCollapsed === false) return
    open()
    // The click puts keyboard focus in the row too, so the arrows carry on from here.
    ;(event.currentTarget as HTMLElement)
      .querySelector<HTMLElement>("[data-cell=title]")
      ?.focus({ preventScroll: true })
  }
  return (
    <RowMenu
      commands={commands}
      link={link}
      // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: the title link is the keyboard way in; this only widens the mouse target.
      render={<div className={rowClass} onClick={onRowClick} />}
    >
      {body}
    </RowMenu>
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
    <label className="hidden min-w-0 items-center gap-2 text-small text-muted-foreground md:flex">
      {/* One name for it everywhere, as the panel beside a View has it. */}
      <span className="whitespace-nowrap">Next and Last go to</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          set(event.target.value)
          nextLastTarget.set(event.target.value)
        }}
        // A long Playlist name is cut, not allowed to widen the header past the window
        // (WTYPE-05); the open list shows it whole.
        className="min-h-9 max-w-[min(14rem,30vw)] min-w-0 truncate rounded-lg border border-field bg-card px-2 py-1 text-row font-medium text-foreground"
      >
        {state.playlists.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.id === state.activePlaylistId ? " (Active)" : ""}
          </option>
        ))}
      </select>
    </label>
  )
}
