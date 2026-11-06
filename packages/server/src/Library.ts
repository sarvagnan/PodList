import { createHash } from "node:crypto"
import { Context, Data, Duration, Effect, Layer } from "effect"
import { HttpClient, HttpClientRequest } from "effect/http"
import { SqlClient } from "effect/sql"
import { type ParsedFeed, parseFeed } from "./FeedParser.ts"

// Fetching and storing podcast feeds into the Library catalogue (the shared
// subscription and episode tables). Episodes are never deleted because a feed stopped
// listing them (Q31).

/** Server-only feed bookkeeping, tracked with the other server migrations. */
export const migrations = {
  "0002_feed_state": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE TABLE feed_state (
      subscription_id TEXT PRIMARY KEY,
      etag TEXT,
      last_modified TEXT,
      checked_at INTEGER,
      failures INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    )`
  })
} satisfies Record<string, Effect.Effect<void, unknown, SqlClient.SqlClient>>

export class FeedError extends Data.TaggedError("FeedError")<{
  readonly subscriptionId: string
  readonly message: string
}> {}

export class SubscriptionNotFound extends Data.TaggedError("SubscriptionNotFound")<{
  readonly subscriptionId: string
}> {}

export type RefreshResult =
  | { readonly _tag: "NotModified" }
  | { readonly _tag: "Updated"; readonly added: number; readonly changed: number }

/** A stable Episode id: the same feed item always maps to the same id. */
export const episodeId = (subscriptionId: string, guid: string) =>
  `ep_${createHash("sha256").update(`${subscriptionId}\n${guid}`).digest("hex").slice(0, 24)}`

export const feedTimeout = Duration.seconds(20)

/** Seconds of length difference that count as the audio having been replaced (Q34). */
export const audioChangeThreshold = 30

interface StoredEpisode {
  readonly id: string
  readonly guid: string
  readonly title: string
  readonly description: string
  readonly published: number
  readonly duration: number | null
  readonly audio_url: string
  readonly artwork_url: string | null
  readonly audio_updated_at: number | null
}

export class Library extends Context.Service<
  Library,
  {
    /** Fetches one Subscription's feed (conditionally) and stores what changed. */
    readonly refresh: (
      subscriptionId: string
    ) => Effect.Effect<RefreshResult, FeedError | SubscriptionNotFound>
    /** Stores a parsed feed for a Subscription; returns new and changed Episode counts. */
    readonly store: (
      subscriptionId: string,
      feed: ParsedFeed
    ) => Effect.Effect<{ readonly added: number; readonly changed: number }>
  }
>()("@podlist/server/Library") {
  static readonly layer = Layer.effect(
    Library,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const http = yield* HttpClient.HttpClient

      const store = (subscriptionId: string, feed: ParsedFeed) =>
        Effect.gen(function* () {
          yield* sql`UPDATE subscription SET
              title = ${feed.title},
              author = ${feed.author},
              description = ${feed.description},
              artwork_url = ${feed.artworkUrl}
            WHERE id = ${subscriptionId} AND (
              title IS NOT ${feed.title} OR author IS NOT ${feed.author} OR
              description IS NOT ${feed.description} OR artwork_url IS NOT ${feed.artworkUrl})`
          let added = 0
          let changed = 0
          const guidsInFeed = new Set(feed.episodes.map((e) => e.guid))
          for (const e of feed.episodes) {
            const [byGuid] = yield* sql<StoredEpisode>`
              SELECT * FROM episode WHERE subscription_id = ${subscriptionId} AND guid = ${e.guid}`
            // A feed that changed an item's guid: merge into the one existing Episode
            // with the same audio URL, or the same title and date, that the feed no
            // longer lists under its old guid. Ambiguous matches stay separate (Q34).
            const existing =
              byGuid ??
              (yield* sql<StoredEpisode>`
                SELECT * FROM episode WHERE subscription_id = ${subscriptionId}
                  AND (audio_url = ${e.audioUrl} OR (title = ${e.title} AND published = ${e.published}))`.pipe(
                Effect.map((candidates) => {
                  const orphaned = candidates.filter((c) => !guidsInFeed.has(c.guid))
                  return orphaned.length === 1 ? orphaned[0] : undefined
                })
              ))
            if (existing === undefined) {
              added++
              yield* sql`INSERT INTO episode ${sql.insert({
                id: episodeId(subscriptionId, e.guid),
                subscription_id: subscriptionId,
                guid: e.guid,
                title: e.title,
                description: e.description,
                published: e.published,
                duration: e.duration,
                audio_url: e.audioUrl,
                artwork_url: e.artworkUrl
              })}`
              continue
            }
            const same =
              existing.guid === e.guid &&
              existing.title === e.title &&
              existing.description === e.description &&
              existing.published === e.published &&
              existing.duration === e.duration &&
              existing.audio_url === e.audioUrl &&
              existing.artwork_url === e.artworkUrl
            if (same) continue
            changed++
            // A different-length file means the audio itself was replaced (Q34).
            const audioReplaced =
              existing.duration !== null &&
              e.duration !== null &&
              Math.abs(existing.duration - e.duration) > audioChangeThreshold
            yield* sql`UPDATE episode SET
                guid = ${e.guid},
                title = ${e.title},
                description = ${e.description},
                published = ${e.published},
                duration = ${e.duration},
                audio_url = ${e.audioUrl},
                artwork_url = ${e.artworkUrl},
                audio_updated_at = ${audioReplaced ? Date.now() : existing.audio_updated_at}
              WHERE id = ${existing.id}`
          }
          return { added, changed }
        }).pipe(sql.withTransaction, Effect.orDie)

      const refresh = (subscriptionId: string) =>
        Effect.gen(function* () {
          const fail = (message: string) => new FeedError({ subscriptionId, message })
          const [subscription] = yield* sql<{ feed_url: string }>`
            SELECT feed_url FROM subscription WHERE id = ${subscriptionId}`.pipe(Effect.orDie)
          if (subscription === undefined) return yield* new SubscriptionNotFound({ subscriptionId })
          const [state] = yield* sql<{ etag: string | null; last_modified: string | null }>`
            SELECT etag, last_modified FROM feed_state WHERE subscription_id = ${subscriptionId}`.pipe(
            Effect.orDie
          )

          let request = HttpClientRequest.get(subscription.feed_url).pipe(
            HttpClientRequest.setHeader("accept", "application/rss+xml, application/xml, text/xml")
          )
          if (state?.etag)
            request = HttpClientRequest.setHeader(request, "if-none-match", state.etag)
          if (state?.last_modified) {
            request = HttpClientRequest.setHeader(request, "if-modified-since", state.last_modified)
          }

          const response = yield* http.execute(request).pipe(
            Effect.timeout(feedTimeout),
            Effect.mapError((e) => fail(`Fetch failed: ${e.message}`))
          )
          const now = Date.now()
          const remember = (etag: string | null, lastModified: string | null) =>
            sql`INSERT INTO feed_state ${sql.insert({
              subscription_id: subscriptionId,
              etag,
              last_modified: lastModified,
              checked_at: now,
              failures: 0,
              last_error: null
            })} ON CONFLICT (subscription_id) DO UPDATE SET
                etag = excluded.etag, last_modified = excluded.last_modified,
                checked_at = excluded.checked_at, failures = 0, last_error = NULL`.pipe(
              Effect.orDie
            )

          if (response.status === 304) {
            yield* remember(state?.etag ?? null, state?.last_modified ?? null)
            return { _tag: "NotModified" } as const
          }
          if (response.status < 200 || response.status >= 300) {
            return yield* fail(`Feed answered HTTP ${response.status}`)
          }
          const body = yield* response.text.pipe(Effect.mapError((e) => fail(e.message)))
          const feed = yield* Effect.try({
            try: () => parseFeed(body),
            catch: (e) => fail(e instanceof Error ? e.message : String(e))
          })
          const counts = yield* store(subscriptionId, feed)
          yield* remember(response.headers.etag ?? null, response.headers["last-modified"] ?? null)
          return { _tag: "Updated", ...counts } as const
        }).pipe(
          Effect.tapError((e) =>
            e._tag === "SubscriptionNotFound"
              ? Effect.void
              : sql`INSERT INTO feed_state ${sql.insert({
                  subscription_id: subscriptionId,
                  checked_at: Date.now(),
                  failures: 1,
                  last_error: e.message
                })} ON CONFLICT (subscription_id) DO UPDATE SET
                checked_at = excluded.checked_at,
                failures = feed_state.failures + 1,
                last_error = excluded.last_error`.pipe(Effect.orDie)
          )
        )

      return Library.of({ refresh, store })
    })
  )
}
