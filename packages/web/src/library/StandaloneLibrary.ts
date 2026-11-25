import { Library as Domain, EpisodeIdentity } from "@podlist/domain"
import type { ParsedFeed } from "@podlist/feeds"
import { feedPollDecision, pollIntervalMillis } from "@podlist/feeds/polling"
import type { publisherFeeds } from "@podlist/feeds/publisher"
import { Duration, Effect, Queue, Schema, Semaphore } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { catalogueKey } from "../data/DataLayer.ts"
import { upsertEpisodes, upsertSubscriptions } from "../sync/Catalogue.ts"
import { LibraryError } from "./LibraryClient.ts"

type Publisher = ReturnType<typeof publisherFeeds>
type PollState = {
  readonly etag: string | null
  readonly last_modified: string | null
  readonly checked_at: number
  readonly failures: number
}

type RefreshOptions = {
  readonly subscriptionId?: string
  readonly automatic?: boolean
  readonly progress?: (completed: number, total: number) => void
}

const artwork = (url: string | null) => (url ? { url } : null)
const subscriptionFromRow = (row: SubscriptionRow) =>
  Schema.decodeUnknownSync(Domain.Subscription)({
    id: row.id,
    feedUrl: row.feed_url,
    title: row.title,
    author: row.author,
    description: row.description,
    artwork: artwork(row.artwork_url),
    subscribedAt: row.subscribed_at,
    unsubscribedAt: row.unsubscribed_at,
    playedThreshold: row.played_threshold,
    playbackSettings: JSON.parse(row.playback_settings),
    websiteUrl: row.website_url
  })

type SubscriptionRow = {
  readonly id: string
  readonly feed_url: string
  readonly title: string
  readonly author: string | null
  readonly description: string | null
  readonly artwork_url: string | null
  readonly subscribed_at: number
  readonly unsubscribed_at: number | null
  readonly played_threshold: number | null
  readonly playback_settings: string
  readonly website_url: string | null
}

type EpisodeRow = {
  readonly id: string
  readonly guid: string
  readonly title: string
  readonly published: number
  readonly duration: number | null
  readonly audioUrl: string
  readonly chapters_url: string | null
  readonly chapters: string
  readonly chapters_fetched_at: number | null
  readonly audio_updated_at: number | null
}

const libraryError = (cause: unknown) =>
  cause instanceof LibraryError
    ? cause
    : new LibraryError(cause instanceof Error ? cause.message : "Could not update the Library.")

export const makeStandaloneLibrary = (publisher: Publisher, now = Date.now) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const reactivity = yield* Reactivity.Reactivity
    const mutation = yield* Semaphore.make(1)
    const poll = yield* Semaphore.make(1)
    const withSql = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) =>
      Effect.provideService(effect, SqlClient.SqlClient, sql)

    const subscription = (feedUrl: string) =>
      sql<SubscriptionRow>`SELECT * FROM subscription WHERE feed_url = ${feedUrl}`.pipe(
        Effect.map(([row]) => row && subscriptionFromRow(row))
      )
    const pollState = (id: string) =>
      sql<PollState>`SELECT * FROM feed_state WHERE subscription_id = ${id}`.pipe(
        Effect.map(([row]) => row)
      )
    const saveCheck = (id: string, etag: string | null, lastModified: string | null) =>
      sql`INSERT INTO feed_state (subscription_id, etag, last_modified, checked_at, failures)
        VALUES (${id}, ${etag}, ${lastModified}, ${now()}, 0)
        ON CONFLICT(subscription_id) DO UPDATE SET etag = excluded.etag,
          last_modified = excluded.last_modified, checked_at = excluded.checked_at, failures = 0`

    // A single transaction preserves identity when Subscribe and a single-Episode add overlap.
    const store = (feedUrl: string, feed: ParsedFeed, subscribe: boolean, guid?: string) =>
      Effect.gen(function* () {
        const old = yield* subscription(feedUrl)
        const at = now()
        const sub = Schema.decodeUnknownSync(Domain.Subscription)({
          id: old?.id ?? crypto.randomUUID(),
          feedUrl,
          title: feed.title,
          author: feed.author,
          description: feed.description,
          artwork: artwork(feed.artworkUrl),
          subscribedAt: old?.subscribedAt ?? at,
          unsubscribedAt:
            subscribe || old?.unsubscribedAt === null ? null : (old?.unsubscribedAt ?? at),
          playedThreshold: old?.playedThreshold ?? null,
          playbackSettings: old?.playbackSettings ?? {},
          websiteUrl: feed.link
        })
        yield* withSql(upsertSubscriptions([sub]))
        yield* sql`UPDATE subscription SET website_url = ${feed.link} WHERE id = ${sub.id}`
        const current =
          yield* sql<EpisodeRow>`SELECT id, guid, title, published, duration, audio_url AS audioUrl,
          chapters_url, chapters, chapters_fetched_at, audio_updated_at
          FROM episode WHERE subscription_id = ${sub.id}`
        const published = new Map(feed.episodes.map((episode) => [episode.guid, episode]))
        const guidsInFeed = new Set(published.keys())
        const reused = new Set<string>()

        const selected = guid === undefined ? [...published.values()] : [published.get(guid)]
        let episodeId: string | undefined
        for (const episode of selected) {
          if (!episode)
            return yield* Effect.fail(new LibraryError("Episode is no longer in the feed."))
          const matched = EpisodeIdentity.matchEpisode(
            episode,
            current,
            guid === undefined ? guidsInFeed : undefined
          )
          const previous = matched && !reused.has(matched.id) ? matched : undefined
          if (previous) reused.add(previous.id)
          const replaced =
            previous?.duration != null &&
            episode.duration !== null &&
            Math.abs(previous.duration - episode.duration) > 30
          const resetChapters = replaced || previous?.chapters_url !== episode.chaptersUrl
          const row = Schema.decodeUnknownSync(Domain.Episode)({
            ...episode,
            id: previous?.id ?? crypto.randomUUID(),
            subscriptionId: sub.id,
            artwork: artwork(episode.artworkUrl),
            chapters: resetChapters || !previous ? [] : JSON.parse(previous.chapters),
            audioUpdatedAt: replaced ? at : (previous?.audio_updated_at ?? null),
            websiteUrl: episode.link
          })
          yield* withSql(upsertEpisodes([row]))
          yield* sql`UPDATE episode SET website_url = ${episode.link},
            chapters_url = ${episode.chaptersUrl},
            chapters_fetched_at = ${resetChapters ? null : (previous?.chapters_fetched_at ?? null)}
            WHERE id = ${row.id}`
          episodeId = row.id
        }
        return { subscription: sub, episodeId }
      })

    const read = (feedUrl: string) =>
      Effect.tryPromise({
        try: async (signal) => {
          const response = await publisher.read(feedUrl, undefined, signal)
          if (response.kind !== "updated")
            throw new LibraryError("Could not read the feed. Try again.")
          return response
        },
        catch: libraryError
      })

    const refreshOne = (sub: Domain.Subscription, state: PollState | undefined) =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: (signal) =>
            publisher.read(
              sub.feedUrl,
              state && { etag: state.etag, lastModified: state.last_modified },
              signal
            ),
          catch: libraryError
        }).pipe(
          Effect.tapError(() =>
            sql`INSERT INTO feed_state (subscription_id, checked_at, failures)
            VALUES (${sub.id}, ${now()}, 1)
            ON CONFLICT(subscription_id) DO UPDATE SET checked_at = excluded.checked_at,
              failures = feed_state.failures + 1`.pipe(Effect.orDie)
          )
        )
        yield* Effect.gen(function* () {
          if (response.kind === "updated") {
            yield* store(sub.feedUrl, response.feed, false)
            yield* saveCheck(sub.id, response.validators.etag, response.validators.lastModified)
          } else {
            yield* saveCheck(sub.id, state?.etag ?? null, state?.last_modified ?? null)
          }
        }).pipe(sql.withTransaction)
        if (response.kind === "updated") yield* reactivity.invalidate([catalogueKey])
        return response.kind
      }).pipe(mutation.withPermits(1), Effect.mapError(libraryError))

    const refresh = (options: RefreshOptions = {}) =>
      Effect.gen(function* () {
        const id = options.subscriptionId ?? null
        const rows = yield* sql<SubscriptionRow>`
          SELECT * FROM subscription WHERE unsubscribed_at IS NULL
          AND (${id} IS NULL OR id = ${id}) ORDER BY title, id`
        let updated = 0
        let notModified = 0
        let failed = 0
        options.progress?.(0, rows.length)
        for (const row of rows) {
          const state = yield* pollState(row.id)
          if (
            !feedPollDecision({
              checkedAt: state?.checked_at ?? null,
              failures: state?.failures ?? 0,
              now: now(),
              automatic: options.automatic ?? false
            }).due
          )
            continue
          const result = yield* refreshOne(subscriptionFromRow(row), state).pipe(Effect.result)
          if (result._tag === "Failure") failed++
          else if (result.success === "updated") updated++
          else notModified++
          options.progress?.(updated + notModified + failed, rows.length)
        }
        return { checked: updated + notModified + failed, updated, notModified, failed }
      }).pipe(poll.withPermits(1), Effect.mapError(libraryError))

    return {
      isSubscribed: (feedUrl: string) =>
        subscription(feedUrl).pipe(
          Effect.map((sub) => sub?.unsubscribedAt === null),
          Effect.mapError(libraryError)
        ),
      readPodcast: (feedUrl: string) => read(feedUrl).pipe(Effect.map((result) => result.feed)),
      search: (query: string) =>
        Effect.tryPromise({
          try: (signal) => publisher.search(query, signal),
          catch: libraryError
        }),
      subscribe: (feedUrl: string) =>
        Effect.gen(function* () {
          const old = yield* subscription(feedUrl)
          if (old && old.unsubscribedAt === null) return old
          if (old && (yield* pollState(old.id))) {
            yield* sql`UPDATE subscription SET unsubscribed_at = NULL WHERE id = ${old.id}`
            yield* reactivity.invalidate([catalogueKey])
            return new Domain.Subscription({ ...old, unsubscribedAt: null })
          }
          const response = yield* read(feedUrl)
          const added = yield* Effect.gen(function* () {
            const result = yield* store(feedUrl, response.feed, true)
            yield* saveCheck(
              result.subscription.id,
              response.validators.etag,
              response.validators.lastModified
            )
            return result.subscription
          }).pipe(sql.withTransaction)
          yield* reactivity.invalidate([catalogueKey])
          return added
        }).pipe(mutation.withPermits(1), Effect.mapError(libraryError)),
      unsubscribe: (id: string) =>
        sql`UPDATE subscription SET unsubscribed_at = COALESCE(unsubscribed_at, ${now()})
          WHERE id = ${id}`.pipe(
          Effect.tap(() => reactivity.invalidate([catalogueKey])),
          Effect.asVoid,
          mutation.withPermits(1),
          Effect.mapError(libraryError)
        ),
      bringEpisode: (feedUrl: string, guid: string) =>
        Effect.gen(function* () {
          const [existing] = yield* sql<{ id: string }>`
            SELECT e.id FROM episode e JOIN subscription s ON s.id = e.subscription_id
            WHERE s.feed_url = ${feedUrl} AND e.guid = ${guid}`
          if (existing) return existing.id
          const response = yield* read(feedUrl)
          const result = yield* store(feedUrl, response.feed, false, guid).pipe(sql.withTransaction)
          yield* reactivity.invalidate([catalogueKey])
          if (!result.episodeId)
            return yield* Effect.fail(new LibraryError("Episode is no longer in the feed."))
          return result.episodeId
        }).pipe(mutation.withPermits(1), Effect.mapError(libraryError)),
      refresh
    }
  })

/** Poll while the Library is open, including after foregrounding or connectivity recovers. */
export const runPublisherChecks = (
  refresh: (options: RefreshOptions) => Effect.Effect<unknown, LibraryError>
) =>
  Effect.gen(function* () {
    const triggers = yield* Queue.sliding<void>(1)
    const trigger = () => Queue.offerUnsafe(triggers, undefined)
    const visible = () => {
      if (document.visibilityState === "visible") trigger()
    }
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        window.addEventListener("online", trigger)
        document.addEventListener("visibilitychange", visible)
      }),
      () =>
        Effect.sync(() => {
          window.removeEventListener("online", trigger)
          document.removeEventListener("visibilitychange", visible)
        })
    )
    for (;;) {
      yield* refresh({ automatic: true }).pipe(Effect.ignore)
      yield* Queue.take(triggers).pipe(
        Effect.timeout(Duration.millis(pollIntervalMillis)),
        Effect.ignore
      )
    }
  }).pipe(Effect.scoped)
