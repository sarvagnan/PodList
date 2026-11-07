import { type PlaybackSettings, type State, Units, ViewQuery } from "@podlist/domain"
import { Effect } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { SqlClient } from "effect/sql"
import { fromStoredChapters, type PlayerChapter, toPlayerChapter } from "../lib/chapters.ts"
import { catalogueKey } from "../sync/SyncEngine.ts"
import { Transport } from "../sync/Transport.ts"
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
  readonly feedUrl: string
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
      SELECT s.id, s.feed_url AS feedUrl, s.title, s.author, s.artwork_url AS artworkUrl,
        (SELECT count(*) FROM episode e LEFT JOIN episode_state st ON st.episode_id = e.id
          WHERE e.subscription_id = s.id AND st.played_at IS NULL) AS unplayed
      FROM subscription s WHERE s.unsubscribed_at IS NULL ORDER BY s.title COLLATE NOCASE`
    })
  )
  .pipe(Atom.withReactivity([catalogueKey]))

export interface SubscriptionDetail {
  readonly id: string
  readonly feedUrl: string
  readonly title: string
  readonly author: string | null
  readonly description: string | null
  readonly artworkUrl: string | null
  readonly subscribed: boolean
  /** Seconds before the end that count as finished; null for the default. */
  readonly playedThreshold: number | null
  readonly playbackSettings: PlaybackSettings.PlaybackSettingsOverride
  readonly episodes: number
  readonly unplayed: number
}

/** One Subscription, with its overrides, for its settings screen. */
export const subscriptionAtom = Atom.family((subscriptionId: string) =>
  runtime
    .atom((get) =>
      Effect.gen(function* () {
        get(stateAtom)
        const sql = yield* SqlClient.SqlClient
        const [row] = yield* sql<{
          id: string
          feed_url: string
          title: string
          author: string | null
          description: string | null
          artwork_url: string | null
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
          subscribed: row.unsubscribed_at === null,
          playedThreshold: row.played_threshold,
          playbackSettings,
          episodes: row.episodes,
          unplayed: row.unplayed
        } satisfies SubscriptionDetail
      })
    )
    .pipe(Atom.withReactivity([catalogueKey]))
)

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

/** The Episodes a View matches right now, in its order. */
export const viewEpisodesAtom = Atom.family((viewId: string) =>
  runtime
    .atom((get) =>
      Effect.gen(function* () {
        const state = get(stateAtom)
        return yield* episodesFor(
          AsyncResult.isSuccess(state) ? compiled(state.value, viewId) : undefined
        )
      })
    )
    .pipe(Atom.withReactivity([catalogueKey]))
)

/**
 * The Episodes an unsaved filter matches, for Search. Keyed by the JSON of
 * `{ filter, sort, limit }`.
 */
export const filterEpisodesAtom = Atom.family((key: string) =>
  runtime
    .atom((get) =>
      Effect.gen(function* () {
        get(stateAtom)
        const input = JSON.parse(key) as ViewQuery.ViewQueryInput
        return yield* episodesFor(ViewQuery.compile(input, Units.EpochMillis.make(Date.now())))
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

export interface EpisodeDetail {
  readonly id: string
  readonly title: string
  readonly podcast: string
  readonly published: number
  readonly duration: number | null
  readonly description: string
  readonly artworkUrl: string | null
  readonly chapters: ReadonlyArray<PlayerChapter>
}

/** One Episode's details from the local catalogue, for the Episode page. */
export const episodeDetailAtom = Atom.family((episodeId: string) =>
  runtime
    .atom(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const [row] = yield* sql<
          Omit<EpisodeDetail, "chapters" | "artworkUrl"> & {
            chapters: string
            artwork_url: string | null
            podcast_artwork_url: string | null
          }
        >`
          SELECT e.id, e.title, s.title AS podcast, e.published, e.duration, e.description,
            e.chapters, e.artwork_url, s.artwork_url AS podcast_artwork_url
          FROM episode e JOIN subscription s ON s.id = e.subscription_id
          WHERE e.id = ${episodeId}`
        if (row === undefined) return null
        // The server finds Chapters the first time anyone asks; offline, the local copy.
        const transport = yield* Transport
        const chapters = yield* transport.chapters(episodeId).pipe(
          Effect.map((cs) => cs.map(toPlayerChapter)),
          Effect.filterOrElse(
            (cs) => cs.length > 0,
            () => Effect.succeed(fromStoredChapters(row.chapters))
          ),
          Effect.orElseSucceed(() => fromStoredChapters(row.chapters))
        )
        const { chapters: _stored, artwork_url, podcast_artwork_url, ...rest } = row
        return { ...rest, artworkUrl: artwork_url ?? podcast_artwork_url, chapters }
      })
    )
    .pipe(Atom.withReactivity([catalogueKey]))
)
