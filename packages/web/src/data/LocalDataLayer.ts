import { Library, type PlaybackSettings, type State, Units, ViewQuery } from "@podlist/domain"
import { Effect, Layer, Schema, SubscriptionRef } from "effect"
import { SqlClient } from "effect/sql"
import { fromStoredChapters, toPlayerChapter } from "../lib/chapters.ts"
import { desktopStandalone } from "../lib/desktopSession.ts"
import { storedOverride } from "../lib/playbackSettings.ts"
import { resolveLocalChapters } from "../library/DownloadedChapters.ts"
import { makeStandaloneChapters } from "../library/StandaloneChapters.ts"
import { DownloadStore } from "../platform/DownloadStore.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { Transport } from "../sync/Transport.ts"
import {
  DataLayer,
  type EpisodeDetail,
  type EpisodeSummary,
  type SubscriptionDetail,
  type SubscriptionSummary,
  type ViewEpisode
} from "./DataLayer.ts"

const compiled = (state: State.State, viewId: string) => {
  const view = state.views.find((v) => v.id === viewId)
  return view && ViewQuery.compile(view, Units.EpochMillis.make(Date.now()))
}

type EpisodeRowData = {
  id: string
  title: string
  podcast: string
  published: number
  duration: number | null
  artwork_url: string | null
  podcast_artwork_url: string | null
  played_at: number | null
  starred: number
}

const episodesFor = (query: ViewQuery.CompiledQuery | undefined) =>
  Effect.gen(function* () {
    if (query === undefined) return []
    const sql = yield* SqlClient.SqlClient
    const rows = yield* sql.unsafe<EpisodeRowData>(query.sql, [...query.params])
    return rows.map(
      (r): ViewEpisode => ({
        id: r.id,
        title: r.title,
        podcast: r.podcast,
        published: r.published,
        duration: r.duration,
        artworkUrl: r.artwork_url ?? r.podcast_artwork_url,
        played: r.played_at !== null,
        starred: r.starred === 1
      })
    )
  })

/** Today's SQLite reads and offline sync, shared by web and Electron until cutover. */
export const LocalDataLayer = Layer.effect(
  DataLayer,
  Effect.gen(function* () {
    const engine = yield* SyncEngine
    const sql = yield* SqlClient.SqlClient
    const transport = yield* Transport
    // Some local readers only compose SQLite and sync. Desktop also supplies OPFS.
    const downloads = yield* Effect.serviceOption(DownloadStore)
    const readPrefix = (id: string, bytes: number) =>
      downloads._tag === "Some" ? downloads.value.readPrefix(id, bytes) : Effect.succeed(null)
    const standaloneChapters = desktopStandalone ? yield* makeStandaloneChapters(readPrefix) : null
    const decodeChapters = Schema.decodeUnknownSync(Schema.Array(Library.Chapter))
    const chaptersFor =
      standaloneChapters ??
      ((id: string) =>
        Effect.gen(function* () {
          const [row] = yield* sql<{ chapters: string; chapters_url: string | null }>`
          SELECT chapters, chapters_url FROM episode WHERE id = ${id}
        `.pipe(Effect.orDie)
          if (!row) return []
          const cached = yield* Effect.try(() => decodeChapters(JSON.parse(row.chapters))).pipe(
            Effect.orElseSucceed(() => [])
          )
          return yield* resolveLocalChapters({
            cached,
            preferDownload: row.chapters_url === null,
            readPrefix: (bytes) => readPrefix(id, bytes),
            remote: transport.chapters(id)
          })
        }))
    const withSql = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) =>
      Effect.provideService(effect, SqlClient.SqlClient, sql)

    return DataLayer.of({
      state: engine.state,
      status: engine.status,
      deviceId: engine.deviceId,
      record: engine.record,
      recordBatch: engine.recordBatch,
      sync: engine.sync,
      runInBackground: engine.runInBackground,
      entryEpisodes: (ids) =>
        Effect.gen(function* () {
          const rows =
            ids.length === 0
              ? []
              : yield* sql<{
                  id: string
                  title: string
                  podcast: string
                  duration: number | null
                  artwork_url: string | null
                  podcast_artwork_url: string | null
                }>`SELECT e.id, e.title, s.title AS podcast, e.duration, e.artwork_url,
               s.artwork_url AS podcast_artwork_url
             FROM episode e
             JOIN subscription s ON s.id = e.subscription_id
             WHERE ${sql.in("e.id", [...ids])}`
          return new Map<string, EpisodeSummary>(
            rows.map((r) => [
              r.id,
              {
                id: r.id,
                title: r.title,
                podcast: r.podcast,
                duration: r.duration,
                artworkUrl: r.artwork_url ?? r.podcast_artwork_url
              }
            ])
          )
        }),
      subscriptions: Effect.gen(function* () {
        const rows = yield* sql<
          Omit<SubscriptionSummary, "speed" | "customSettings"> & {
            readonly playbackSettings: string
            readonly playedThreshold: number | null
          }
        >`
      SELECT s.id, s.feed_url AS feedUrl, s.title, s.author, s.artwork_url AS artworkUrl,
        s.playback_settings AS playbackSettings, s.played_threshold AS playedThreshold,
        (SELECT count(*) FROM episode e LEFT JOIN episode_state st ON st.episode_id = e.id
          WHERE e.subscription_id = s.id AND st.played_at IS NULL) AS unplayed
      FROM subscription s WHERE s.unsubscribed_at IS NULL ORDER BY s.title COLLATE NOCASE`
        return rows.map(({ playbackSettings, playedThreshold, ...row }): SubscriptionSummary => {
          let overrides: PlaybackSettings.PlaybackSettingsOverride = {}
          try {
            overrides = JSON.parse(playbackSettings) as PlaybackSettings.PlaybackSettingsOverride
          } catch {
            // Unreadable overrides count as none.
          }
          return {
            ...row,
            speed: overrides.speed ?? null,
            customSettings:
              Object.values(overrides).filter((v) => v !== undefined).length +
              (playedThreshold === null ? 0 : 1)
          }
        })
      }),
      subscription: (subscriptionId) =>
        Effect.gen(function* () {
          const [row] = yield* sql<{
            id: string
            feed_url: string
            title: string
            author: string | null
            description: string | null
            artwork_url: string | null
            website_url?: string | null
            unsubscribed_at: number | null
            played_threshold: number | null
            playback_settings: string
            episodes: number
            unplayed: number
          }>`
          SELECT s.*, (SELECT count(*) FROM episode e WHERE e.subscription_id = s.id) AS episodes,
            (SELECT count(*) FROM episode e LEFT JOIN episode_state st ON st.episode_id = e.id
              WHERE e.subscription_id = s.id AND st.played_at IS NULL) AS unplayed
          FROM subscription s WHERE s.id = ${subscriptionId}`
          if (row === undefined) return null
          let playbackSettings: PlaybackSettings.PlaybackSettingsOverride = {}
          try {
            playbackSettings = JSON.parse(
              row.playback_settings
            ) as PlaybackSettings.PlaybackSettingsOverride
          } catch {
            // Unreadable overrides count as none.
          }
          return {
            id: row.id,
            feedUrl: row.feed_url,
            title: row.title,
            author: row.author,
            description: row.description,
            artworkUrl: row.artwork_url,
            ...(row.website_url ? { websiteUrl: row.website_url } : {}),
            subscribed: row.unsubscribed_at === null,
            playedThreshold: row.played_threshold,
            playbackSettings,
            episodes: row.episodes,
            unplayed: row.unplayed
          } satisfies SubscriptionDetail
        }),
      viewEpisodes: (viewId) =>
        Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(engine.state)
          return yield* withSql(episodesFor(compiled(state, viewId)))
        }),
      filterEpisodes: (input) =>
        withSql(episodesFor(ViewQuery.compile(input, Units.EpochMillis.make(Date.now())))),
      episodePage: (source, offset, limit) =>
        Effect.gen(function* () {
          const query =
            typeof source === "string"
              ? compiled(yield* SubscriptionRef.get(engine.state), source)
              : ViewQuery.compile(source, Units.EpochMillis.make(Date.now()))
          if (query === undefined) return { items: [], total: 0 }
          const [row] = yield* sql.unsafe<{ n: number }>(
            `SELECT count(*) AS n FROM (${query.sql})`,
            [...query.params]
          )
          const items = yield* withSql(
            episodesFor({
              sql: `SELECT * FROM (${query.sql}) LIMIT ? OFFSET ?`,
              params: [...query.params, limit, offset]
            })
          )
          return { items, total: row?.n ?? 0 }
        }).pipe(sql.withTransaction),
      viewCounts: Effect.gen(function* () {
        const state = yield* SubscriptionRef.get(engine.state)
        const counts = new Map<string, number>()
        for (const view of state.views) {
          const query = ViewQuery.compile(view, Units.EpochMillis.make(Date.now()))
          const [row] = yield* sql.unsafe<{ n: number }>(
            `SELECT count(*) AS n FROM (${query.sql})`,
            [...query.params]
          )
          counts.set(view.id, row?.n ?? 0)
        }
        return counts
      }),
      episodeDetail: (episodeId) =>
        Effect.gen(function* () {
          const [row] = yield* sql<
            Omit<EpisodeDetail, "chapters" | "artworkUrl"> & {
              website_url: string | null
              artwork_url: string | null
              podcast_artwork_url: string | null
            }
          >`
          SELECT e.id, e.title, s.title AS podcast, e.published, e.duration, e.description,
            e.artwork_url, s.artwork_url AS podcast_artwork_url,
            ${sql.literal(desktopStandalone ? "e.website_url" : "NULL")} AS website_url
          FROM episode e JOIN subscription s ON s.id = e.subscription_id
          WHERE e.id = ${episodeId}`
          if (row === undefined) return null
          const chapters = (yield* chaptersFor(episodeId)).map(toPlayerChapter)
          const { artwork_url, podcast_artwork_url, website_url, ...rest } = row
          return {
            ...rest,
            artworkUrl: artwork_url ?? podcast_artwork_url,
            ...(website_url ? { websiteUrl: website_url } : {}),
            chapters
          }
        }),
      statsCatalogue: Effect.gen(function* () {
        const subscriptions = yield* sql<{
          id: string
          title: string
        }>`SELECT id, title FROM subscription`
        const episodes = yield* sql<{ id: string }>`SELECT id FROM episode`
        return {
          podcasts: new Map(subscriptions.map((s) => [s.id, s.title])),
          episodes: new Set(episodes.map((e) => e.id))
        }
      }),
      hasLibraryEpisode: (id) =>
        sql`SELECT e.id FROM episode e JOIN subscription s ON s.id = e.subscription_id
          WHERE e.id = ${id} AND (s.unsubscribed_at IS NULL
            OR EXISTS (SELECT 1 FROM episode_state WHERE episode_id = e.id AND starred = 1)
            OR EXISTS (SELECT 1 FROM entry_index WHERE episode_id = e.id))`.pipe(
          Effect.map((rows) => rows.length > 0)
        ),
      episodeTitle: (episodeId) =>
        sql<{ title: string }>`SELECT title FROM episode WHERE id = ${episodeId}`.pipe(
          Effect.map((rows) => rows[0]?.title)
        ),
      playbackEpisode: (episodeId) =>
        Effect.gen(function* () {
          const [row] = yield* sql<{
            title: string
            audio_url: string
            podcast: string
            duration: number | null
            artwork_url: string | null
            podcast_artwork_url: string | null
            played_threshold: number | null
            chapters: string
            subscription_id: string
            playback_settings: string | null
          }>`SELECT e.title, e.audio_url, s.title AS podcast, e.duration, e.artwork_url,
                 s.artwork_url AS podcast_artwork_url, s.played_threshold, e.chapters,
                 s.id AS subscription_id, s.playback_settings
               FROM episode e JOIN subscription s ON s.id = e.subscription_id
               WHERE e.id = ${episodeId}`.pipe(Effect.orDie)
          return {
            title: row?.title ?? "",
            audioUrl: row?.audio_url ?? null,
            podcast: row?.podcast ?? "",
            artworkUrl: row?.artwork_url ?? row?.podcast_artwork_url ?? null,
            duration: row?.duration ?? null,
            threshold: row?.played_threshold ?? null,
            subscriptionId: row?.subscription_id ?? null,
            override: storedOverride(row?.playback_settings ?? null),
            chapters: row ? fromStoredChapters(row.chapters) : []
          }
        }),
      chapters: chaptersFor
    })
  })
)
