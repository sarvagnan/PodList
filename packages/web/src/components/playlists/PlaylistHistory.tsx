import { useAtomSet, useAtomValue } from "@effect/atom-react"
import type { Playlist } from "@podlist/domain"
import { Link } from "@tanstack/react-router"
import { AsyncResult } from "effect/reactivity"
import { History as HistoryIcon, Play, RotateCcw } from "lucide-react"
import { type ReactNode, useState } from "react"
import { entryEpisodesAtom } from "../../app/data.ts"
import { useAppState } from "../../app/hooks.ts"
import { recordAtom } from "../../app/runtime.ts"
import { formatTime } from "../../lib/time.ts"
import {
  momentOf,
  previewRewind,
  rewindChange,
  type TimelineEvent,
  timelineEvents,
  undoRewind
} from "../../lib/timeline.ts"
import { ConfirmDialog } from "../feedback/ConfirmDialog.tsx"
import { useConfirm } from "../feedback/useConfirm.ts"
import { EmptyState } from "../lists/ListRow.tsx"

// A Playlist's History (Entries it finished) and Listening Timeline (what it was playing
// and when), under date headings, newest first. Each Timeline moment can be rewound to
// (CONTEXT.md › Rewind; docs/design/ui-layout.md › Playlist settings and Rewind).

const clock = (millis: number) =>
  new Date(millis).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

const dayOf = (millis: number) => {
  const date = new Date(millis)
  const today = new Date()
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((start(today) - start(date)) / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

function ByDay<T>({
  items,
  at,
  children
}: {
  readonly items: ReadonlyArray<T>
  readonly at: (item: T) => number
  readonly children: (item: T) => ReactNode
}) {
  const days: Array<{ day: string; items: Array<T> }> = []
  for (const item of items) {
    const day = dayOf(at(item))
    const last = days.at(-1)
    if (last?.day === day) last.items.push(item)
    else days.push({ day, items: [item] })
  }
  return (
    // Plain rows under day headings, like the Library's groups.
    <div className="max-w-[960px] px-3 pb-8 md:px-6">
      {days.map(({ day, items }) => (
        <section key={day} aria-label={day} className="mt-4 first:mt-0">
          <h2 className="pb-1.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {day}
          </h2>
          <ol>{items.map(children)}</ol>
        </section>
      ))}
    </div>
  )
}

export function PlaylistHistory({ playlist }: { readonly playlist: Playlist.Playlist }) {
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  if (playlist.history.length === 0) {
    return (
      <EmptyState title="Nothing finished yet">
        Episodes this Playlist plays to the end appear here.
      </EmptyState>
    )
  }
  return (
    <ByDay items={playlist.history} at={(h) => h.finishedAt}>
      {(h) => (
        <li
          key={`${h.episodeId}-${h.finishedAt}`}
          className="flex min-h-14 items-center gap-3 border-b px-2 py-2 last:border-b-0"
        >
          <span className="w-12 shrink-0 text-small text-muted-foreground tabular-nums">
            {clock(h.finishedAt)}
          </span>
          <Link
            to="/episodes/$episodeId"
            params={{ episodeId: h.episodeId }}
            className="min-w-0 flex-1 truncate text-row font-medium hover:underline"
          >
            {episodes.get(h.episodeId)?.title ?? "Episode unavailable"}
          </Link>
        </li>
      )}
    </ByDay>
  )
}

export function PlaylistTimeline({ playlist }: { readonly playlist: Playlist.Playlist }) {
  const state = useAppState()
  const episodes = AsyncResult.getOrElse(useAtomValue(entryEpisodesAtom), () => new Map())
  const record = useAtomSet(recordAtom, { mode: "promise" })
  const confirm = useConfirm()
  const [asking, setAsking] = useState<TimelineEvent | null>(null)
  const events = timelineEvents(playlist)
  const title = (id: string) => episodes.get(id)?.title ?? "Episode unavailable"
  if (state === null) return null
  if (events.length === 0) {
    return (
      <EmptyState title="Nothing played yet">
        What this Playlist plays is kept here for 30 days, so you can go back to any moment.
      </EmptyState>
    )
  }
  const preview = asking ? previewRewind(state, playlist.id, momentOf(asking), Date.now()) : null
  const rewind = async (event: TimelineEvent) => {
    const to = momentOf(event)
    const before = state
    const done = previewRewind(before, playlist.id, to, Date.now())
    if (done === null) return
    await record(rewindChange(playlist.id, to))
    const step = {
      message: `Rewound ${playlist.name} to ${clock(to)}`,
      undo: undoRewind(before, done.after, playlist.id, Date.now())
    }
    confirm(step, async () => {
      await record(rewindChange(playlist.id, to))
      return step
    })
  }
  return (
    <>
      <p className="max-w-[70ch] px-4 pb-3 text-small text-muted-foreground md:px-8">
        What {playlist.name} played, kept for 30 days. Rewind takes playback back to a moment;
        Entries you added or moved since, and Episodes you marked Played yourself, stay as they are.
      </p>
      <ByDay items={events} at={momentOf}>
        {(event) => (
          <li
            key={`${event._tag}-${event.episodeId}-${momentOf(event)}`}
            className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 border-b px-2 py-2 last:border-b-0"
          >
            <span className="w-12 shrink-0 text-small text-muted-foreground tabular-nums">
              {clock(momentOf(event))}
            </span>
            {event._tag === "Finished" ? (
              <HistoryIcon aria-hidden="true" className="size-4 shrink-0 text-positive" />
            ) : (
              <Play aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 grow basis-[12rem]">
              <span className="block text-row">
                {event._tag === "Finished" ? "Finished " : "Listened to "}
                <span className="font-medium">{title(event.episodeId)}</span>
              </span>
              {event._tag === "Listened" && (
                <span className="block text-small text-muted-foreground tabular-nums">
                  {formatTime(event.from)} → {formatTime(event.to)}
                  {event.end > event.start ? ` · until ${clock(event.end)}` : ""}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setAsking(event)}
              className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 text-small font-medium hover:bg-input active:bg-input/70"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Rewind to here
            </button>
          </li>
        )}
      </ByDay>
      <ConfirmDialog
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        title={asking ? `Rewind ${playlist.name} to ${clock(momentOf(asking))}?` : "Rewind"}
        confirm="Rewind"
        onConfirm={() => {
          if (asking) void rewind(asking)
          setAsking(null)
        }}
      >
        {preview === null ? (
          "Nothing would change."
        ) : (
          <span className="block space-y-2">
            <span className="block">
              Back to <b className="text-foreground">{title(preview.cursor ?? "")}</b> at{" "}
              {formatTime(preview.position)}.
            </span>
            {preview.unplayed.length > 0 && (
              <span className="block">
                Unplayed again: {preview.unplayed.map(title).join(", ")}.
              </span>
            )}
            {preview.restored.length > 0 && (
              <span className="block">
                Back in the Playlist where they were: {preview.restored.map(title).join(", ")}.
              </span>
            )}
            <span className="block">
              Kept: Entries you added or moved since, and Episodes you marked Played yourself. You
              can undo the Rewind afterwards.
            </span>
          </span>
        )}
      </ConfirmDialog>
    </>
  )
}
