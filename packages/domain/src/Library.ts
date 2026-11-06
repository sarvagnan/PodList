import { Schema } from "effect"
import { EpisodeId, PlaylistId, SubscriptionId } from "./Ids.ts"
import { PlaybackSettingsOverride } from "./PlaybackSettings.ts"
import { EpochMillis, Seconds } from "./Units.ts"

/**
 * An image published by the podcast. A podcast always has one; an Episode and each
 * Chapter may override it (CONTEXT.md › Artwork).
 */
export class Artwork extends Schema.Class<Artwork>("@podlist/domain/Artwork")({
  url: Schema.String
}) {}

/** A titled, timestamped section of an Episode, as published by the podcast. */
export class Chapter extends Schema.Class<Chapter>("@podlist/domain/Chapter")({
  start: Seconds,
  title: Schema.String,
  artwork: Schema.NullOr(Artwork),
  url: Schema.NullOr(Schema.String)
}) {}

/** A podcast the user follows. The only way an Episode enters the Library. */
export class Subscription extends Schema.Class<Subscription>("@podlist/domain/Subscription")({
  id: SubscriptionId,
  feedUrl: Schema.String,
  title: Schema.String,
  author: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  artwork: Schema.NullOr(Artwork),
  subscribedAt: EpochMillis,
  /** Seconds before the end that count as finishing; null uses the global default (30 s). */
  playedThreshold: Schema.NullOr(Seconds),
  playbackSettings: PlaybackSettingsOverride
}) {}

/** A single published item of a subscribed podcast, independent of any Playlist. */
export class Episode extends Schema.Class<Episode>("@podlist/domain/Episode")({
  id: EpisodeId,
  subscriptionId: SubscriptionId,
  /** The feed's own identifier for the item. */
  guid: Schema.String,
  title: Schema.String,
  description: Schema.String,
  /** When the feed says the Episode was released. "New" always means this. */
  published: EpochMillis,
  duration: Schema.NullOr(Seconds),
  audioUrl: Schema.String,
  artwork: Schema.NullOr(Artwork),
  chapters: Schema.Array(Chapter),
  /** Set when the feed replaced the audio with a different-length file (Q34). */
  audioUpdatedAt: Schema.NullOr(EpochMillis)
}) {}

/** Who made an Episode Played. Rewind may only undo the Playback kind (ADR 0006). */
export const PlayedSource = Schema.Union([
  Schema.TaggedStruct("Playback", { playlistId: PlaylistId }),
  Schema.TaggedStruct("User", {})
])
export type PlayedSource = typeof PlayedSource.Type

export class Played extends Schema.Class<Played>("@podlist/domain/Played")({
  at: EpochMillis,
  source: PlayedSource
}) {}

/** The user's Episode-level facts: Played and Star apply everywhere, not per Playlist. */
export class EpisodeState extends Schema.Class<EpisodeState>("@podlist/domain/EpisodeState")({
  episodeId: EpisodeId,
  played: Schema.NullOr(Played),
  starred: Schema.Boolean
}) {}
