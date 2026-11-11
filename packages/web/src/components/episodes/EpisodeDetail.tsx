import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { Check, ListEnd, ListStart, Pause, Play, Plus, Share, Star } from "lucide-react"
import type * as React from "react"
import { type ReactNode, useState } from "react"
import { episodeDetailAtom } from "../../app/data.ts"
import { useAppState, useCanEdit, useNextLastTarget, useNowPlaying } from "../../app/hooks.ts"
import { playbackAtom } from "../../app/runtime.ts"
import { chapterAt } from "../../lib/chapters.ts"
import { episodeLink } from "../../lib/share.ts"
import { showNotesText } from "../../lib/showNotes.ts"
import { formatLength, formatPublished, formatTime } from "../../lib/time.ts"
import { useMinWidth } from "../../lib/useWide.ts"
import { useCopyEpisodeLink } from "../feedback/useCopyLink.ts"
import { Artwork } from "../shell/Artwork.tsx"
import { AddToPlaylist } from "./AddToPlaylist.tsx"
import { DownloadButton } from "./DownloadButton.tsx"
import { useEpisodeActions } from "./useEpisodeActions.ts"

// An Episode in full (docs/design/ui-layout.md): artwork, podcast, title and facts; one
// action row with Play in the middle (Played · Play · Add · Star); each Playlist it is
// in, with that Entry's own Position; Chapters; show notes. A phone screen, a panel
// beside a View on the desktop, and a page in the Now Playing drawer.

type Tone = "light" | "dark"

const tones = {
  light: {
    muted: "text-muted-foreground",
    action: "bg-secondary text-foreground hover:bg-input active:bg-input/70",
    row: "hover:bg-secondary",
    current: "bg-accent",
    rule: "border-border",
    played: "text-positive",
    starred: "text-star"
  },
  dark: {
    muted: "text-player-muted",
    action:
      "bg-player-track text-player-foreground hover:bg-player-track/80 active:bg-player-track/60",
    row: "hover:bg-player-track",
    current: "bg-player-track",
    rule: "border-player-track",
    // Lighter on the dark player, for contrast (APPEAR-04).
    played: "text-[#86d9ab]",
    starred: "text-[#f2c46b]"
  }
} as const

function Action({
  label,
  pressed,
  onClick,
  className,
  children,
  buttonProps
}: {
  readonly label: string
  readonly pressed?: boolean
  readonly onClick?: () => void
  readonly className: string
  readonly children: ReactNode
  readonly buttonProps?: React.ComponentProps<"button">
}) {
  const canEdit = useCanEdit()
  return (
    <button
      type="button"
      disabled={!canEdit && label !== "Pause" && label !== "Play"}
      data-action=""
      {...buttonProps}
      aria-pressed={buttonProps ? undefined : pressed}
      onClick={onClick ?? buttonProps?.onClick}
      // The phone's five share one row (Play in the middle); wider panels keep 80 px each.
      // A column in rem, so it widens with the label as text grows (WTYPE-02).
      className={`flex w-[4.25rem] max-w-full flex-col items-center gap-1.5 text-center text-small font-medium break-words ${className}`}
    >
      {children}
      {label}
    </button>
  )
}

// The action row's two shapes; the break points are the width of every action in one row:
// 5 × 4.25rem = 21.25rem (the columns are their own gaps, so the five fit a phone and the
// panel beside a View), and 7 × 4.25rem + 6 × 0.25rem gaps = 31.25rem. Under them, Play's
// own row, then 4 (17rem) or 2 across, or 3 (13.25rem) or 2. The seven in one row (the
// desktop Episode page) start at the header's edge, under the artwork.
const rowOfFive =
  "grid grid-cols-2 justify-items-center gap-y-4 @min-[17rem]:grid-cols-4 @min-[21.25rem]:flex @min-[21.25rem]:items-start @min-[21.25rem]:justify-center"
const playOfFive = "col-span-full order-first @min-[21.25rem]:order-none"
const rowOfSeven =
  "grid grid-cols-2 justify-items-center gap-x-1 gap-y-4 @min-[13.25rem]:grid-cols-3 @min-[31.25rem]:flex @min-[31.25rem]:items-start @min-[31.25rem]:justify-start"
const playOfSeven = "col-span-full order-first @min-[31.25rem]:order-none"

export function EpisodeDetail({
  episodeId,
  tone = "light",
  heading: Heading = "h2",
  onPlay
}: {
  readonly episodeId: string
  readonly tone?: Tone
  /** h1 on the Episode's own screen; h2 in a panel beside a list. */
  readonly heading?: "h1" | "h2"
  /** Called after playback starts from here (the drawer returns to its main page). */
  readonly onPlay?: () => void
}) {
  const t = tones[tone]
  const result = useAtomValue(episodeDetailAtom(episodeId))
  const detail = AsyncResult.getOrElse(result, () => null)
  const state = useAppState()
  const now = useNowPlaying()
  const act = useEpisodeActions()
  const control = useAtomSet(playbackAtom)
  const [adding, setAdding] = useState(false)
  const target = useNextLastTarget()
  // Next and Last join the row on the Episode's own page on a wide screen. Beside a View the
  // panel keeps the five in one row, as the phone and the player do; the list's rows have
  // Next and Last.
  const seven = useMinWidth("64rem") && tone === "light" && Heading === "h1"
  const copyLink = useCopyEpisodeLink()

  if (AsyncResult.isInitial(result)) {
    return <div role="status" aria-label="Loading Episode" className="h-40" />
  }
  if (detail === null) {
    // The tab names it too (BROWSER-03), on the Episode's own screen.
    if (Heading === "h1") document.title = "Episode not found · PodList"
    return (
      <div className={`px-5 py-8 text-center ${t.muted}`}>
        <Heading className="font-medium text-foreground">Episode not found</Heading>
        <p className="mt-1.5">
          This Episode isn’t in your Library: its podcast may have been unsubscribed, or the link is
          wrong.
        </p>
        {/* A way on (COPY-03). */}
        <Link
          to="/views"
          className="mt-3 inline-block font-medium text-primary underline underline-offset-2"
        >
          See your Views
        </Link>
      </div>
    )
  }
  const episodeState = state?.episodeStates[episodeId]
  const played = episodeState?.played != null
  const starred = episodeState?.starred ?? false
  const loaded = now?.episodeId === episodeId
  const playlists =
    state?.playlists.flatMap((p) => {
      const entry = p.entries.find((e) => e.episodeId === episodeId)
      return entry ? [{ playlist: p, entry }] : []
    }) ?? []
  const notes = showNotesText(detail.description)
  const playingChapter = loaded ? chapterAt(detail.chapters, now.position) : -1
  const facts = [
    formatPublished(detail.published),
    ...(detail.duration ? [formatLength(detail.duration)] : []),
    ...(played ? ["Played"] : [])
  ].join(" · ")
  // A transparent edge that forced colours draw, round like the circle.
  const iconCircle = `grid size-12 place-items-center rounded-full border border-transparent ${t.action}`

  return (
    // As wide as its header and actions, so Resume sits by its Playlist on a wide screen.
    // The forms' column: 640 px of content (with the page's 32 px gutters) on desktop.
    <article className={`max-w-[704px] px-5 pb-10 ${Heading === "h1" ? "md:px-8" : ""}`}>
      <div className="flex items-start gap-4">
        <Artwork url={detail.artworkUrl} name={detail.podcast} size={96} />
        <div className="min-w-0">
          <p className={`text-small ${t.muted}`}>{detail.podcast}</p>
          <Heading
            tabIndex={-1}
            // As large as other screens' titles on the Episode's own screen; smaller in a panel.
            className={`mt-1 font-heading font-semibold outline-none ${Heading === "h1" ? "text-title leading-tight md:text-3xl" : "text-xl leading-snug"}`}
          >
            {detail.title}
          </Heading>
          <p className={`mt-1.5 text-small ${t.muted}`}>{facts}</p>
          {/* The Episode's link: the system share sheet where there is one, else copied. */}
          <button
            type="button"
            onClick={async () => {
              const url = await episodeLink(episodeId)
              if (navigator.share) {
                await navigator.share({ title: detail.title, url }).catch(() => undefined)
              } else void copyLink(episodeId)
            }}
            className={`mt-2 -ml-2 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-small font-medium ${t.row}`}
          >
            <Share aria-hidden="true" className="size-4" />
            Share
          </button>
        </div>
      </div>

      {/* Played · Download · (Next) · Play · (Last) · Add · Star, Play in the middle
          (docs/design/ui-layout.md). One row when they all fit at the text's size; otherwise
          Play takes a row of its own, centred, with the rest evenly under it (2 + 2, 4, or
          3 + 3), never one left alone (WTYPE-02). Measured in rem, so text size counts. */}
      <div className="@container mt-6">
        <div className={seven ? rowOfSeven : rowOfFive}>
          <Action
            label="Played"
            pressed={played}
            onClick={() => void act({ _tag: "Played", episodeId, played: !played })}
            className=""
          >
            {/* Pressed: the icon takes the colour and a ring; the label stays readable. */}
            <span className={`${iconCircle} ${played ? `${t.played} ring-2 ring-current` : ""}`}>
              <Check aria-hidden="true" className="size-5" />
            </span>
          </Action>
          <DownloadButton
            episodeId={episodeId}
            renderButton={({ icon, label, pressed, onClick, buttonProps }) => (
              <Action
                label={
                  label.startsWith("Stop")
                    ? "Stop"
                    : label.startsWith("Download failed")
                      ? "Try again"
                      : label
                }
                pressed={pressed}
                {...(onClick ? { onClick } : {})}
                {...(buttonProps ? { buttonProps } : {})}
                className=""
              >
                <span
                  aria-hidden="true"
                  className={`${iconCircle} ${pressed ? "ring-2 ring-current" : ""}`}
                >
                  {icon}
                </span>
              </Action>
            )}
          />
          {seven && (
            <span className="contents">
              <Action
                label="Next"
                onClick={() =>
                  target &&
                  void act({ _tag: "Add", episodeId, playlistId: target.id, placement: "next" })
                }
                className=""
              >
                <span className={iconCircle}>
                  <ListStart aria-hidden="true" className="size-5" />
                </span>
              </Action>
            </span>
          )}
          <Action
            // Play and Pause, as the player and the Playlist row say (not "Playing").
            label={loaded && now.playing ? "Pause" : "Play"}
            onClick={() => {
              if (!loaded) void act({ _tag: "PlayNow", episodeId })
              else control({ _tag: "toggle" })
              if (!(loaded && now.playing)) onPlay?.()
            }}
            className={seven ? playOfSeven : playOfFive}
          >
            <span className="grid size-12 place-items-center rounded-full border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80">
              {loaded && now.playing ? (
                <Pause aria-hidden="true" className="size-5 fill-current" />
              ) : (
                <Play aria-hidden="true" className="size-5 translate-x-px fill-current" />
              )}
            </span>
          </Action>
          {seven && (
            <span className="contents">
              <Action
                label="Last"
                onClick={() =>
                  target &&
                  void act({ _tag: "Add", episodeId, playlistId: target.id, placement: "last" })
                }
                className=""
              >
                <span className={iconCircle}>
                  <ListEnd aria-hidden="true" className="size-5" />
                </span>
              </Action>
            </span>
          )}

          <Action label="Add" onClick={() => setAdding(true)} className="">
            <span className={iconCircle}>
              <Plus aria-hidden="true" className="size-5" />
            </span>
          </Action>
          <Action
            label="Star"
            pressed={starred}
            onClick={() => void act({ _tag: "Star", episodeId, starred: !starred })}
            className=""
          >
            <span className={`${iconCircle} ${starred ? `${t.starred} ring-2 ring-current` : ""}`}>
              <Star aria-hidden="true" className={`size-5 ${starred ? "fill-current" : ""}`} />
            </span>
          </Action>
        </div>
      </div>

      {playlists.length > 0 && (
        <section className="mt-8">
          <h3 className={`text-xs font-semibold tracking-[0.08em] uppercase ${t.muted}`}>
            In your Playlists
          </h3>
          <ul className="mt-2">
            {playlists.map(({ playlist, entry }) => {
              // The Entry that is loaded now: its live Position, and a Play / Pause toggle.
              const live = loaded && now.playlistId === playlist.id
              const position = live ? now.position : entry.position
              return (
                <li
                  key={playlist.id}
                  className={`flex min-h-14 items-center gap-3 border-b py-2 last:border-b-0 ${t.rule}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-row font-medium">{playlist.name}</span>
                    <span className={`block text-small ${t.muted}`}>
                      {live && now.playing
                        ? `Playing · ${formatTime(position)}${detail.duration ? ` of ${formatTime(detail.duration)}` : ""}`
                        : position > 0
                          ? `At ${formatTime(position)}${detail.duration ? ` of ${formatTime(detail.duration)}` : ""}`
                          : "Not started"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (live) control({ _tag: "toggle" })
                      else {
                        control({ _tag: "playEntry", playlistId: playlist.id, episodeId })
                        onPlay?.()
                      }
                    }}
                    className={`h-10 rounded-full px-4 text-row font-semibold ${t.action}`}
                  >
                    {live && now.playing ? "Pause" : position > 0 ? "Resume" : "Play"}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {detail.chapters.length > 0 && (
        <section className="mt-8">
          <h3 className={`text-xs font-semibold tracking-[0.08em] uppercase ${t.muted}`}>
            Chapters
          </h3>
          <ol className="mt-2">
            {detail.chapters.map((c, i) => (
              <li key={c.start}>
                {loaded ? (
                  <button
                    type="button"
                    aria-current={i === playingChapter ? "true" : undefined}
                    onClick={() => control({ _tag: "seek", seconds: c.start })}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left ${t.row} ${i === playingChapter ? t.current : ""}`}
                  >
                    <span
                      className={`min-w-14 shrink-0 text-small whitespace-nowrap tabular-nums ${t.muted}`}
                    >
                      {formatTime(c.start)}
                    </span>
                    <span className="text-row">{c.title}</span>
                  </button>
                ) : (
                  <div className="flex min-h-11 items-center gap-3 px-2">
                    <span
                      className={`min-w-14 shrink-0 text-small whitespace-nowrap tabular-nums ${t.muted}`}
                    >
                      {formatTime(c.start)}
                    </span>
                    <span className="text-row">{c.title}</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-8">
        <h3 className={`text-xs font-semibold tracking-[0.08em] uppercase ${t.muted}`}>
          Show notes
        </h3>
        <div className="mt-2 max-w-prose space-y-3 text-row leading-relaxed whitespace-pre-line">
          {notes.length > 0 ? (
            notes.map((p) => <p key={p}>{p}</p>)
          ) : (
            <p className={t.muted}>None.</p>
          )}
        </div>
      </section>

      {adding && (
        <AddToPlaylist
          episode={{ id: episodeId, title: detail.title }}
          open={adding}
          onOpenChange={setAdding}
        />
      )}
    </article>
  )
}
