import type { State, ViewQuery } from "@podlist/domain"
import { Effect, Stream } from "effect"
import { AsyncResult, Atom } from "effect/reactivity"
import { localClient } from "#client"
import {
  catalogueKey,
  DataLayer,
  entryMembershipKey,
  episodeFactsKey,
  playedKey,
  progressMembershipKey
} from "../data/DataLayer.ts"
import { downloadsAtom, runtime, stateAtom } from "./runtime.ts"

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
    if (!localClient) get(stateAtom)
    return Effect.flatMap(DataLayer, (data) => data.subscriptions)
  })
  .pipe(Atom.withReactivity(localClient ? [catalogueKey, playedKey] : [catalogueKey]))

/** One Subscription, with its overrides, for its settings screen. */
export const subscriptionAtom = Atom.family((subscriptionId: string) =>
  runtime
    .atom((get) => {
      if (!localClient) get(stateAtom)
      return Effect.flatMap(DataLayer, (data) => data.subscription(subscriptionId))
    })
    .pipe(Atom.withReactivity(localClient ? [catalogueKey, playedKey] : [catalogueKey]))
)

export const activePlaylist = (state: State.State) =>
  state.playlists.find((p) => p.id === state.activePlaylistId) ?? state.playlists[0]

const viewAtom = Atom.family((id: string) =>
  Atom.make((get) =>
    AsyncResult.getOrElse(get(stateAtom), () => null)?.views.find((v) => v.id === id)
  )
)
const viewsAtom = Atom.make((get) => AsyncResult.getOrElse(get(stateAtom), () => null)?.views)

// Every query includes orphaned Entries and reports Played and Starred facts.
// Only in-progress membership depends on the Position crossing zero.
const libraryRows = localClient
  ? [catalogueKey, entryMembershipKey, episodeFactsKey]
  : [catalogueKey]
const progressRevision = runtime
  .atom(Effect.flatMap(DataLayer, () => Effect.sync(() => ({}))))
  .pipe(Atom.withReactivity([progressMembershipKey]))

// Relative Views can change even when the Library does not. This clock is
// mounted only while a reader needs one of those date windows.
const relativeDateRevision = runtime.atom(Stream.tick("15 seconds").pipe(Stream.drop(1)))

/** The Episodes a View matches right now, in its order. */
export const viewEpisodesAtom = Atom.family((viewId: string) =>
  runtime
    .atom((get) => {
      if (localClient) {
        const view = get(viewAtom(viewId))
        if (view?.filter.played === "inProgress") get(progressRevision)
        if (view?.filter.published?._tag === "LastDays") get(relativeDateRevision)
        return view
          ? Effect.flatMap(DataLayer, (data) => data.viewEpisodes(viewId))
          : Effect.succeed([])
      }
      const state = get(stateAtom)
      return Effect.flatMap(DataLayer, (data) =>
        AsyncResult.isSuccess(state) ? data.viewEpisodes(viewId) : Effect.succeed([])
      )
    })
    .pipe(Atom.withReactivity(libraryRows))
)

/** Unsaved Search, keyed by the JSON of `{ filter, sort, limit }`. */
export const filterEpisodesAtom = Atom.family((key: string) => {
  const input = JSON.parse(key) as ViewQuery.ViewQueryInput
  return runtime
    .atom((get) => {
      if (!localClient) get(stateAtom)
      if (localClient && input.filter.played === "inProgress") get(progressRevision)
      if (localClient && input.filter.published?._tag === "LastDays") get(relativeDateRevision)
      return Effect.flatMap(DataLayer, (data) => data.filterEpisodes(input))
    })
    .pipe(Atom.withReactivity(libraryRows))
})

/** How many Episodes each View matches, including its limit. */
export const viewCountsAtom = runtime
  .atom((get) => {
    if (localClient) {
      const views = get(viewsAtom)
      if (views?.some((view) => view.filter.played === "inProgress")) get(progressRevision)
      if (views?.some((view) => view.filter.published?._tag === "LastDays"))
        get(relativeDateRevision)
      return views
        ? Effect.flatMap(DataLayer, (data) => data.viewCounts)
        : Effect.succeed(new Map<string, number>())
    }
    const state = get(stateAtom)
    return Effect.flatMap(DataLayer, (data) =>
      AsyncResult.isSuccess(state) ? data.viewCounts : Effect.succeed(new Map<string, number>())
    )
  })
  .pipe(Atom.withReactivity(libraryRows))

const episodeStoredAtom = Atom.family((episodeId: string) =>
  Atom.make(
    (get) =>
      AsyncResult.getOrElse(get(downloadsAtom), () => undefined)?.get(episodeId)?._tag === "Stored"
  )
)

export const episodeDetailAtom = Atom.family((episodeId: string) =>
  runtime
    .atom((get) => {
      // Existing inspector results may predate the download. Progress alone is not a change.
      if (localClient) get(episodeStoredAtom(episodeId))
      return Effect.flatMap(DataLayer, (data) => data.episodeDetail(episodeId))
    })
    // Hover/focus warms this same atom. Keep it briefly after leaving the row so the
    // panel reuses the pending request or result, without retaining the whole Library.
    .pipe(Atom.withReactivity([catalogueKey]), Atom.setIdleTTL("30 seconds"))
)

/** Stats include stored Episodes and names of former Subscriptions. */
export const statsCatalogueAtom = runtime
  .atom(Effect.flatMap(DataLayer, (data) => data.statsCatalogue))
  .pipe(Atom.withReactivity([catalogueKey]))

/** A contextual filter intersects its result with the list, retaining order and View limit. */
export const contextualEpisodesAtom = Atom.family((text: string) =>
  runtime
    .atom(
      text
        ? Effect.flatMap(DataLayer, (data) =>
            data
              .filterEpisodes({ filter: { text }, limit: null, sort: "publishedDesc" })
              .pipe(Effect.map((rows) => new Set(rows.map((row) => row.id))))
          )
        : Effect.succeed(new Set<string>())
    )
    .pipe(Atom.withReactivity([catalogueKey]), Atom.setIdleTTL("10 seconds"))
)
