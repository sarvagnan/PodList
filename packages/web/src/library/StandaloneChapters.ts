import { Library } from "@podlist/domain"
import { Effect, Schema, Semaphore } from "effect"
import { SqlClient } from "effect/sql"
import { Offline } from "../sync/Transport.ts"
import { desktopPublisher } from "./DesktopPublisher.ts"

const decode = Schema.decodeUnknownSync(Schema.Array(Library.Chapter))

export const makeStandaloneChapters = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  const requests = yield* Semaphore.make(1)
  return (id: string) =>
    Effect.gen(function* () {
      const [row] = yield* sql<{
        chapters: string
        chapters_url: string | null
        chapters_fetched_at: number | null
      }>`SELECT chapters, chapters_url, chapters_fetched_at FROM episode WHERE id = ${id}`
      if (!row) return []
      if (row.chapters_fetched_at !== null || !row.chapters_url)
        return yield* Effect.try(() => decode(JSON.parse(row.chapters)))
      const url = row.chapters_url
      const chapters = yield* Effect.tryPromise(async (signal) =>
        decode(await desktopPublisher.chapters(url, signal))
      )
      // A refresh can replace the source while its old Chapters are in flight.
      const saved = yield* sql<{ id: string }>`UPDATE episode SET
        chapters = ${JSON.stringify(chapters)},
        chapters_fetched_at = ${Date.now()}
        WHERE id = ${id} AND chapters_url = ${url} RETURNING id`
      return saved.length ? chapters : []
    }).pipe(
      requests.withPermits(1),
      Effect.mapError(() => new Offline("Could not read Chapters. Try again."))
    )
})
