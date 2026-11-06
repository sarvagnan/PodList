import { Schema } from "effect"

/** A moment in time as milliseconds since the Unix epoch (UTC). */
export const EpochMillis = Schema.Int.pipe(
  Schema.check(Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("EpochMillis")
)
export type EpochMillis = typeof EpochMillis.Type

/** A length of audio, or a point within it, in seconds. */
export const Seconds = Schema.Finite.pipe(
  Schema.check(Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("Seconds")
)
export type Seconds = typeof Seconds.Type

export const PositiveInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1)))
