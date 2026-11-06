import { Schema } from "effect"
import { EpisodeId, PlaylistId } from "./Ids.ts"
import { EpochMillis, Seconds } from "./Units.ts"

/**
 * An Episode's membership in one Playlist. An Episode appears at most once per
 * Playlist, so the Episode id identifies the Entry within it. Position lives here,
 * not on the Episode (ADR 0001).
 */
export class Entry extends Schema.Class<Entry>("@podlist/domain/Entry")({
  episodeId: EpisodeId,
  position: Seconds,
  /** When `position` was listened to; the latest listen wins across Devices (ADR 0003). */
  positionAt: EpochMillis
}) {}

/** An ordered collection of Entries with its own playback state. */
export class Playlist extends Schema.Class<Playlist>("@podlist/domain/Playlist")({
  id: PlaylistId,
  name: Schema.NonEmptyString,
  /** The one Playlist that always exists and cannot be deleted or renamed. */
  isDefault: Schema.Boolean,
  /** Entries leave once their Episode becomes Played, wherever that happened. */
  clearOnPlayed: Schema.Boolean,
  entries: Schema.Array(Entry),
  /** The current Entry, or null when the Playlist has run past its end. */
  cursor: Schema.NullOr(EpisodeId)
}) {}

/** The Default Playlist's fixed id; it exists for every user from the start. */
export const DefaultPlaylistId = PlaylistId.make("default")
