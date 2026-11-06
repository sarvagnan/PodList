import type { EpisodeId } from "./Ids.ts"
import { Entry, HistoryItem, historyLimit, Playlist } from "./Playlist.ts"
import * as PlaylistRules from "./PlaylistRules.ts"
import { type EpochMillis, Seconds } from "./Units.ts"

/** Listening to within this many seconds of the end counts as finishing (Q30). */
export const defaultPlayedThreshold = Seconds.make(30)

/**
 * Whether a Position counts as finishing the Episode. `threshold` is the
 * Subscription's override, or the default when null. Unknown durations never finish
 * early; the end of the audio still marks them Played.
 */
export const isFinished = (
  position: Seconds,
  duration: Seconds | null,
  threshold: Seconds | null
): boolean =>
  duration !== null && position >= Math.max(0, duration - (threshold ?? defaultPlayedThreshold))

/**
 * What one Playlist does when an Episode becomes Played.
 *
 * - `finishedHere`: this Playlist's own playback finished it, so it enters History,
 *   and a Playlist that keeps Entries resets it to 0:00 and moves its Cursor on (Q17).
 * - Clear on Played removes the Entry wherever the Episode was Played (Q16); Star
 *   does not prevent that (Q20).
 */
export const onPlayed = (
  playlist: Playlist,
  episodeId: EpisodeId,
  finishedHere: boolean,
  at: EpochMillis
): Playlist => {
  const index = playlist.entries.findIndex((e) => e.episodeId === episodeId)
  if (index === -1) return playlist
  let next = playlist
  if (finishedHere) {
    const history = [new HistoryItem({ episodeId, finishedAt: at }), ...playlist.history].slice(
      0,
      historyLimit
    )
    next = new Playlist({ ...next, history })
    if (!playlist.clearOnPlayed) {
      const entries = next.entries.map((e) =>
        e.episodeId === episodeId
          ? new Entry({ ...e, position: Seconds.make(0), positionAt: at })
          : e
      )
      const cursor =
        next.cursor === episodeId ? (next.entries[index + 1]?.episodeId ?? null) : next.cursor
      next = new Playlist({ ...next, entries, cursor })
    }
  }
  return playlist.clearOnPlayed ? PlaylistRules.removeEntry(next, episodeId) : next
}
