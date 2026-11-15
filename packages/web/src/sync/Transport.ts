import { type Library as LibraryApi, PodListApi, Sync } from "@podlist/api"
import { type Device, type Library, Operation, Protocol } from "@podlist/domain"
import { Context, Effect, Layer, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"

// How the sync engine reaches the server. The web build talks to the same origin
// (the server also serves the app); tests substitute an in-memory server.

export class Offline extends Error {
  override readonly name = "Offline"
}

export class SyncBlocked extends Offline {
  readonly reason: "UpdateRequired" | "UnsupportedOperation"
  readonly protocolVersion: number
  constructor(reason: "UpdateRequired" | "UnsupportedOperation", protocolVersion: number) {
    super(
      reason === "UpdateRequired"
        ? "Update PodList to keep syncing"
        : "Update the PodList server to keep syncing"
    )
    this.reason = reason
    this.protocolVersion = protocolVersion
  }
}

export class Transport extends Context.Service<
  Transport,
  {
    readonly serverVersion?: Effect.Effect<number, Offline>
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
        const json = (path: string, body?: unknown) =>
          Effect.tryPromise({
            try: async (signal) => {
              const response = await fetch(`${baseUrl}/api/${path}`, {
                method: body === undefined ? "GET" : "POST",
                signal,
                headers: {
                  "content-type": "application/json",
                  [Protocol.versionHeader]: String(Protocol.version)
                },
                ...(body === undefined ? {} : { body: JSON.stringify(body) })
              })
              if (response.status === 426 || response.status === 422) {
                const error = (await response.json()) as {
                  _tag?: string
                  minimumProtocolVersion?: number
                  serverProtocolVersion?: number
                }
                if (error._tag === "UpdateRequired")
                  throw new SyncBlocked(
                    "UpdateRequired",
                    error.minimumProtocolVersion ?? Protocol.version + 1
                  )
                if (error._tag === "UnsupportedOperation")
                  throw new SyncBlocked(
                    "UnsupportedOperation",
                    error.serverProtocolVersion ?? Protocol.legacyVersion
                  )
              }
              if (!response.ok) throw new Offline(`HTTP ${response.status}`)
              return (await response.json()) as unknown
            },
            catch: (error) => (error instanceof Offline ? error : offline(error))
          })
        const serverVersion = client.system.health().pipe(
          Effect.map((health) => health.protocolVersion),
          Effect.mapError(offline)
        )
        return Transport.of({
          serverVersion,
          registerDevice: (device) =>
            client.sync
              .registerDevice({ payload: device })
              .pipe(Effect.asVoid, Effect.mapError(offline)),
          push: (operations) =>
            Effect.gen(function* () {
              const required = Protocol.requiredVersion(operations.map((o) => o.change._tag))
              if (required > Protocol.legacyVersion) {
                const version = yield* serverVersion
                if (version < required)
                  return yield* Effect.fail(new SyncBlocked("UnsupportedOperation", version))
              }
              const raw = yield* json("sync/push", {
                operations: operations.map((operation) =>
                  Schema.encodeSync(Operation.Operation)(operation)
                )
              })
              return yield* Schema.decodeUnknownEffect(Sync.PushResponse)(raw).pipe(
                Effect.mapError(offline)
              )
            }),
          pull: (since) =>
            Effect.gen(function* () {
              const raw = yield* json(`sync/pull?since=${since}`)
              if (
                typeof raw === "object" &&
                raw !== null &&
                "operations" in raw &&
                Array.isArray(raw.operations) &&
                Protocol.unknownOperations(raw.operations).length
              )
                return yield* Effect.fail(new SyncBlocked("UpdateRequired", Protocol.version + 1))
              return yield* Schema.decodeUnknownEffect(Sync.PullResponse)(raw).pipe(
                Effect.mapError(offline)
              )
            }),
          catalogue: (since) =>
            client.library.changes({ query: { since } }).pipe(Effect.mapError(offline)),
          chapters: (id) =>
            client.library.chapters({ params: { id } }).pipe(Effect.mapError(offline))
        })
      })
    ).pipe(Layer.provide(FetchHttpClient.layer))
}
