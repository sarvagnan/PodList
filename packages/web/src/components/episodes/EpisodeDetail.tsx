import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { Check, ListEnd, ListStart, Play, Plus, Share, Star } from "lucide-react"
import type * as React from "react"
import { type ReactNode, useState } from "react"
import { episodeDetailAtom } from "../../app/data.ts"
import { useAppState, useNextLastTarget, useNowPlaying } from "../../app/hooks.ts"
import { playbackAtom } from "../../app/runtime.ts"
import { chapterAt } from "../../lib/chapters.ts"
import { episodeLink } from "../../lib/share.ts"
import { showNotesText } from "../../lib/showNotes.ts"
import { formatLength, formatPublished, formatTime } from "../../lib/time.ts"
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
  return (
    <button
      type="button"
      {...buttonProps}
      aria-pressed={buttonProps ? undefined : pressed}
      onClick={onClick ?? buttonProps?.onClick}
      // The phone's five share one row (Play in the middle); wider panels keep 80 px each.
      className={`flex min-w-14 max-w-20 flex-1 basis-0 flex-col items-center gap-1.5 text-small font-medium lg:w-20 lg:flex-none ${className}`}
    >
      {children}
      {label}
    </button>
  )
}

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
  const desktopExtras = tone === "light"
  const copyLink = useCopyEpisodeLink()

  if (AsyncResult.isInitial(result)) {
    return <div role="status" aria-label="Loading Episode" className="h-40" />
  }
  if (detail === null) {
    return <p className={`px-5 py-8 text-center ${t.muted}`}>This Episode isn’t in your Library.</p>
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
  const iconCircle = `grid size-12 place-items-center rounded-full ${t.action}`

  return (
    // As wide as its header and actions, so Resume sits by its Playlist on a wide screen.
    <article className="max-w-[44rem] px-5 pb-10">
      <div className="flex items-start gap-4">
        <Artwork url={detail.artworkUrl} name={detail.podcast} size={96} />
        <div className="min-w-0">
          <p className={`text-small ${t.muted}`}>{detail.podcast}</p>
          <Heading
            tabIndex={-1}
            className="mt-1 font-heading text-xl leading-snug font-semibold outline-none"
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

      {/* Desktop beside a View: Played · Download · Next · Play · Last · Add · Star, aligned
          with the header (docs/design/ui-layout.md). */}
      <div
        // No gap on the narrowest phones, so the five still fit on one row (not four and one).
        className={`mt-6 flex flex-wrap items-start justify-center gap-0 min-[22.5rem]:gap-1 ${desktopExtras ? "lg:justify-start" : ""}`}
      >
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
        {desktopExtras && (
          <span className="hidden lg:contents">
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
          label={loaded && now.playing ? "Playing" : "Play"}
          onClick={() => {
            if (!loaded) void act({ _tag: "PlayNow", episodeId })
            else if (!now.playing) control({ _tag: "toggle" })
            onPlay?.()
          }}
          className=""
        >
          <span className="grid size-12 place-items-center rounded-full border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80">
            <Play aria-hidden="true" className="size-5 translate-x-px fill-current" />
          </span>
        </Action>
        {desktopExtras && (
          <span className="hidden lg:contents">
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
