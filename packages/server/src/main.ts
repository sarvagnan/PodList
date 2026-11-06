import { mkdirSync } from "node:fs"
import { createServer } from "node:http"
import { dirname } from "node:path"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/http"
import { Catalogue } from "./Catalogue.ts"
import { ServerConfig } from "./Config.ts"
import * as Database from "./Database.ts"
import { ApiRoutes } from "./Http.ts"
import { Library } from "./Library.ts"
import { Poller } from "./Poller.ts"
import { Subscriptions } from "./Subscriptions.ts"
import { SyncStore } from "./SyncStore.ts"

const Main = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ServerConfig
    mkdirSync(dirname(config.databasePath), { recursive: true })
    yield* Effect.log(`PodList server on :${config.port}, database ${config.databasePath}`)
    const Services = Layer.mergeAll(
      SyncStore.layer,
      Poller.layer,
      Subscriptions.layer,
      Catalogue.layer
    ).pipe(
      Layer.provideMerge(Library.layer),
      Layer.provide(FetchHttpClient.layer),
      Layer.provideMerge(Database.layer(config.databasePath))
    )
    return Layer.mergeAll(HttpRouter.serve(ApiRoutes), Poller.background).pipe(
      Layer.provide(NodeHttpServer.layer(createServer, { port: config.port })),
      Layer.provide(Services)
    )
  })
)

Layer.launch(Main).pipe(NodeRuntime.runMain)
