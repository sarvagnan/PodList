import { Library as Domain } from "@podlist/domain"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { FeedFailed, SubscriptionNotFound } from "./Library.ts"

export class SubscribeRequest extends Schema.Class<SubscribeRequest>(
  "@podlist/api/SubscribeRequest"
)({
  feedUrl: Schema.NonEmptyString
}) {}

/** Feed metadata is transient until a person subscribes or brings in one Episode. */
export class PodcastFeed extends Schema.Class<PodcastFeed>("@podlist/api/PodcastFeed")({
  title: Schema.String,
  author: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  artworkUrl: Schema.NullOr(Schema.String),
  episodes: Schema.Array(
    Schema.Struct({
      guid: Schema.String,
      title: Schema.String,
      description: Schema.String,
      published: Schema.Number,
      duration: Schema.NullOr(Schema.Number),
      audioUrl: Schema.String,
      artworkUrl: Schema.NullOr(Schema.String),
      chaptersUrl: Schema.NullOr(Schema.String)
    })
  )
}) {}

export class BringEpisodeRequest extends Schema.Class<BringEpisodeRequest>(
  "@podlist/api/BringEpisodeRequest"
)({
  feedUrl: Schema.NonEmptyString,
  guid: Schema.String
}) {}

export class BroughtEpisode extends Schema.Class<BroughtEpisode>("@podlist/api/BroughtEpisode")({
  subscriptionId: Schema.String,
  episodeId: Schema.String
}) {}

export class ImportRequest extends Schema.Class<ImportRequest>("@podlist/api/ImportRequest")({
  opml: Schema.String
}) {}

export class ImportSummary extends Schema.Class<ImportSummary>("@podlist/api/ImportSummary")({
  added: Schema.Int,
  alreadySubscribed: Schema.Int,
  failed: Schema.Array(Schema.Struct({ feedUrl: Schema.String, message: Schema.String }))
}) {}

/** Library metadata only: identities are feed address and (feed address, guid), never client ids. */
export const BringOverSubscription = Schema.Struct({
  feedUrl: Schema.NonEmptyString,
  title: Domain.Subscription.fields.title,
  author: Domain.Subscription.fields.author,
  description: Domain.Subscription.fields.description,
  artwork: Domain.Subscription.fields.artwork,
  subscribedAt: Domain.Subscription.fields.subscribedAt,
  unsubscribedAt: Domain.Subscription.fields.unsubscribedAt,
  playedThreshold: Domain.Subscription.fields.playedThreshold,
  playbackSettings: Domain.Subscription.fields.playbackSettings
})

export const BringOverEpisode = Schema.Struct({
  feedUrl: Schema.NonEmptyString,
  guid: Domain.Episode.fields.guid,
  title: Domain.Episode.fields.title,
  description: Domain.Episode.fields.description,
  published: Domain.Episode.fields.published,
  duration: Domain.Episode.fields.duration,
  audioUrl: Domain.Episode.fields.audioUrl,
  artwork: Domain.Episode.fields.artwork,
  chapters: Domain.Episode.fields.chapters,
  audioUpdatedAt: Domain.Episode.fields.audioUpdatedAt
})

export class BringOverRequest extends Schema.Class<BringOverRequest>(
  "@podlist/api/BringOverRequest"
)({
  subscriptions: Schema.Array(BringOverSubscription),
  episodes: Schema.Array(BringOverEpisode)
}) {}

export class MissingSubscription extends Schema.TaggedError<MissingSubscription>()(
  "MissingSubscription",
  { feedUrl: Schema.String },
  { httpApiStatus: 400 }
) {}

export class SubscriptionsApi extends HttpApiGroup.make("subscriptions")
  .add(
    HttpApiEndpoint.post("readPodcast", "/podcasts/read", {
      payload: SubscribeRequest,
      success: PodcastFeed,
      error: FeedFailed
    })
  )
  .add(
    HttpApiEndpoint.post("bringEpisode", "/podcasts/episodes", {
      payload: BringEpisodeRequest,
      success: BroughtEpisode,
      error: FeedFailed
    })
  )
  .add(
    HttpApiEndpoint.get("list", "/subscriptions", { success: Schema.Array(Domain.Subscription) })
  )
  .add(
    HttpApiEndpoint.post("subscribe", "/subscriptions", {
      payload: SubscribeRequest,
      success: Domain.Subscription,
      error: FeedFailed
    })
  )
  .add(
    HttpApiEndpoint.delete("unsubscribe", "/subscriptions/:id", {
      params: { id: Schema.String },
      success: Domain.Subscription,
      error: SubscriptionNotFound
    })
  )
  .add(
    HttpApiEndpoint.post("bringOver", "/subscriptions/bring-over", {
      payload: BringOverRequest,
      success: HttpApiSchema.NoContent,
      error: MissingSubscription
    })
  )
  .add(
    HttpApiEndpoint.post("importOpml", "/subscriptions/import", {
      payload: ImportRequest,
      success: ImportSummary
    })
  )
  .add(
    HttpApiEndpoint.get("exportOpml", "/subscriptions/export", {
      success: Schema.String.pipe(HttpApiSchema.asText({ contentType: "text/x-opml" }))
    })
  ) {}
