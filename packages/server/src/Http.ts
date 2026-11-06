import { PodListApi, System } from "@podlist/api"
import { Protocol } from "@podlist/domain"
import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/http-api"

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

export const ApiRoutes = HttpApiBuilder.layer(PodListApi, {
  openapiPath: "/api/openapi.json"
}).pipe(Layer.provide([SystemHandlers]))
