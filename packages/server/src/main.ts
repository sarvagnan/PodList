import { mkdirSync } from "node:fs"
import { createServer } from "node:http"
import { dirname, join } from "node:path"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Option } from "effect"
import { FetchHttpClient, HttpRouter } from "effect/http"
import { ArtworkRoute } from "./Artwork.ts"
import * as Backup from "./Backup.ts"
import { Catalogue } from "./Catalogue.ts"
import { Chapters } from "./Chapters.ts"
import { ServerConfig } from "./Config.ts"
import * as Database from "./Database.ts"
import { Directory } from "./Directory.ts"
import { ApiRoutes } from "./Http.ts"
import { Library } from "./Library.ts"
import { AudioRoute } from "./Media.ts"
import { Poller } from "./Poller.ts"
import { Subscriptions } from "./Subscriptions.ts"
import { SyncStore } from "./SyncStore.ts"
import * as WebApp from "./WebApp.ts"

const Main = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ServerConfig
    mkdirSync(dirname(config.databasePath), { recursive: true })
    yield* Effect.log(`PodList server on :${config.port}, database ${config.databasePath}`)
    const Services = Layer.mergeAll(
      SyncStore.layer,
      Poller.layer,
      Subscriptions.layer,
      Catalogue.layer,
      Directory.layer,
      Chapters.layer
    ).pipe(
      Layer.provideMerge(Library.layer),
      Layer.provide(FetchHttpClient.layer),
      Layer.provideMerge(Database.layer(config.databasePath))
    )
    const artworkDir = Option.getOrElse(config.artworkDir, () =>
      join(dirname(config.databasePath), "artwork")
    )
    const Routes = Layer.mergeAll(ApiRoutes, AudioRoute, ArtworkRoute(artworkDir))
    return Layer.mergeAll(
      HttpRouter.serve(
        Option.match(config.webRoot, {
          onNone: () => Routes,
          onSome: (root) => Layer.mergeAll(Routes, WebApp.route(root))
        })
      ),
      Poller.background,
      Backup.background
    ).pipe(
      Layer.provide(NodeHttpServer.layer(createServer, { port: config.port })),
      Layer.provide(Services)
    )
  })
)

Layer.launch(Main).pipe(NodeRuntime.runMain)
