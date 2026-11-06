import { PodListApi, Sync, System } from "@podlist/api"
import { Protocol } from "@podlist/domain"
import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/http-api"
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

export const ApiRoutes = HttpApiBuilder.layer(PodListApi, {
  openapiPath: "/api/openapi.json"
}).pipe(Layer.provide([SystemHandlers, SyncHandlers]))
