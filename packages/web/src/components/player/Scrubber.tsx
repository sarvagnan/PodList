import { useState } from "react"
import type { PlayerChapter } from "../../lib/chapters.ts"
import { formatTime } from "../../lib/time.ts"

/**
 * The seekable progress bar: a native range input (keyboard and screen readers get a
 * slider for free) drawn over a track with a tick at each Chapter. Dragging moves only
 * the thumb; the seek happens on release, so one drag is one Position report.
 */
export function Scrubber({
  position,
  duration,
  chapters,
  onSeek
}: {
  readonly position: number
  readonly duration: number | null
  readonly chapters: ReadonlyArray<PlayerChapter>
  readonly onSeek: (seconds: number) => void
}) {
  const [dragging, setDragging] = useState<number | null>(null)
  const value = dragging ?? position
  const percent = (seconds: number) => (duration ? Math.min(100, (seconds / duration) * 100) : 0)
  const commit = () => {
    if (dragging === null) return
    onSeek(dragging)
    setDragging(null)
  }
  return (
    <div className="flex items-center gap-2 text-xs text-player-muted tabular-nums">
      <span className="min-w-14 shrink-0 text-right whitespace-nowrap">{formatTime(value)}</span>
      <div className="relative grid h-6 flex-1 items-center">
        <div className="progress-track absolute inset-x-0 h-1 rounded-full bg-player-track" />
        <div
          className="progress-fill absolute left-0 h-1 rounded-full bg-progress"
          style={{ width: `${percent(value)}%` }}
        />
        {duration !== null &&
          chapters
            .slice(1)
            .map((c) => (
              <span
                key={c.start}
                aria-hidden="true"
                className="absolute h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-player-muted"
                style={{ left: `${percent(c.start)}%` }}
              />
            ))}
        <input
          type="range"
          min={0}
          max={duration ?? 0}
          step={1}
          value={Math.min(value, duration ?? 0)}
          disabled={duration === null}
          aria-label="Position"
          aria-valuetext={`${formatTime(value)} of ${formatTime(duration ?? 0)}`}
          onChange={(event) => setDragging(Number(event.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          className="peer absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-default"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-player-foreground peer-hover:size-3.5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-player-foreground"
          style={{ left: `${percent(value)}%` }}
        />
      </div>
      <span className="min-w-14 shrink-0 whitespace-nowrap">
        {duration ? `−${formatTime(duration - value)}` : ""}
      </span>
    </div>
  )
}
