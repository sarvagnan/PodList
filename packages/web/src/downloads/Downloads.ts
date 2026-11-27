import { Clock, Effect, Fiber, Layer, Semaphore, SubscriptionRef } from "effect"
import { SqlClient } from "effect/sql"
import { DownloadError, DownloadStore } from "../platform/DownloadStore.ts"
import { keepStorage } from "../platform/persistentStorage.ts"
import { DownloadStatus, Downloads } from "./DownloadService.ts"

export { DownloadStatus, Downloads } from "./DownloadService.ts"

export const downloadsLayer = (options: {
  readonly audioUrl: (episodeId: string) => string
  readonly publisherOnly?: boolean
}) =>
  Layer.effect(
    Downloads,
    Effect.gen(function* () {
      const store = yield* DownloadStore
      const sql = yield* SqlClient.SqlClient
      const scope = yield* Effect.scope

      // What the database says, checked against the files that are really there.
      const requests = yield* sql<{ episode_id: string; manual: number; failure: string | null }>`
        SELECT episode_id, manual, failure FROM download_request ORDER BY rowid`.pipe(Effect.orDie)
      const forgetRequest = (episodeId: string) =>
        sql`DELETE FROM download_request WHERE episode_id = ${episodeId}`.pipe(Effect.orDie)
      const rememberStored = (episodeId: string, bytes: number, manual: boolean) =>
        Effect.gen(function* () {
          const at = yield* Clock.currentTimeMillis
          yield* sql`INSERT OR REPLACE INTO download ${sql.insert({
            episode_id: episodeId,
            manual: manual ? 1 : 0,
            bytes,
            saved_at: at
          })}`
          yield* forgetRequest(episodeId)
        }).pipe(sql.withTransaction)
      const rows = yield* sql<{ episode_id: string; manual: number; bytes: number }>`
          SELECT episode_id, manual, bytes FROM download`.pipe(Effect.orDie)
      const files = new Map((yield* store.list).map((file) => [file.episodeId, file.bytes]))
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
      const resume: (typeof requests)[number][] = []
      for (const request of requests) {
        const id = request.episode_id
        const bytes = files.get(id)
        if (initial.has(id)) yield* forgetRequest(id)
        else if (bytes !== undefined) {
          // The app can quit after OPFS publishes the file but before SQLite commits it.
          yield* rememberStored(id, bytes, request.manual === 1).pipe(Effect.orDie)
          initial.set(id, DownloadStatus.Stored({ bytes, manual: request.manual === 1 }))
        } else if (request.failure !== null) {
          initial.set(id, DownloadStatus.Failed({ message: request.failure }))
        } else resume.push(request)
      }
      const status = yield* SubscriptionRef.make<ReadonlyMap<string, DownloadStatus>>(initial)
      const running = new Map<string, Fiber.Fiber<void>>()
      const transfers = yield* Semaphore.make(1)

      const set = (episodeId: string, next: DownloadStatus | null) =>
        SubscriptionRef.update(status, (current) => {
          const copy = new Map(current)
          if (next === null) copy.delete(episodeId)
          else copy.set(episodeId, next)
          return copy
        })

      const fail = (episodeId: string, message: string) =>
        sql`UPDATE download_request SET failure = ${message} WHERE episode_id = ${episodeId}`.pipe(
          Effect.orDie,
          Effect.andThen(set(episodeId, DownloadStatus.Failed({ message })))
        )
      const download = (episodeId: string, how?: { readonly rule?: boolean }) =>
        Effect.gen(function* () {
          const manual = how?.rule !== true
          const current = (yield* SubscriptionRef.get(status)).get(episodeId)
          if (current?._tag === "Stored" || current?._tag === "Downloading") return
          yield* sql`INSERT INTO download_request (episode_id, manual, failure)
            VALUES (${episodeId}, ${manual ? 1 : 0}, NULL)
            ON CONFLICT(episode_id) DO UPDATE SET manual = excluded.manual, failure = NULL`.pipe(
            Effect.orDie
          )
          yield* set(episodeId, DownloadStatus.Downloading({ received: 0, total: null }))
          // Downloads are worth keeping: ask the browser not to evict them.
          yield* Effect.promise(() => keepStorage()).pipe(Effect.ignore, Effect.forkIn(scope))
          // Progress at most every 250 ms, so a fast download doesn't flood the screen.
          let lastShown = 0
          const progress = (received: number, total: number | null) => {
            const at = Date.now()
            if (at - lastShown < 250) return
            lastShown = at
            Effect.runFork(
              SubscriptionRef.update(status, (current) => {
                if (current.get(episodeId)?._tag !== "Downloading") return current
                const next = new Map(current)
                next.set(episodeId, DownloadStatus.Downloading({ received, total }))
                return next
              })
            )
          }
          const [episode] = yield* sql<{
            audio_url: string
          }>`SELECT audio_url FROM episode WHERE id = ${episodeId}`.pipe(Effect.orDie)
          const fallback = options.publisherOnly ? undefined : options.audioUrl(episodeId)
          const host = episode?.audio_url ?? fallback
          if (!host) {
            yield* fail(episodeId, "The Episode has no audio address.")
            return
          }
          const transfer = store
            .save(episodeId, host, progress)
            .pipe(
              Effect.catch((error) =>
                !fallback || host === fallback
                  ? Effect.fail(error)
                  : store.save(episodeId, fallback, progress)
              )
            )
          const fiber = yield* transfer.pipe(
            Effect.flatMap((saved) =>
              Effect.gen(function* () {
                yield* rememberStored(episodeId, saved.bytes, manual).pipe(Effect.orDie)
                yield* set(episodeId, DownloadStatus.Stored({ bytes: saved.bytes, manual }))
              })
            ),
            Effect.catch((error) => fail(episodeId, error.message)),
            Effect.onInterrupt(() => set(episodeId, null)),
            Effect.ensuring(Effect.sync(() => running.delete(episodeId))),
            Effect.forkIn(scope)
          )
          running.set(episodeId, fiber)
        }).pipe(transfers.withPermits(1))

      const importStored = (episodeId: string, sourceUrl: string, expectedBytes: number) =>
        Effect.gen(function* () {
          const inProgress = running.get(episodeId)
          if (inProgress) yield* Fiber.await(inProgress)
          const latest = (yield* SubscriptionRef.get(status)).get(episodeId)
          const saved =
            latest?._tag === "Stored"
              ? { bytes: latest.bytes }
              : yield* store.save(episodeId, sourceUrl)
          if (latest?._tag !== "Stored" && saved.bytes !== expectedBytes) {
            yield* store.remove(episodeId)
            return yield* new DownloadError({
              episodeId,
              message: "The download could not be copied in full. Try again."
            })
          }
          yield* rememberStored(episodeId, saved.bytes, true).pipe(
            Effect.mapError(
              () =>
                new DownloadError({ episodeId, message: "Could not save the download. Try again." })
            )
          )
          yield* set(episodeId, DownloadStatus.Stored({ bytes: saved.bytes, manual: true }))
        }).pipe(transfers.withPermits(1))

      const cancelRequest = (episodeId: string) =>
        Effect.gen(function* () {
          const fiber = running.get(episodeId)
          if (fiber !== undefined) yield* Fiber.interrupt(fiber)
          const current = (yield* SubscriptionRef.get(status)).get(episodeId)
          if (current?._tag === "Stored") return
          yield* forgetRequest(episodeId)
          if (fiber !== undefined) yield* store.remove(episodeId)
          yield* set(episodeId, null)
        })
      const cancel = (episodeId: string) => cancelRequest(episodeId).pipe(transfers.withPermits(1))

      const remove = (episodeId: string) =>
        Effect.gen(function* () {
          yield* cancelRequest(episodeId)
          yield* store.remove(episodeId)
          yield* sql`DELETE FROM download WHERE episode_id = ${episodeId}`.pipe(Effect.orDie)
          yield* set(episodeId, null)
        }).pipe(transfers.withPermits(1))

      for (const request of resume)
        yield* download(request.episode_id, { rule: request.manual !== 1 })

      return Downloads.of({
        status,
        download,
        cancel,
        remove,
        importStored,
        playableUrl: store.playableUrl
      })
    })
  )
