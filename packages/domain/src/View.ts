import { Schema } from "effect"
import { SubscriptionId, ViewId } from "./Ids.ts"
import { EpochMillis, PositiveInt, Seconds } from "./Units.ts"

/** Published date condition: relative to now, or a fixed range. */
export const PublishedFilter = Schema.Union([
  Schema.TaggedStruct("LastDays", { days: PositiveInt }),
  Schema.TaggedStruct("Between", {
    from: Schema.NullOr(EpochMillis),
    to: Schema.NullOr(EpochMillis)
  })
])
export type PublishedFilter = typeof PublishedFilter.Type

export const PodcastFilter = Schema.Struct({
  mode: Schema.Literals(["include", "exclude"]),
  subscriptionIds: Schema.NonEmptyArray(SubscriptionId)
})
export type PodcastFilter = typeof PodcastFilter.Type

/**
 * A flat AND of conditions over the Library; every key that is present must match.
 * "inProgress" means unplayed with a non-zero Position in some Entry.
 */
export const ViewFilter = Schema.Struct({
  published: Schema.optionalKey(PublishedFilter),
  podcasts: Schema.optionalKey(PodcastFilter),
  text: Schema.optionalKey(Schema.NonEmptyString),
  played: Schema.optionalKey(Schema.Literals(["unplayed", "inProgress", "played"])),
  starred: Schema.optionalKey(Schema.Boolean),
  notInAnyPlaylist: Schema.optionalKey(Schema.Literal(true)),
  minDuration: Schema.optionalKey(Seconds),
  maxDuration: Schema.optionalKey(Seconds)
})
export type ViewFilter = typeof ViewFilter.Type

export const ViewSort = Schema.Literals([
  "publishedDesc",
  "publishedAsc",
  "durationAsc",
  "durationDesc"
])
export type ViewSort = typeof ViewSort.Type

/** A saved, named filter over the Library, re-evaluated every time it is opened. */
export class View extends Schema.Class<View>("@podlist/domain/View")({
  id: ViewId,
  name: Schema.NonEmptyString,
  filter: ViewFilter,
  sort: ViewSort,
  limit: Schema.NullOr(PositiveInt)
}) {}
