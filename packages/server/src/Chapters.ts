import { Library as Domain } from "@podlist/domain"
import { Context, Data, Duration, Effect, Layer, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { SqlClient } from "effect/sql"

// Chapters (Q35) are resolved when an Episode is first opened or played rather than for
// a whole Back Catalogue at once. Podcasting 2.0 JSON chapters are preferred; otherwise
// ID3 CHAP frames are read from the start of the MP3. The result is stored on the
// Episode, so clients receive it through catalogue sync.

export class EpisodeNotFound extends Data.TaggedError("EpisodeNotFound")<{ readonly id: string }> {}

export interface ChapterData {
  readonly start: number
  readonly title: string
  readonly artworkUrl: string | null
  readonly url: string | null
}

/** Bytes read from the start of an MP3 when looking for ID3 chapters. */
export const id3ProbeBytes = 512 * 1024
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

const syncsafe = (b: Uint8Array, at: number) =>
  ((b[at] ?? 0) << 21) | ((b[at + 1] ?? 0) << 14) | ((b[at + 2] ?? 0) << 7) | (b[at + 3] ?? 0)
const uint32 = (b: Uint8Array, at: number) =>
  (((b[at] ?? 0) << 24) | ((b[at + 1] ?? 0) << 16) | ((b[at + 2] ?? 0) << 8) | (b[at + 3] ?? 0)) >>>
  0
const ascii = (b: Uint8Array, at: number, length: number) =>
  String.fromCharCode(...b.subarray(at, at + length))

/** Decodes an ID3 text frame body: one encoding byte, then the text. */
const decodeText = (body: Uint8Array): string => {
  const encoding = body[0]
  const bytes = body.subarray(1)
  const label =
    encoding === 1 ? "utf-16" : encoding === 2 ? "utf-16be" : encoding === 3 ? "utf-8" : "latin1"
  return new TextDecoder(label).decode(bytes).split("\u0000")[0] ?? ""
}

/** Chapters from the ID3v2.3/2.4 CHAP frames in the first bytes of an MP3; [] if none. */
export const fromId3 = (bytes: Uint8Array): ReadonlyArray<ChapterData> => {
  if (ascii(bytes, 0, 3) !== "ID3") return []
  const version = bytes[3] ?? 0
  const end = Math.min(bytes.length, 10 + syncsafe(bytes, 6))
  const frameSize = (at: number) => (version >= 4 ? syncsafe(bytes, at) : uint32(bytes, at))
  const chapters: Array<ChapterData> = []
  let at = 10
  while (at + 10 <= end) {
    const id = ascii(bytes, at, 4)
    const size = frameSize(at + 4)
    if (!/^[A-Z0-9]{4}$/.test(id) || size <= 0) break
    const body = bytes.subarray(at + 10, at + 10 + size)
    if (id === "CHAP") {
      const idEnd = body.indexOf(0)
      const start = uint32(body, idEnd + 1) / 1000
      let title = ""
      let sub = idEnd + 17
      while (sub + 10 <= body.length) {
        const subId = ascii(body, sub, 4)
        const subSize = version >= 4 ? syncsafe(body, sub + 4) : uint32(body, sub + 4)
        if (subSize <= 0) break
        if (subId === "TIT2") title = decodeText(body.subarray(sub + 10, sub + 10 + subSize))
        sub += 10 + subSize
      }
      chapters.push({ start, title, artworkUrl: null, url: null })
    }
    at += 10 + size
  }
  return chapters.sort((a, b) => a.start - b.start)
}

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
