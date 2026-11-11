import { Context, Data, type Effect, type SubscriptionRef } from "effect"

export type DownloadStatus = Data.TaggedEnum<{
  Downloading: { readonly received: number; readonly total: number | null }
  Stored: { readonly bytes: number; readonly manual: boolean }
  Failed: { readonly message: string }
}>
export const DownloadStatus = Data.taggedEnum<DownloadStatus>()

export class Downloads extends Context.Service<
  Downloads,
  {
    /** Every Episode with a download on this Device, or one in progress or failed. */
    readonly status: SubscriptionRef.SubscriptionRef<ReadonlyMap<string, DownloadStatus>>
    /**
     * Starts a download in the background; does nothing if stored or under way. A Manual
     * Download unless `rule` says a Download Rule asked for it (so the rule may let it go).
     */
    readonly download: (
      episodeId: string,
      options?: { readonly rule?: boolean }
    ) => Effect.Effect<void>
    /** Stops a download in progress and forgets a failed one. */
    readonly cancel: (episodeId: string) => Effect.Effect<void>
    /** Deletes a stored download. */
    readonly remove: (episodeId: string) => Effect.Effect<void>
    /** A URL to play the stored file, or null when it isn't stored here. */
    readonly playableUrl: (episodeId: string) => Effect.Effect<string | null>
  }
>()("@podlist/web/Downloads") {}
