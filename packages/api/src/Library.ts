import { Library as Domain } from "@podlist/domain"
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

/** One page of catalogue rows changed after a cursor; ask again from `cursor` while `more`. */
export class CatalogueChanges extends Schema.Class<CatalogueChanges>(
  "@podlist/api/CatalogueChanges"
)({
  cursor: Schema.Int,
  subscriptions: Schema.Array(Domain.Subscription),
  episodes: Schema.Array(Domain.Episode),
  more: Schema.Boolean
}) {}

const IntFromString = Schema.NumberFromString.pipe(Schema.check(Schema.isInt()))

export class LibraryApi extends HttpApiGroup.make("library")
  .add(
    HttpApiEndpoint.get("changes", "/library/changes", {
      query: { since: IntFromString, limit: Schema.optionalKey(IntFromString) },
      success: CatalogueChanges
    })
  )
  .add(HttpApiEndpoint.post("refreshAll", "/library/refresh", { success: RefreshSummary }))
  .add(
    HttpApiEndpoint.post("refreshSubscription", "/subscriptions/:id/refresh", {
      params: { id: Schema.String },
      success: RefreshResult,
      error: [FeedFailed, SubscriptionNotFound]
    })
  ) {}
