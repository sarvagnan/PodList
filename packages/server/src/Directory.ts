import { createHash } from "node:crypto"
import { Config, Context, Duration, Effect, Layer, Option, Redacted, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"

// Finding podcasts to subscribe to (Q38): Podcast Index when the server has an API key,
// iTunes Search otherwise or when Podcast Index fails. Results share one shape.

export interface DirectoryResult {
  readonly title: string
  readonly author: string | null
  readonly feedUrl: string
  readonly artworkUrl: string | null
  readonly source: "podcastindex" | "itunes"
}

export const DirectoryConfig = Config.all({
  podcastIndexKey: Config.option(Config.String("PODCASTINDEX_KEY")),
  podcastIndexSecret: Config.option(Config.Redacted("PODCASTINDEX_SECRET"))
})

const userAgent = "PodList/0.1 (self-hosted podcast client)"
const timeout = Duration.seconds(10)

const PodcastIndexResponse = Schema.Struct({
  feeds: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      author: Schema.optionalKey(Schema.NullOr(Schema.String)),
      url: Schema.String,
      artwork: Schema.optionalKey(Schema.NullOr(Schema.String)),
      image: Schema.optionalKey(Schema.NullOr(Schema.String))
    })
  )
})

const ITunesResponse = Schema.Struct({
  results: Schema.Array(
    Schema.Struct({
      collectionName: Schema.optionalKey(Schema.String),
      artistName: Schema.optionalKey(Schema.String),
      feedUrl: Schema.optionalKey(Schema.String),
      artworkUrl600: Schema.optionalKey(Schema.String),
      artworkUrl100: Schema.optionalKey(Schema.String)
    })
  )
})

const nonEmpty = (s: string | null | undefined) =>
  s === undefined || s === null || s === "" ? null : s

export class Directory extends Context.Service<
  Directory,
  { readonly search: (query: string) => Effect.Effect<ReadonlyArray<DirectoryResult>> }
>()("@podlist/server/Directory") {
  static readonly layer = Layer.effect(
    Directory,
    Effect.gen(function* () {
      const http = yield* HttpClient.HttpClient
      const config = yield* DirectoryConfig

      const getJson = <S extends Schema.Top>(
        request: HttpClientRequest.HttpClientRequest,
        schema: S
      ) =>
        http
          .execute(HttpClientRequest.setHeader(request, "user-agent", userAgent))
          .pipe(
            Effect.flatMap(HttpClientResponse.filterStatusOk),
            Effect.flatMap(HttpClientResponse.schemaBodyJson(schema as never)),
            Effect.timeout(timeout)
          ) as Effect.Effect<S["Type"], unknown>

      const podcastIndex = (key: string, secret: Redacted.Redacted<string>, query: string) => {
        const date = String(Math.floor(Date.now() / 1000))
        const authorization = createHash("sha1")
          .update(key + Redacted.value(secret) + date)
          .digest("hex")
        const request = HttpClientRequest.get(
          "https://api.podcastindex.org/api/1.0/search/byterm",
          {
            urlParams: { q: query, max: "30" }
          }
        ).pipe(
          HttpClientRequest.setHeaders({
            "x-auth-key": key,
            "x-auth-date": date,
            authorization
          })
        )
        return getJson(request, PodcastIndexResponse).pipe(
          Effect.map((body) =>
            body.feeds.map(
              (f): DirectoryResult => ({
                title: f.title,
                author: nonEmpty(f.author),
                feedUrl: f.url,
                artworkUrl: nonEmpty(f.artwork) ?? nonEmpty(f.image),
                source: "podcastindex"
              })
            )
          )
        )
      }

      const itunes = (query: string) =>
        getJson(
          HttpClientRequest.get("https://itunes.apple.com/search", {
            urlParams: { media: "podcast", entity: "podcast", limit: "30", term: query }
          }),
          ITunesResponse
        ).pipe(
          Effect.map((body) =>
            body.results.flatMap(
              (r): Array<DirectoryResult> =>
                r.feedUrl === undefined
                  ? []
                  : [
                      {
                        title: r.collectionName ?? r.feedUrl,
                        author: nonEmpty(r.artistName),
                        feedUrl: r.feedUrl,
                        artworkUrl: nonEmpty(r.artworkUrl600) ?? nonEmpty(r.artworkUrl100),
                        source: "itunes"
                      }
                    ]
            )
          )
        )

      const search = (query: string) => {
        const fallback = itunes(query).pipe(Effect.orElseSucceed(() => []))
        if (Option.isSome(config.podcastIndexKey) && Option.isSome(config.podcastIndexSecret)) {
          return podcastIndex(
            config.podcastIndexKey.value,
            config.podcastIndexSecret.value,
            query
          ).pipe(Effect.catch(() => fallback))
        }
        return fallback
      }

      return Directory.of({ search })
    })
  )
}
