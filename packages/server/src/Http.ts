import {
  Directory as DirectoryApi,
  Library as LibraryApi,
  PodListApi,
  Subscriptions as SubscriptionsApi,
  Sync,
  System
} from "@podlist/api"
import { openApiDocument } from "@podlist/api/openapi"
import { Protocol } from "@podlist/domain"
import { Config, Effect, Layer, Option } from "effect"
import { HttpApiBuilder, OpenApi } from "effect/http-api"
import { Catalogue } from "./Catalogue.ts"
import { Chapters } from "./Chapters.ts"
import { Directory } from "./Directory.ts"
import { Poller } from "./Poller.ts"
import { Subscriptions } from "./Subscriptions.ts"
import { SyncStore } from "./SyncStore.ts"

export const SystemHandlers = HttpApiBuilder.group(
  PodListApi,
  "system",
  Effect.fn(function* (handlers) {
    // Set by the deploy (deploy/deploy), so it can tell when the new release answers.
    const release = yield* Config.option(Config.String("PODLIST_RELEASE"))
    return handlers.handleAll({
      health: () =>
        Effect.succeed(
          new System.Health({
            status: "ok",
            protocolVersion: Protocol.version,
            ...Option.match(release, { onNone: () => ({}), onSome: (r) => ({ release: r }) })
          })
        )
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
    const catalogue = yield* Catalogue
    const chapters = yield* Chapters
    return handlers.handleAll({
      chapters: ({ params }) =>
        chapters
          .forEpisode(params.id)
          .pipe(Effect.mapError(() => new LibraryApi.EpisodeNotFound())),
      changes: ({ query }) =>
        catalogue
          .changes(query.since, query.limit === undefined ? undefined : Math.min(query.limit, 2000))
          .pipe(Effect.map((c) => new LibraryApi.CatalogueChanges(c))),
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
      readPodcast: ({ payload }) =>
        subscriptions
          .readPodcast(payload.feedUrl)
          .pipe(Effect.mapError((e) => new LibraryApi.FeedFailed({ message: e.message }))),
      bringEpisode: ({ payload }) =>
        subscriptions
          .bringEpisode(payload.feedUrl, payload.guid)
          .pipe(Effect.mapError((e) => new LibraryApi.FeedFailed({ message: e.message }))),
      bringOver: ({ payload }) => subscriptions.bringOver(payload),
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

export const DirectoryHandlers = HttpApiBuilder.group(
  PodListApi,
  "directory",
  Effect.fn(function* (handlers) {
    const directory = yield* Directory
    return handlers.handleAll({
      search: ({ query }) =>
        directory
          .search(query.q)
          .pipe(Effect.map((results) => results.map((r) => new DirectoryApi.DirectoryResult(r))))
    })
  })
)

export const ApiRoutes = HttpApiBuilder.layer(
  PodListApi.annotate(OpenApi.Transform, () => openApiDocument()),
  {
    openapiPath: "/api/openapi.json"
  }
).pipe(
  Layer.provide([
    SystemHandlers,
    SyncHandlers,
    LibraryHandlers,
    SubscriptionsHandlers,
    DirectoryHandlers
  ])
)
