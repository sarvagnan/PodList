import { Library as Domain } from "@podlist/domain"
import { type ChapterData, fromId3, id3ProbeBytes } from "@podlist/feeds/id3"
import { Context, Data, Duration, Effect, Layer, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { SqlClient } from "effect/sql"

// Chapters (Q35) are resolved when an Episode is first opened or played rather than for
// a whole Back Catalogue at once. Podcasting 2.0 JSON chapters are preferred; otherwise
// ID3 CHAP frames are read from the start of the MP3. The result is stored on the
// Episode, so clients receive it through catalogue sync.

export { type ChapterData, fromId3, id3ProbeBytes } from "@podlist/feeds/id3"

export class EpisodeNotFound extends Data.TaggedError("EpisodeNotFound")<{ readonly id: string }> {}

const timeout = Duration.seconds(15)

const JsonChapters = Schema.Struct({
  chapters: Schema.Array(
    Schema.Struct({
      startTime: Schema.Finite,
      title: Schema.optionalKey(Schema.String),
      img: Schema.optionalKey(Schema.String),
      url: Schema.optionalKey(Schema.String),
      toc: Schema.optionalKey(Schema.Boolean)
    })
  )
})

/** Podcasting 2.0 JSON chapters, without the entries marked as hidden (`toc: false`). */
export const fromJsonChapters = (json: typeof JsonChapters.Type): ReadonlyArray<ChapterData> =>
  json.chapters
    .filter((c) => c.toc !== false)
    .map((c) => ({
      start: Math.max(0, c.startTime),
      title: c.title ?? "",
      artworkUrl: c.img ?? null,
      url: c.url ?? null
    }))
    .sort((a, b) => a.start - b.start)

const toDomain = (chapters: ReadonlyArray<ChapterData>) =>
  chapters.map((c) =>
    Schema.decodeUnknownSync(Domain.Chapter)({
      start: c.start,
      title: c.title,
      artwork: c.artworkUrl === null ? null : { url: c.artworkUrl },
      url: c.url
    })
  )

export class Chapters extends Context.Service<
  Chapters,
  {
    /** The Episode's Chapters, fetched and stored on first request. */
    readonly forEpisode: (
      episodeId: string
    ) => Effect.Effect<ReadonlyArray<Domain.Chapter>, EpisodeNotFound>
  }
>()("@podlist/server/Chapters") {
  static readonly layer = Layer.effect(
    Chapters,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const http = yield* HttpClient.HttpClient

      const fetchJson = (url: string) =>
        http
          .execute(HttpClientRequest.get(url))
          .pipe(
            Effect.flatMap(HttpClientResponse.filterStatusOk),
            Effect.flatMap(HttpClientResponse.schemaBodyJson(JsonChapters)),
            Effect.map(fromJsonChapters),
            Effect.timeout(timeout)
          )

      const fetchId3 = (audioUrl: string) =>
        http
          .execute(
            HttpClientRequest.get(audioUrl).pipe(
              HttpClientRequest.setHeader("range", `bytes=0-${id3ProbeBytes - 1}`)
            )
          )
          .pipe(
            Effect.flatMap(HttpClientResponse.filterStatusOk),
            Effect.flatMap((r) => r.arrayBuffer),
            Effect.map((buffer) => fromId3(new Uint8Array(buffer).subarray(0, id3ProbeBytes))),
            Effect.timeout(timeout)
          )

      const forEpisode = (episodeId: string) =>
        Effect.gen(function* () {
          const [row] = yield* sql<{
            audio_url: string
            chapters: string
            chapters_url: string | null
            chapters_fetched_at: number | null
          }>`SELECT audio_url, chapters, chapters_url, chapters_fetched_at FROM episode WHERE id = ${episodeId}`.pipe(
            Effect.orDie
          )
          if (row === undefined) return yield* new EpisodeNotFound({ id: episodeId })
          if (row.chapters_fetched_at !== null) {
            return Schema.decodeUnknownSync(Schema.Array(Domain.Chapter))(JSON.parse(row.chapters))
          }
          const fromJson =
            row.chapters_url === null
              ? Effect.succeed<ReadonlyArray<ChapterData>>([])
              : fetchJson(row.chapters_url).pipe(Effect.orElseSucceed(() => []))
          const found = yield* fromJson.pipe(
            Effect.flatMap((chapters) =>
              chapters.length > 0
                ? Effect.succeed(chapters)
                : fetchId3(row.audio_url).pipe(Effect.orElseSucceed(() => []))
            )
          )
          const chapters = toDomain(found)
          yield* sql`UPDATE episode SET
              chapters = ${JSON.stringify(Schema.encodeSync(Schema.Array(Domain.Chapter))(chapters))},
              chapters_fetched_at = ${Date.now()}
            WHERE id = ${episodeId}`.pipe(Effect.orDie)
          return chapters
        })

      return Chapters.of({ forEpisode })
    })
  )
}
