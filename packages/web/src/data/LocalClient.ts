import type { PlaybackSettings } from "@podlist/domain"
import { Effect, Layer } from "effect"
import { DownloadRulesLive } from "../downloads/DownloadRules.ts"
import { downloadsLayer } from "../downloads/Downloads.ts"
import { desktopStandalone } from "../lib/desktopSession.ts"
import { makeBringOverClient } from "../library/BringOverClient.ts"
import { LibraryClient } from "../library/LibraryClient.ts"
import { standaloneLibraryLayer } from "../library/StandaloneClient.ts"
import { DownloadStore } from "../platform/DownloadStore.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { localWorkLayer } from "../platform/LocalWorkLive.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { LocalDataLayer } from "./LocalDataLayer.ts"

const connectedLibrary = (origin: string) =>
  Layer.effect(
    LibraryClient,
    Effect.gen(function* () {
      const library = yield* LibraryClient
      const bringOver = yield* makeBringOverClient(library.subscribe)
      return LibraryClient.of({ ...library, bringOver })
    })
  ).pipe(Layer.provide(LibraryClient.layerHttp(origin)))

/** The local client composition. Electron keeps this when web switches adapters. */
export const localClientLayer = (options: {
  readonly defaults: PlaybackSettings.PlaybackSettings
  readonly deviceName: string
  readonly origin: string
  readonly audioUrl: (id: string) => string
}) =>
  Layer.mergeAll(
    LocalDataLayer,
    DownloadRulesLive,
    desktopStandalone ? standaloneLibraryLayer : connectedLibrary(options.origin)
  ).pipe(
    Layer.provideMerge(
      downloadsLayer({ audioUrl: options.audioUrl, publisherOnly: desktopStandalone })
    ),
    Layer.provide(
      SyncEngine.layer({
        ...options,
        standalone: desktopStandalone,
        deviceKind: import.meta.env.MODE === "desktop" ? "desktop" : "pwa"
      })
    ),
    Layer.provide(LocalDb.layerWeb("podlist.db", desktopStandalone)),
    Layer.provide(DownloadStore.layerWeb),
    Layer.provideMerge(localWorkLayer)
  )
