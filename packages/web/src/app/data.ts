import type { State, ViewQuery } from "@podlist/domain"
import { Effect } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { catalogueKey, DataLayer } from "../data/DataLayer.ts"
import { runtime, stateAtom } from "./runtime.ts"

// React bindings only. Storage, query compilation and sync live behind DataLayer.
export type {
  EpisodeDetail,
  EpisodeSummary,
  SubscriptionDetail,
  SubscriptionSummary,
  ViewEpisode
} from "../data/DataLayer.ts"

/** Membership is stable across Positions and reorders: avoid re-querying 500 titles
 * and blanking the grid on every playback report (pod-b90). */
const entryEpisodeIdsAtom = Atom.make((get) => {
  const state = get(stateAtom)
  const ids = new Set<string>()
  if (AsyncResult.isSuccess(state)) {
    for (const p of state.value.playlists) {
      for (const e of p.entries) ids.add(e.episodeId)
      for (const h of p.history) ids.add(h.episodeId)
      for (const t of p.timeline) ids.add(t.episodeId)
      for (const e of p.edits ?? []) ids.add(e.episodeId)
    }
  }
  return JSON.stringify([...ids].sort())
})

/** Titles and podcasts for every Episode that is an Entry in some Playlist. */
export const entryEpisodesAtom = runtime
  .atom((get) => {
    const ids: string[] = JSON.parse(get(entryEpisodeIdsAtom))
    return Effect.flatMap(DataLayer, (data) => data.entryEpisodes(ids))
  })
  .pipe(Atom.withReactivity([catalogueKey]))

export const subscriptionsAtom = runtime
  .atom((get) => {
    get(stateAtom)
    return Effect.flatMap(DataLayer, (data) => data.subscriptions)
  })
  .pipe(Atom.withReactivity([catalogueKey]))

/** One Subscription, with its overrides, for its settings screen. */
export const subscriptionAtom = Atom.family((subscriptionId: string) =>
  runtime
    .atom((get) => {
      get(stateAtom)
      return Effect.flatMap(DataLayer, (data) => data.subscription(subscriptionId))
    })
    .pipe(Atom.withReactivity([catalogueKey]))
)

export const activePlaylist = (state: State.State) =>
  state.playlists.find((p) => p.id === state.activePlaylistId) ?? state.playlists[0]

/** The Episodes a View matches right now, in its order. */
export const viewEpisodesAtom = Atom.family((viewId: string) =>
  runtime
    .atom((get) => {
      const state = get(stateAtom)
      return Effect.flatMap(DataLayer, (data) =>
        AsyncResult.isSuccess(state) ? data.viewEpisodes(viewId) : Effect.succeed([])
      )
    })
    .pipe(Atom.withReactivity([catalogueKey]))
)

/** Unsaved Search, keyed by the JSON of `{ filter, sort, limit }`. */
export const filterEpisodesAtom = Atom.family((key: string) =>
  runtime
    .atom((get) => {
      get(stateAtom)
      const input = JSON.parse(key) as ViewQuery.ViewQueryInput
      return Effect.flatMap(DataLayer, (data) => data.filterEpisodes(input))
    })
    .pipe(Atom.withReactivity([catalogueKey]))
)

/** How many Episodes each View matches, including its limit. */
export const viewCountsAtom = runtime
  .atom((get) => {
    const state = get(stateAtom)
    return Effect.flatMap(DataLayer, (data) =>
      AsyncResult.isSuccess(state) ? data.viewCounts : Effect.succeed(new Map<string, number>())
    )
  })
  .pipe(Atom.withReactivity([catalogueKey]))

export const episodeDetailAtom = Atom.family((episodeId: string) =>
  runtime
    .atom(Effect.flatMap(DataLayer, (data) => data.episodeDetail(episodeId)))
    // Hover/focus warms this same atom. Keep it briefly after leaving the row so the
    // panel reuses the pending request or result, without retaining the whole Library.
    .pipe(Atom.withReactivity([catalogueKey]), Atom.setIdleTTL("30 seconds"))
)

/** Stats include stored Episodes and names of former Subscriptions. */
export const statsCatalogueAtom = runtime
  .atom(Effect.flatMap(DataLayer, (data) => data.statsCatalogue))
  .pipe(Atom.withReactivity([catalogueKey]))
