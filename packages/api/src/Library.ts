import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

export class RefreshSummary extends Schema.Class<RefreshSummary>("@podlist/api/RefreshSummary")({
  checked: Schema.Int,
  updated: Schema.Int,
  notModified: Schema.Int,
  failed: Schema.Int
}) {}

export const RefreshResult = Schema.Union([
  Schema.TaggedStruct("NotModified", {}),
  Schema.TaggedStruct("Updated", { added: Schema.Int, changed: Schema.Int })
])

export class FeedFailed extends Schema.TaggedError<FeedFailed>()(
  "FeedFailed",
  { message: Schema.String },
  { httpApiStatus: 502 }
) {}

export class SubscriptionNotFound extends Schema.TaggedError<SubscriptionNotFound>()(
  "SubscriptionNotFound",
  {},
  { httpApiStatus: 404 }
) {}

export class LibraryApi extends HttpApiGroup.make("library")
  .add(HttpApiEndpoint.post("refreshAll", "/library/refresh", { success: RefreshSummary }))
  .add(
    HttpApiEndpoint.post("refreshSubscription", "/subscriptions/:id/refresh", {
      params: { id: Schema.String },
      success: RefreshResult,
      error: [FeedFailed, SubscriptionNotFound]
    })
  ) {}
