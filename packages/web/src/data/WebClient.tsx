import { Effect, Layer, SubscriptionRef } from "effect"
import type { ReactNode } from "react"
import { type DownloadStatus, Downloads } from "../downloads/DownloadService.ts"
import { serverDataLayer } from "./ServerDataLayer.ts"

export { webPlayerLayer as playerLayer } from "./WebPlayer.ts"
export const localClient = false
export const clientLayer = (
  options: Parameters<typeof serverDataLayer>[0] & { readonly audioUrl: (id: string) => string }
) =>
  serverDataLayer(options).pipe(
    Layer.merge(
      Layer.effect(
        Downloads,
        Effect.gen(function* () {
          return Downloads.of({
            status: yield* SubscriptionRef.make<ReadonlyMap<string, DownloadStatus>>(new Map()),
            download: () => Effect.void,
            cancel: () => Effect.void,
            remove: () => Effect.void,
            playableUrl: () => Effect.succeed(null)
          })
        })
      )
    )
  )
export const ClientGate = ({ children }: { readonly children: ReactNode }) => <>{children}</>
