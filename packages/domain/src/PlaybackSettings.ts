import { Schema } from "effect"
import { Seconds } from "./Units.ts"

export const PlaybackSpeed = Schema.Finite.pipe(
  Schema.check(Schema.isBetween({ minimum: 0.5, maximum: 3 }))
)

/** Global defaults; each Subscription may override any of them, never a Playlist. */
export class PlaybackSettings extends Schema.Class<PlaybackSettings>(
  "@podlist/domain/PlaybackSettings"
)({
  speed: PlaybackSpeed,
  skipIntro: Seconds,
  skipOutro: Seconds,
  volumeBoost: Schema.Boolean
}) {}

/** A Subscription's overrides: only the keys present replace the global defaults. */
export const PlaybackSettingsOverride = Schema.Struct({
  speed: Schema.optionalKey(PlaybackSpeed),
  skipIntro: Schema.optionalKey(Seconds),
  skipOutro: Schema.optionalKey(Seconds),
  volumeBoost: Schema.optionalKey(Schema.Boolean)
})
export type PlaybackSettingsOverride = typeof PlaybackSettingsOverride.Type
