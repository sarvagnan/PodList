import { Library } from "@podlist/domain"
import { fromId3, id3ProbeBytes } from "@podlist/feeds/id3"
import { Effect, Schema } from "effect"

const decode = Schema.decodeUnknownSync(Library.Chapter)

export function resolveLocalChapters<E>(options: {
  readonly cached: ReadonlyArray<Library.Chapter>
  readonly preferDownload: boolean
  readonly readPrefix: (bytes: number) => Effect.Effect<Uint8Array | null>
  readonly audioFallback?: Effect.Effect<ReadonlyArray<Library.Chapter>, E>
  readonly remote: Effect.Effect<ReadonlyArray<Library.Chapter>, E>
}) {
  return Effect.gen(function* () {
    if (options.cached.length) return options.cached
    const downloaded = Effect.map(options.readPrefix(id3ProbeBytes), (bytes) =>
      bytes === null
        ? []
        : fromId3(bytes).map(({ start, title }) =>
            decode({ start, title, artwork: null, url: null })
          )
    )
    const remote = options.remote.pipe(Effect.orElseSucceed(() => []))
    // Prefer publisher JSON where the feed explicitly declares it. Otherwise a complete
    // local copy can answer immediately, including for a device that has gone offline.
    const [first, fallback] = options.preferDownload ? [downloaded, remote] : [remote, downloaded]
    const found = yield* first
    if (found.length) return found
    const alternative = yield* fallback
    if (alternative.length || !options.audioFallback) return alternative
    return yield* options.audioFallback.pipe(Effect.orElseSucceed(() => []))
  })
}
