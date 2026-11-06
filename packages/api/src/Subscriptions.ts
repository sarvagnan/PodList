import { Library as Domain } from "@podlist/domain"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { FeedFailed, SubscriptionNotFound } from "./Library.ts"

export class SubscribeRequest extends Schema.Class<SubscribeRequest>(
  "@podlist/api/SubscribeRequest"
)({
  feedUrl: Schema.NonEmptyString
}) {}

export class ImportRequest extends Schema.Class<ImportRequest>("@podlist/api/ImportRequest")({
  opml: Schema.String
}) {}

export class ImportSummary extends Schema.Class<ImportSummary>("@podlist/api/ImportSummary")({
  added: Schema.Int,
  alreadySubscribed: Schema.Int,
  failed: Schema.Array(Schema.Struct({ feedUrl: Schema.String, message: Schema.String }))
}) {}

export class SubscriptionsApi extends HttpApiGroup.make("subscriptions")
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
