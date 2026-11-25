import { Library } from "@podlist/domain"
import { Effect, Schema, Semaphore } from "effect"
import { SqlClient } from "effect/sql"
import { Offline } from "../sync/Transport.ts"
import { desktopPublisher } from "./DesktopPublisher.ts"
import { resolveLocalChapters } from "./DownloadedChapters.ts"

const decode = Schema.decodeUnknownSync(Schema.Array(Library.Chapter))

export const makeStandaloneChapters = (
  readPrefix: (id: string, bytes: number) => Effect.Effect<Uint8Array | null>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const requests = yield* Semaphore.make(1)
    return (id: string) =>
      Effect.gen(function* () {
        const [row] = yield* sql<{
          chapters: string
          chapters_url: string | null
          chapters_fetched_at: number | null
          audio_url: string
        }>`SELECT chapters, chapters_url, chapters_fetched_at, audio_url FROM episode WHERE id = ${id}`
        if (!row) return []
        const cached = yield* Effect.try(() => decode(JSON.parse(row.chapters))).pipe(
          Effect.orElseSucceed(() => [])
        )
        if (row.chapters_fetched_at !== null && cached.length) return cached
        const chaptersUrl = row.chapters_url
        let failed = false
        let probedAudio = false
        const publisher = (read: (signal: AbortSignal) => Promise<unknown>) =>
          Effect.tryPromise(async (signal) => decode(await read(signal))).pipe(
            Effect.tapError(() =>
              Effect.sync(() => {
                failed = true
              })
            )
          )
        const chapters = yield* resolveLocalChapters({
          cached,
          preferDownload: chaptersUrl === null,
          readPrefix: (bytes) => readPrefix(id, bytes),
          remote:
            chaptersUrl && row.chapters_fetched_at === null
              ? publisher((signal) => desktopPublisher.chapters(chaptersUrl, signal))
              : Effect.succeed([]),
          ...(row.chapters_fetched_at !== null
            ? {}
            : {
                audioFallback: publisher((signal) => {
                  probedAudio = true
                  return desktopPublisher.audioChapters(row.audio_url, signal)
                })
              })
        })
        // A network failure stays retryable. Do not cache a download's empty probe as an
        // online result. A refresh can replace either source while a read is in flight.
        if (failed || (!chapters.length && !probedAudio)) return chapters
        const saved = yield* sql<{ id: string }>`UPDATE episode SET
          chapters = ${JSON.stringify(chapters)}, chapters_fetched_at = ${Date.now()}
          WHERE id = ${id} AND chapters_url IS ${chaptersUrl} AND audio_url = ${row.audio_url}
          RETURNING id`
        return saved.length ? chapters : []
      }).pipe(
        requests.withPermits(1),
        Effect.mapError(() => new Offline("Could not read Chapters. Try again."))
      )
  })
