import { Clock, Effect, Fiber, Layer, SubscriptionRef } from "effect"
import { SqlClient } from "effect/sql"
import { DownloadStore } from "../platform/DownloadStore.ts"
import { keepStorage } from "../platform/persistentStorage.ts"
import { DownloadStatus, Downloads } from "./DownloadService.ts"

export { DownloadStatus, Downloads } from "./DownloadService.ts"

export const downloadsLayer = (options: { readonly audioUrl: (episodeId: string) => string }) =>
  Layer.effect(
    Downloads,
    Effect.gen(function* () {
      const store = yield* DownloadStore
      const sql = yield* SqlClient.SqlClient
      const scope = yield* Effect.scope

      // What the database says, checked against the files that are really there.
      const rows = yield* sql<{ episode_id: string; manual: number; bytes: number }>`
          SELECT episode_id, manual, bytes FROM download`.pipe(Effect.orDie)
      const files = new Set((yield* store.list).map((f) => f.episodeId))
      const initial = new Map<string, DownloadStatus>()
      for (const row of rows) {
        if (files.has(row.episode_id)) {
          initial.set(
            row.episode_id,
            DownloadStatus.Stored({ bytes: row.bytes, manual: row.manual === 1 })
          )
        } else {
          yield* sql`DELETE FROM download WHERE episode_id = ${row.episode_id}`.pipe(Effect.orDie)
        }
      }
      const status = yield* SubscriptionRef.make<ReadonlyMap<string, DownloadStatus>>(initial)
      const running = new Map<string, Fiber.Fiber<void>>()

      const set = (episodeId: string, next: DownloadStatus | null) =>
        SubscriptionRef.update(status, (current) => {
          const copy = new Map(current)
          if (next === null) copy.delete(episodeId)
          else copy.set(episodeId, next)
          return copy
        })

      const download = (episodeId: string, how?: { readonly rule?: boolean }) =>
        Effect.gen(function* () {
          const manual = how?.rule !== true
          const current = (yield* SubscriptionRef.get(status)).get(episodeId)
          if (current?._tag === "Stored" || current?._tag === "Downloading") return
          yield* set(episodeId, DownloadStatus.Downloading({ received: 0, total: null }))
          // Downloads are worth keeping: ask the browser not to evict them.
          yield* Effect.promise(() => keepStorage()).pipe(Effect.ignore, Effect.forkIn(scope))
          // Progress at most every 250 ms, so a fast download doesn't flood the screen.
          let lastShown = 0
          const progress = (received: number, total: number | null) => {
            const at = Date.now()
            if (at - lastShown < 250) return
            lastShown = at
            Effect.runFork(set(episodeId, DownloadStatus.Downloading({ received, total })))
          }
          const [episode] = yield* sql<{
            audio_url: string
          }>`SELECT audio_url FROM episode WHERE id = ${episodeId}`.pipe(Effect.orDie)
          const host = episode?.audio_url ?? options.audioUrl(episodeId)
          const transfer = store
            .save(episodeId, host, progress)
            .pipe(
              Effect.catch((error) =>
                host === options.audioUrl(episodeId)
                  ? Effect.fail(error)
                  : store.save(episodeId, options.audioUrl(episodeId), progress)
              )
            )
          const fiber = yield* transfer.pipe(
            Effect.flatMap((saved) =>
              Effect.gen(function* () {
                const at = yield* Clock.currentTimeMillis
                yield* sql`INSERT OR REPLACE INTO download ${sql.insert({
                  episode_id: episodeId,
                  manual: manual ? 1 : 0,
                  bytes: saved.bytes,
                  saved_at: at
                })}`.pipe(Effect.orDie)
                yield* set(episodeId, DownloadStatus.Stored({ bytes: saved.bytes, manual }))
              })
            ),
            Effect.catch((error) =>
              set(episodeId, DownloadStatus.Failed({ message: error.message }))
            ),
            Effect.onInterrupt(() => set(episodeId, null)),
            Effect.ensuring(Effect.sync(() => running.delete(episodeId))),
            Effect.forkIn(scope)
          )
          running.set(episodeId, fiber)
        })

      const cancel = (episodeId: string) =>
        Effect.gen(function* () {
          const fiber = running.get(episodeId)
          if (fiber !== undefined) yield* Fiber.interrupt(fiber)
          const current = (yield* SubscriptionRef.get(status)).get(episodeId)
          if (current?._tag === "Failed") yield* set(episodeId, null)
        })

      const remove = (episodeId: string) =>
        Effect.gen(function* () {
          yield* cancel(episodeId)
          yield* store.remove(episodeId)
          yield* sql`DELETE FROM download WHERE episode_id = ${episodeId}`.pipe(Effect.orDie)
          yield* set(episodeId, null)
        })

      return Downloads.of({
        status,
        download,
        cancel,
        remove,
        playableUrl: store.playableUrl
      })
    })
  )
