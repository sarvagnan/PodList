import { Library, PlaybackSettings, View } from "@podlist/domain"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

export const Cursor = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))
export const PageSize = Schema.Int.pipe(
  Schema.check(Schema.isBetween({ minimum: 1, maximum: 200 }))
)
export const Page = {
  pageSize: Schema.optionalKey(PageSize),
  continuation: Schema.optionalKey(Schema.NonEmptyString)
}
const PageQuery = {
  pageSize: Schema.optionalKey(
    Schema.NumberFromString.pipe(
      Schema.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 200 }))
    )
  ),
  continuation: Page.continuation
}
export class Cursors extends Schema.Class<Cursors>("@podlist/api/Cursors")({
  state: Cursor,
  library: Cursor
}) {}
export class InvalidContinuation extends Schema.TaggedError<InvalidContinuation>()(
  "InvalidContinuation",
  {},
  { httpApiStatus: 400 }
) {}
export class ReadChanged extends Schema.TaggedError<ReadChanged>()(
  "ReadChanged",
  {},
  { httpApiStatus: 409 }
) {}
export class ReadNotFound extends Schema.TaggedError<ReadNotFound>()(
  "ReadNotFound",
  {},
  { httpApiStatus: 404 }
) {}
export const ViewInput = Schema.Struct({
  filter: View.ViewFilter,
  sort: View.ViewSort,
  limit: View.View.fields.limit
})
export class FilterRequest extends Schema.Class<FilterRequest>("@podlist/api/FilterRequest")({
  ...ViewInput.fields,
  ...Page
}) {}
export class SearchRequest extends Schema.Class<SearchRequest>("@podlist/api/SearchRequest")({
  q: Schema.NonEmptyString,
  ...Page
}) {}
export class EpisodeSummary extends Schema.Class<EpisodeSummary>("@podlist/api/EpisodeSummary")({
  id: Schema.String,
  title: Schema.String,
  podcast: Schema.String,
  duration: Schema.NullOr(Schema.Number),
  artworkUrl: Schema.NullOr(Schema.String)
}) {}
export class ViewEpisode extends Schema.Class<ViewEpisode>("@podlist/api/ViewEpisode")({
  ...EpisodeSummary.fields,
  published: Schema.Number,
  played: Schema.Boolean,
  starred: Schema.Boolean
}) {}
export class EpisodePage extends Schema.Class<EpisodePage>("@podlist/api/EpisodePage")({
  items: Schema.Array(ViewEpisode),
  total: Cursor,
  continuation: Schema.NullOr(Schema.String),
  cursors: Cursors
}) {}
export class SummaryRequest extends Schema.Class<SummaryRequest>("@podlist/api/SummaryRequest")({
  ids: Schema.Array(Schema.NonEmptyString).pipe(Schema.check(Schema.isMaxLength(200)))
}) {}
export class SubscriptionDetail extends Schema.Class<SubscriptionDetail>(
  "@podlist/api/SubscriptionDetail"
)({
  id: Schema.String,
  feedUrl: Schema.String,
  title: Schema.String,
  author: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  artworkUrl: Schema.NullOr(Schema.String),
  subscribed: Schema.Boolean,
  playedThreshold: Schema.NullOr(Schema.Number),
  playbackSettings: PlaybackSettings.PlaybackSettingsOverride,
  episodes: Cursor,
  unplayed: Cursor,
  speed: Schema.NullOr(Schema.Number),
  customSettings: Cursor
}) {}
export class SubscriptionPage extends Schema.Class<SubscriptionPage>(
  "@podlist/api/SubscriptionPage"
)({
  items: Schema.Array(SubscriptionDetail),
  total: Cursor,
  continuation: Schema.NullOr(Schema.String),
  cursors: Cursors
}) {}
export class EpisodeDetail extends Schema.Class<EpisodeDetail>("@podlist/api/EpisodeDetail")({
  ...EpisodeSummary.fields,
  published: Schema.Number,
  description: Schema.String,
  audioUrl: Schema.String,
  subscriptionId: Schema.String,
  threshold: Schema.NullOr(Schema.Number),
  override: PlaybackSettings.PlaybackSettingsOverride,
  chapters: Schema.Array(Library.Chapter)
}) {}
export class ViewCounts extends Schema.Class<ViewCounts>("@podlist/api/ViewCounts")({
  counts: Schema.Array(Schema.Struct({ id: Schema.String, count: Cursor })),
  cursors: Cursors
}) {}
// Metadata stays separate from State. The viewing Device computes Listening.stats in its calendar.
export class StatsPage extends Schema.Class<StatsPage>("@podlist/api/StatsPage")({
  items: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.NullOr(Schema.String) })),
  total: Cursor,
  continuation: Schema.NullOr(Schema.String),
  cursors: Cursors
}) {}
const errors = [InvalidContinuation, ReadChanged, ReadNotFound] as const
export class ReadsApi extends HttpApiGroup.make("reads")
  .add(
    HttpApiEndpoint.get("view", "/reads/views/:id", {
      params: { id: Schema.String },
      query: PageQuery,
      success: EpisodePage,
      error: errors
    })
  )
  .add(
    HttpApiEndpoint.post("filter", "/reads/filter", {
      payload: FilterRequest,
      success: EpisodePage,
      error: errors
    })
  )
  .add(
    HttpApiEndpoint.post("search", "/reads/search", {
      payload: SearchRequest,
      success: EpisodePage,
      error: errors
    })
  )
  .add(HttpApiEndpoint.get("counts", "/reads/views/counts", { success: ViewCounts }))
  .add(
    HttpApiEndpoint.post("summaries", "/reads/episodes", {
      payload: SummaryRequest,
      success: Schema.Array(EpisodeSummary)
    })
  )
  .add(
    HttpApiEndpoint.get("episode", "/reads/episodes/:id", {
      params: { id: Schema.String },
      success: EpisodeDetail,
      error: ReadNotFound
    })
  )
  .add(
    HttpApiEndpoint.get("subscriptions", "/reads/subscriptions", {
      query: PageQuery,
      success: SubscriptionPage,
      error: errors
    })
  )
  .add(
    HttpApiEndpoint.get("subscription", "/reads/subscriptions/:id", {
      params: { id: Schema.String },
      success: SubscriptionDetail,
      error: ReadNotFound
    })
  )
  .add(
    HttpApiEndpoint.get("stats", "/reads/stats/:kind", {
      params: { kind: Schema.Literals(["podcasts", "episodes"]) },
      query: PageQuery,
      success: StatsPage,
      error: errors
    })
  )
  .add(HttpApiEndpoint.get("cursors", "/live/cursors", { success: Cursors })) {}

export const livePath = "/api/live"
export const Notification = Schema.Struct({
  ...Cursors.fields,
  /** Always fetch fresh reads on connect; reset also requests a full State pull. */
  reset: Schema.Boolean
})
