import { mkdirSync } from "node:fs"
import { createServer } from "node:http"
import { dirname } from "node:path"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { HttpRouter } from "effect/http"
import { ServerConfig } from "./Config.ts"
import * as Database from "./Database.ts"
import { ApiRoutes } from "./Http.ts"
import { SyncStore } from "./SyncStore.ts"

const Main = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ServerConfig
    mkdirSync(dirname(config.databasePath), { recursive: true })
    yield* Effect.log(`PodList server on :${config.port}, database ${config.databasePath}`)
    return HttpRouter.serve(ApiRoutes).pipe(
      Layer.provide(NodeHttpServer.layer(createServer, { port: config.port })),
      Layer.provide(SyncStore.layer),
      Layer.provide(Database.layer(config.databasePath))
    )
  })
)

Layer.launch(Main).pipe(NodeRuntime.runMain)
