import {
  Ids,
  Library,
  Operation,
  PlaybackSettings,
  State,
  StateStore,
  Units
} from "@podlist/domain"
import { Effect, Schema } from "effect"
import { SqlClient } from "effect/sql"

export const SourceSnapshot = Schema.Struct({
  deviceId: Ids.DeviceId,
  subscriptions: Schema.Array(Library.Subscription),
  episodes: Schema.Array(Library.Episode),
  state: State.State,
  operations: Schema.Array(Operation.Operation),
  downloads: Schema.Array(Schema.Struct({ episodeId: Ids.EpisodeId, bytes: Schema.Int }))
})
export type SourceSnapshot = typeof SourceSnapshot.Type

type RawSubscription = {
  id: string
  feed_url: string
  title: string
  author: string | null
  description: string | null
  artwork_url: string | null
  website_url?: string | null
  subscribed_at: number
  unsubscribed_at: number | null
  played_threshold: number | null
  playback_settings: string
}
type RawEpisode = {
  id: string
  subscription_id: string
  guid: string
  title: string
  description: string
  published: number
  duration: number | null
  audio_url: string
  artwork_url: string | null
  website_url?: string | null
  chapters: string
  audio_updated_at: number | null
}

const parseSubscriptions = Schema.decodeUnknownSync(Schema.Array(Library.Subscription))
const parseEpisodes = Schema.decodeUnknownSync(Schema.Array(Library.Episode))
const parseOperation = Schema.decodeSync(Schema.fromJsonString(Operation.Operation))
const art = (url: string | null) => (url ? { url } : null)

/** The local mirrors already hold all catalogue identities, including Orphaned Episodes. */
export const readBringOverCatalogue = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  const subscriptions = yield* sql<RawSubscription>`SELECT * FROM subscription`
  const episodes = yield* sql<RawEpisode>`SELECT * FROM episode`
  return {
    subscriptions: parseSubscriptions(
      subscriptions.map((row) => ({
        id: row.id,
        feedUrl: row.feed_url,
        title: row.title,
        author: row.author,
        description: row.description,
        artwork: art(row.artwork_url),
        ...(row.website_url === undefined ? {} : { websiteUrl: row.website_url }),
        subscribedAt: row.subscribed_at,
        unsubscribedAt: row.unsubscribed_at,
        playedThreshold: row.played_threshold,
        playbackSettings: JSON.parse(row.playback_settings)
      }))
    ),
    episodes: parseEpisodes(
      episodes.map((row) => ({
        id: row.id,
        subscriptionId: row.subscription_id,
        guid: row.guid,
        title: row.title,
        description: row.description,
        published: row.published,
        duration: row.duration,
        audioUrl: row.audio_url,
        artwork: art(row.artwork_url),
        ...(row.website_url === undefined ? {} : { websiteUrl: row.website_url }),
        chapters: JSON.parse(row.chapters),
        audioUpdatedAt: row.audio_updated_at
      }))
    )
  }
})

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})

export const readBringOverSource = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  return yield* Effect.gen(function* () {
    const [row] = yield* sql<{ value: string }>`SELECT value FROM sync_meta WHERE key = 'deviceId'`
    if (!row) return null
    const deviceId = Ids.DeviceId.make(row.value)
    const catalogue = yield* readBringOverCatalogue
    const operations = (yield* sql<{ operation: string }>`
      SELECT operation FROM local_operation ORDER BY seq`).map(({ operation }) =>
      parseOperation(operation)
    )
    const downloads = yield* sql<{ episodeId: string; bytes: number }>`
      SELECT episode_id AS episodeId, bytes FROM download ORDER BY episode_id`
    if (!catalogue.subscriptions.length && !operations.length && !downloads.length) return null
    const state = yield* StateStore.load(defaults)
    return Schema.decodeUnknownSync(SourceSnapshot)({
      deviceId,
      ...catalogue,
      state,
      operations,
      downloads
    })
  }).pipe(sql.withTransaction)
})
