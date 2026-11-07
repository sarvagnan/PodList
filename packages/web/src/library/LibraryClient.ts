import { type Directory, PodListApi, Subscriptions } from "@podlist/api"
import type { Library } from "@podlist/domain"
import { Context, Effect, Layer } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"

// The Library's server calls that aren't sync operations: finding podcasts, following
// and unfollowing them, and OPML. Each needs the server, so each can fail offline.

export class LibraryError extends Error {
  override readonly name = "LibraryError"
}

export class LibraryClient extends Context.Service<
  LibraryClient,
  {
    readonly search: (
      query: string
    ) => Effect.Effect<ReadonlyArray<Directory.DirectoryResult>, LibraryError>
    readonly subscribe: (feedUrl: string) => Effect.Effect<Library.Subscription, LibraryError>
    readonly unsubscribe: (subscriptionId: string) => Effect.Effect<void, LibraryError>
    readonly importOpml: (opml: string) => Effect.Effect<Subscriptions.ImportSummary, LibraryError>
  }
>()("@podlist/web/LibraryClient") {
  static readonly layerHttp = (baseUrl: string) =>
    Layer.effect(
      LibraryClient,
      Effect.gen(function* () {
        const client = yield* HttpApiClient.make(PodListApi, {
          transformClient: HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl))
        })
        const fail = (message: string) => (e: unknown) =>
          new LibraryError(
            typeof e === "object" && e !== null && "_tag" in e && e._tag === "FeedFailed"
              ? "That address didn’t give a podcast feed."
              : message
          )
        const offline = "PodList couldn’t reach your server. Check that you’re online."
        return LibraryClient.of({
          search: (q) =>
            client.directory.search({ query: { q } }).pipe(Effect.mapError(fail(offline))),
          subscribe: (feedUrl) =>
            client.subscriptions
              .subscribe({ payload: new Subscriptions.SubscribeRequest({ feedUrl }) })
              .pipe(Effect.mapError(fail(offline))),
          unsubscribe: (id) =>
            client.subscriptions
              .unsubscribe({ params: { id } })
              .pipe(Effect.asVoid, Effect.mapError(fail(offline))),
          importOpml: (opml) =>
            client.subscriptions
              .importOpml({ payload: new Subscriptions.ImportRequest({ opml }) })
              .pipe(Effect.mapError(fail(offline)))
        })
      })
    ).pipe(Layer.provide(FetchHttpClient.layer))
}
