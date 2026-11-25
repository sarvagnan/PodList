import type { PlaybackSettings } from "@podlist/domain"
import { Layer } from "effect"
import { DownloadRulesLive } from "../downloads/DownloadRules.ts"
import { downloadsLayer } from "../downloads/Downloads.ts"
import { desktopStandalone } from "../lib/desktopSession.ts"
import { LibraryClient } from "../library/LibraryClient.ts"
import { standaloneLibraryLayer } from "../library/StandaloneClient.ts"
import { DownloadStore } from "../platform/DownloadStore.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { LocalDataLayer } from "./LocalDataLayer.ts"

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
    desktopStandalone ? standaloneLibraryLayer : LibraryClient.layerHttp(options.origin)
  ).pipe(
    Layer.provideMerge(downloadsLayer({ audioUrl: options.audioUrl })),
    Layer.provide(
      SyncEngine.layer({
        ...options,
        standalone: desktopStandalone,
        deviceKind: import.meta.env.MODE === "desktop" ? "desktop" : "pwa"
      })
    ),
    Layer.provide(LocalDb.layerWeb("podlist.db", desktopStandalone)),
    Layer.provide(DownloadStore.layerWeb)
  )
