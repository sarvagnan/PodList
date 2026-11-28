import { type Library, Mentions } from "@podlist/domain"
import { Effect } from "effect"
import { SqlClient } from "effect/sql"

// Writes catalogue changes from the server into the local subscription and episode
// tables, which Views query offline.

export const subscriptionRow = (s: Library.Subscription) => ({
  id: s.id,
  feed_url: s.feedUrl,
  title: s.title,
  title_folded: Mentions.fold(s.title),
  author: s.author,
  description: s.description,
  artwork_url: s.artwork?.url ?? null,
  subscribed_at: s.subscribedAt,
  unsubscribed_at: s.unsubscribedAt,
  played_threshold: s.playedThreshold,
  playback_settings: JSON.stringify(s.playbackSettings)
})

export const episodeRow = (e: Library.Episode) => ({
  id: e.id,
  subscription_id: e.subscriptionId,
  guid: e.guid,
  title: e.title,
  title_folded: Mentions.fold(e.title),
  description_folded: Mentions.fold(e.description),
  description: e.description,
  published: e.published,
  duration: e.duration,
  audio_url: e.audioUrl,
  artwork_url: e.artwork?.url ?? null,
  chapters: JSON.stringify(
    e.chapters.map((c) => ({
      start: c.start,
      title: c.title,
      artwork: c.artwork,
      url: c.url
    }))
  ),
  audio_updated_at: e.audioUpdatedAt
})

export const insertCatalogueRows = (
  table: "subscription" | "episode",
  rows: ReadonlyArray<Record<string, unknown>>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    for (let start = 0; start < rows.length; start += 48) {
      const [first, ...rest] = rows.slice(start, start + 48)
      if (first !== undefined) {
        yield* sql`INSERT OR REPLACE INTO ${sql(table)} ${sql.insert([first, ...rest])}`
      }
    }
  })

export const upsertSubscriptions = (subscriptions: ReadonlyArray<Library.Subscription>) =>
  Effect.suspend(() => insertCatalogueRows("subscription", subscriptions.map(subscriptionRow)))

export const upsertEpisodes = (episodes: ReadonlyArray<Library.Episode>) =>
  Effect.suspend(() => insertCatalogueRows("episode", episodes.map(episodeRow)))
