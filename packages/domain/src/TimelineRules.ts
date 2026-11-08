import type { EpisodeId } from "./Ids.ts"
import { Playlist, PlaylistEdit, TimelinePoint } from "./Playlist.ts"
import type { EpochMillis, Seconds } from "./Units.ts"

/** The Listening Timeline keeps 30 days (Q43). */
export const retentionMillis = 30 * 24 * 60 * 60 * 1000
/** At most one point a minute per Episode, so the Timeline stays small. */
export const spacingMillis = 60 * 1000

/** Records where playback was. Reports may arrive out of order from several Devices. */
export const record = (
  playlist: Playlist,
  episodeId: EpisodeId,
  position: Seconds,
  at: EpochMillis
): Playlist => {
  const newest = Math.max(at, ...playlist.timeline.map((t) => t.at))
  if (at < newest - retentionMillis) return playlist
  const tooClose = playlist.timeline.some(
    (t) => t.episodeId === episodeId && Math.abs(t.at - at) < spacingMillis
  )
  if (tooClose) return playlist
  const timeline = [
    ...playlist.timeline.filter((t) => t.at >= newest - retentionMillis),
    new TimelinePoint({ at, episodeId, position })
  ].sort((a, b) => a.at - b.at)
  return new Playlist({ ...playlist, timeline })
}

/** The last point at or before `to`, which is where a Rewind returns to. */
export const pointAt = (playlist: Playlist, to: EpochMillis): TimelinePoint | undefined =>
  playlist.timeline.findLast((t) => t.at <= to)

/** At most this many edits are kept per Playlist, besides the 30 days. */
export const editLimit = 300

/** Records one of the person's own edits, for the Listening Timeline. */
export const recordEdit = (
  playlist: Playlist,
  kind: PlaylistEdit["kind"],
  episodeId: EpisodeId,
  at: EpochMillis
): Playlist => {
  const edits = [...(playlist.edits ?? []), new PlaylistEdit({ at, kind, episodeId })]
    .filter((e) => e.at >= at - retentionMillis)
    .sort((a, b) => a.at - b.at)
    .slice(-editLimit)
  return new Playlist({ ...playlist, edits })
}
