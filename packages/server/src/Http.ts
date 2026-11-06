import {
  Library as LibraryApi,
  PodListApi,
  Subscriptions as SubscriptionsApi,
  Sync,
  System
} from "@podlist/api"
import { Protocol } from "@podlist/domain"
import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Poller } from "./Poller.ts"
import { Subscriptions } from "./Subscriptions.ts"
import { SyncStore } from "./SyncStore.ts"

export const SystemHandlers = HttpApiBuilder.group(
  PodListApi,
  "system",
  Effect.fn(function* (handlers) {
    return handlers.handleAll({
      health: () =>
        Effect.succeed(new System.Health({ status: "ok", protocolVersion: Protocol.version }))
    })
  })
)

export const SyncHandlers = HttpApiBuilder.group(
  PodListApi,
  "sync",
  Effect.fn(function* (handlers) {
    const store = yield* SyncStore
    return handlers.handleAll({
      registerDevice: ({ payload }) => store.registerDevice(payload),
      push: ({ payload }) =>
        store.push(payload.operations).pipe(Effect.map((r) => new Sync.PushResponse(r))),
      pull: ({ query }) => store.pull(query.since).pipe(Effect.map((r) => new Sync.PullResponse(r)))
    })
  })
)

export const LibraryHandlers = HttpApiBuilder.group(
  PodListApi,
  "library",
  Effect.fn(function* (handlers) {
    const poller = yield* Poller
    return handlers.handleAll({
      refreshAll: () =>
        poller
          .refreshAll({ respectBackoff: false })
          .pipe(Effect.map((s) => new LibraryApi.RefreshSummary(s))),
      refreshSubscription: ({ params }) =>
        poller
          .refreshOne(params.id)
          .pipe(
            Effect.mapError((e) =>
              e._tag === "SubscriptionNotFound"
                ? new LibraryApi.SubscriptionNotFound()
                : new LibraryApi.FeedFailed({ message: e.message })
            )
          )
    })
  })
)

export const SubscriptionsHandlers = HttpApiBuilder.group(
  PodListApi,
  "subscriptions",
  Effect.fn(function* (handlers) {
    const subscriptions = yield* Subscriptions
    return handlers.handleAll({
      list: () => subscriptions.list,
      subscribe: ({ payload }) =>
        subscriptions
          .subscribe(payload.feedUrl)
          .pipe(Effect.mapError((e) => new LibraryApi.FeedFailed({ message: e.message }))),
      unsubscribe: ({ params }) =>
        subscriptions
          .unsubscribe(params.id)
          .pipe(Effect.mapError(() => new LibraryApi.SubscriptionNotFound())),
      importOpml: ({ payload }) =>
        subscriptions
          .importOpml(payload.opml)
          .pipe(Effect.map((s) => new SubscriptionsApi.ImportSummary(s))),
      exportOpml: () => subscriptions.exportOpml
    })
  })
)

export const ApiRoutes = HttpApiBuilder.layer(PodListApi, {
  openapiPath: "/api/openapi.json"
}).pipe(Layer.provide([SystemHandlers, SyncHandlers, LibraryHandlers, SubscriptionsHandlers]))
