import { type Library as LibraryApi, PodListApi, Sync } from "@podlist/api"
import type { Device, Library, Operation } from "@podlist/domain"
import { Context, Effect, Layer } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"

// How the sync engine reaches the server. The web build talks to the same origin
// (the server also serves the app); tests substitute an in-memory server.

export class Offline extends Error {
  override readonly name = "Offline"
}

export class Transport extends Context.Service<
  Transport,
  {
    readonly registerDevice: (device: Device.Device) => Effect.Effect<void, Offline>
    readonly push: (
      operations: ReadonlyArray<Operation.Operation>
    ) => Effect.Effect<Sync.PushResponse, Offline>
    readonly pull: (since: number) => Effect.Effect<Sync.PullResponse, Offline>
    readonly catalogue: (since: number) => Effect.Effect<LibraryApi.CatalogueChanges, Offline>
    /** An Episode's Chapters; the server resolves and caches them on first request. */
    readonly chapters: (episodeId: string) => Effect.Effect<ReadonlyArray<Library.Chapter>, Offline>
  }
>()("@podlist/web/Transport") {
  static readonly layerHttp = (baseUrl: string) =>
    Layer.effect(
      Transport,
      Effect.gen(function* () {
        const client = yield* HttpApiClient.make(PodListApi, {
          transformClient: HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl))
        })
        const offline = (e: unknown) => new Offline(e instanceof Error ? e.message : String(e))
        return Transport.of({
          registerDevice: (device) =>
            client.sync
              .registerDevice({ payload: device })
              .pipe(Effect.asVoid, Effect.mapError(offline)),
          push: (operations) =>
            client.sync
              .push({ payload: new Sync.PushRequest({ operations }) })
              .pipe(Effect.mapError(offline)),
          pull: (since) => client.sync.pull({ query: { since } }).pipe(Effect.mapError(offline)),
          catalogue: (since) =>
            client.library.changes({ query: { since } }).pipe(Effect.mapError(offline)),
          chapters: (id) =>
            client.library.chapters({ params: { id } }).pipe(Effect.mapError(offline))
        })
      })
    ).pipe(Layer.provide(FetchHttpClient.layer))
}
