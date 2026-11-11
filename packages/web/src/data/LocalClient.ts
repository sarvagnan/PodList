import type { PlaybackSettings } from "@podlist/domain"
import { Layer } from "effect"
import { DownloadRulesLive } from "../downloads/DownloadRules.ts"
import { Downloads } from "../downloads/Downloads.ts"
import { DownloadStore } from "../platform/DownloadStore.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { LocalDataLayer } from "./LocalDataLayer.ts"

/** The local client composition. Electron keeps this when web switches adapters. */
export const localClientLayer = (options: {
  readonly defaults: PlaybackSettings.PlaybackSettings
  readonly deviceName: string
  readonly audioUrl: (id: string) => string
}) =>
  Layer.merge(LocalDataLayer, DownloadRulesLive).pipe(
    Layer.provideMerge(Downloads.layer({ audioUrl: options.audioUrl })),
    Layer.provide(SyncEngine.layer(options)),
    Layer.provide(LocalDb.layerWeb()),
    Layer.provide(DownloadStore.layerWeb)
  )
