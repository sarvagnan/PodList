import type { State } from "@podlist/domain"
import { Effect } from "effect"
import { Atom } from "effect/reactivity"
import { SqlClient } from "effect/sql"
import { catalogueKey } from "../sync/SyncEngine.ts"
import { runtime, stateAtom } from "./runtime.ts"

// Local reads for the shell. Each re-runs when the user State changes or synced
// podcasts and Episodes arrive.

export interface EpisodeSummary {
  readonly id: string
  readonly title: string
  readonly podcast: string
  readonly duration: number | null
  readonly artworkUrl: string | null
}

/** Titles and podcasts for every Episode that is an Entry in some Playlist. */
export const entryEpisodesAtom = runtime
  .atom((get) =>
    Effect.gen(function* () {
      get(stateAtom)
      const sql = yield* SqlClient.SqlClient
      const rows = yield* sql<{
        id: string
        title: string
        podcast: string
        duration: number | null
        artwork_url: string | null
        podcast_artwork_url: string | null
      }>`SELECT DISTINCT e.id, e.title, s.title AS podcast, e.duration, e.artwork_url,
         s.artwork_url AS podcast_artwork_url
       FROM entry_index x
       JOIN episode e ON e.id = x.episode_id
       JOIN subscription s ON s.id = e.subscription_id`
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
    })
  )
  .pipe(Atom.withReactivity([catalogueKey]))

export interface SubscriptionSummary {
  readonly id: string
  readonly title: string
  readonly author: string | null
  readonly artworkUrl: string | null
  readonly unplayed: number
}

export const subscriptionsAtom = runtime
  .atom((get) =>
    Effect.gen(function* () {
      get(stateAtom)
      const sql = yield* SqlClient.SqlClient
      return yield* sql<SubscriptionSummary>`
      SELECT s.id, s.title, s.author, s.artwork_url AS artworkUrl,
        (SELECT count(*) FROM episode e LEFT JOIN episode_state st ON st.episode_id = e.id
          WHERE e.subscription_id = s.id AND st.played_at IS NULL) AS unplayed
      FROM subscription s WHERE s.unsubscribed_at IS NULL ORDER BY s.title COLLATE NOCASE`
    })
  )
  .pipe(Atom.withReactivity([catalogueKey]))

export const activePlaylist = (state: State.State) =>
  state.playlists.find((p) => p.id === state.activePlaylistId) ?? state.playlists[0]
