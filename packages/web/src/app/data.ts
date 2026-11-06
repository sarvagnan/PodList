import { type State, Units, ViewQuery } from "@podlist/domain"
import { Effect } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
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

export interface ViewEpisode {
  readonly id: string
  readonly title: string
  readonly podcast: string
  readonly published: number
  readonly duration: number | null
  readonly artworkUrl: string | null
  readonly played: boolean
  readonly starred: boolean
}

const compiled = (state: State.State, viewId: string) => {
  const view = state.views.find((v) => v.id === viewId)
  return view && ViewQuery.compile(view, Units.EpochMillis.make(Date.now()))
}

/** The Episodes a View matches right now, in its order. */
export const viewEpisodesAtom = Atom.family((viewId: string) =>
  runtime
    .atom((get) =>
      Effect.gen(function* () {
        const state = get(stateAtom)
        const sql = yield* SqlClient.SqlClient
        const query = AsyncResult.isSuccess(state) ? compiled(state.value, viewId) : undefined
        if (query === undefined) return []
        const rows = yield* sql.unsafe<{
          id: string
          title: string
          podcast: string
          published: number
          duration: number | null
          artwork_url: string | null
          podcast_artwork_url: string | null
          played_at: number | null
          starred: number
        }>(query.sql, [...query.params])
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
    )
    .pipe(Atom.withReactivity([catalogueKey]))
)

/** How many Episodes each View matches, for the Views list. */
export const viewCountsAtom = runtime
  .atom((get) =>
    Effect.gen(function* () {
      const state = get(stateAtom)
      const sql = yield* SqlClient.SqlClient
      const counts = new Map<string, number>()
      if (!AsyncResult.isSuccess(state)) return counts
      for (const view of state.value.views) {
        const query = ViewQuery.compile(view, Units.EpochMillis.make(Date.now()))
        const [row] = yield* sql.unsafe<{ n: number }>(`SELECT count(*) AS n FROM (${query.sql})`, [
          ...query.params
        ])
        counts.set(view.id, row?.n ?? 0)
      }
      return counts
    })
  )
  .pipe(Atom.withReactivity([catalogueKey]))
