import { Operation } from "@podlist/domain"
import { Effect, Schema, SubscriptionRef } from "effect"
import { type ObjectValue, validate } from "../../../desktop/src/automation/handler.ts"
import { DataLayer } from "../data/DataLayer.ts"
import { changesFor, type EpisodeAction, type Outcome, undoFor } from "../lib/episodeActions.ts"
import { Playback } from "../playback/Playback.ts"

const change = Schema.decodeUnknownSync(Operation.Change)
export interface ActionResult {
  readonly value: ObjectValue
  readonly outcome?: Outcome
}

/** The renderer owns the live local DataLayer, player and shared UI Undo history. */
export const perform = (
  name: string,
  args: ObjectValue
): Effect.Effect<ActionResult, unknown, DataLayer | Playback> =>
  Effect.gen(function* () {
    validate(name, args)
    const data = yield* DataLayer
    const player = yield* Playback
    const status = yield* SubscriptionRef.get(data.status)
    if (!status.ready) throw new Error("Open PodList and connect to a Library first.")
    const state = yield* SubscriptionRef.get(data.state)
    const page = (key: string, values: unknown[]) => {
      const offset = Number(args.offset ?? 0),
        limit = Number(args.limit ?? 100)
      return {
        value: {
          [key]: values.slice(offset, offset + limit),
          total: values.length,
          offset,
          has_more: offset + limit < values.length
        }
      }
    }
    const nowPlaying = (checkError = false) =>
      Effect.gen(function* () {
        const now = yield* SubscriptionRef.get(player.now)
        const latest = yield* SubscriptionRef.get(data.state)
        if (checkError && now?.error) throw new Error(now.error)
        return {
          value: {
            episode_id: now?.episodeId ?? null,
            title: now?.title ?? null,
            podcast: now?.podcast ?? null,
            position: now?.position ?? null,
            playing: now?.playing === true,
            active_playlist: {
              id: latest.activePlaylistId,
              name: latest.playlists.find((p) => p.id === latest.activePlaylistId)?.name ?? null
            }
          }
        }
      })
    const playlist = (id: unknown = state.activePlaylistId) => {
      const found = state.playlists.find((p) => p.id === id)
      if (!found) throw new Error("Playlist unavailable. List Playlists again.")
      return found
    }
    const episode = (
      row: { id: string; title: string; podcast: string },
      position: number | null = null
    ) => ({
      id: row.id,
      title: row.title,
      podcast: row.podcast,
      position:
        position ??
        state.playlists
          .flatMap((p) => p.entries)
          .filter((e) => e.episodeId === row.id)
          .reduce<number | null>((max, e) => Math.max(max ?? 0, e.position), null),
      starred: state.episodeStates[row.id]?.starred === true,
      played: state.episodeStates[row.id]?.played != null
    })
    switch (name) {
      case "list_views": {
        const counts = yield* data.viewCounts
        return page(
          "views",
          state.views.map((v) => ({ id: v.id, name: v.name, count: counts.get(v.id) ?? 0 }))
        )
      }
      case "list_playlists":
        return page(
          "playlists",
          state.playlists.map((p) => ({
            id: p.id,
            name: p.name,
            count: p.entries.length,
            active: p.id === state.activePlaylistId
          }))
        )
      case "list_episodes":
        if ((args.view_id === undefined) === (args.playlist_id === undefined))
          throw new Error("Supply exactly one of view_id or playlist_id.")
        if (args.playlist_id !== undefined) {
          const entries = playlist(args.playlist_id).entries
          const rows = yield* data.entryEpisodes(entries.map((e) => e.episodeId))
          return page(
            "episodes",
            entries.map((e) =>
              episode(
                rows.get(e.episodeId) ?? {
                  id: e.episodeId,
                  title: "Episode details pending sync",
                  podcast: "Podcast details pending sync"
                },
                e.position
              )
            )
          )
        }
        if (!state.views.some((v) => v.id === args.view_id))
          throw new Error("View unavailable. List Views again.")
        return page(
          "episodes",
          (yield* data.viewEpisodes(String(args.view_id))).map((r) => episode(r))
        )
      case "search_episodes":
        return page(
          "episodes",
          (yield* data.filterEpisodes({
            filter: { text: String(args.text) },
            sort: "publishedDesc",
            limit: null
          })).map((r) => episode(r))
        )
      case "now_playing":
        return yield* nowPlaying()
      case "play":
      case "pause":
      case "toggle":
      case "skip_back":
      case "skip_forward": {
        if (name !== "pause" && (yield* SubscriptionRef.get(player.now)) === null)
          throw new Error("The Active Playlist has no current Episode.")
        if (name === "play") yield* player.play
        else if (name === "pause") yield* player.pause
        else if (name === "toggle") yield* player.toggle
        else yield* player.skip(name === "skip_back" ? -15 : 30)
        return yield* nowPlaying(true)
      }
    }
    let ids: string[]
    if (name === "play_episode") ids = [String(args.episode_id)]
    else if (name === "add_current") {
      const now = yield* SubscriptionRef.get(player.now)
      if (!now) throw new Error("There is no current Episode.")
      ids = [now.episodeId]
    } else ids = args.episode_ids as string[]
    const known = yield* data.entryEpisodes(ids)
    if (
      !ids.every(
        (id) =>
          known.has(id) || state.playlists.some((p) => p.entries.some((e) => e.episodeId === id))
      )
    )
      throw new Error("An Episode is unavailable. Search or list Episodes again.")
    const target = playlist(args.playlist_id ?? state.activePlaylistId)
    const adding = ["play_episode", "add_episodes", "add_current"].includes(name)
    const title = adding
      ? name === "play_episode"
        ? "Play Now"
        : args.placement === "next"
          ? "Play Next"
          : "Play Last"
      : name === "set_starred"
        ? args.starred
          ? "Star"
          : "Unstar"
        : args.played
          ? "Mark Played"
          : "Mark Unplayed"
    const undo: Operation.Change[][] = []
    // Repeated Next inserts at the Cursor. Reverse iteration retains the supplied order.
    const unique = [...new Set(ids)]
    const ordered =
      name !== "play_episode" && args.placement === "next"
        ? target.entries.some((e) => e.episodeId === target.cursor)
          ? [...unique].reverse()
          : [...unique.slice(0, 1), ...unique.slice(1).reverse()]
        : unique
    for (const id of ordered) {
      const before = yield* SubscriptionRef.get(data.state)
      const action: EpisodeAction =
        name === "play_episode"
          ? { _tag: "PlayNow", episodeId: id }
          : adding
            ? {
                _tag: "Add",
                episodeId: id,
                playlistId: target.id,
                placement: args.placement === "next" ? "next" : "last"
              }
            : name === "set_starred"
              ? { _tag: "Star", episodeId: id, starred: args.starred === true }
              : { _tag: "Played", episodeId: id, played: args.played === true }
      for (const c of changesFor(action, before)) yield* data.record(c)
      const after = yield* SubscriptionRef.get(data.state)
      undo.unshift([...undoFor(action, before, after, Date.now())])
    }
    if (adding) {
      // Moving the current Entry can shift the insertion anchor. Match the Mac's
      // final selected block order, including when the Cursor is selected.
      const current = (yield* SubscriptionRef.get(data.state)).playlists.find(
        (p) => p.id === target.id
      )
      if (
        current &&
        current.entries
          .filter((e) => unique.includes(e.episodeId))
          .map((e) => e.episodeId)
          .join("\0") !== unique.join("\0")
      ) {
        const first = current.entries.findIndex((e) => unique.includes(e.episodeId))
        let anchor: string | null = current.entries[first - 1]?.episodeId ?? null
        for (const id of unique) {
          yield* data.record(
            change({ _tag: "MoveEntry", playlistId: target.id, episodeId: id, after: anchor })
          )
          anchor = id
        }
      }
      // Restore the original Playlist as one named step, as on the Mac. All
      // inverses are normal operations and retain the shared Listening history.
      const inverse: Operation.Change[] = unique
        .filter((id) => !target.entries.some((e) => e.episodeId === id))
        .map((id) => change({ _tag: "RemoveEntry", playlistId: target.id, episodeId: id }))
      for (const [index, entry] of target.entries.entries())
        if (unique.includes(entry.episodeId))
          inverse.push(
            change({
              _tag: "MoveEntry",
              playlistId: target.id,
              episodeId: entry.episodeId,
              after: target.entries[index - 1]?.episodeId ?? null
            })
          )
      inverse.push(change({ _tag: "SetCursor", playlistId: target.id, episodeId: target.cursor }))
      undo.splice(0, undo.length, inverse)
    }
    // The cursor is restored by Undo; playback follows State through the existing controller.
    if (name === "play_episode") yield* player.playEntry(state.activePlaylistId, ids[0] as string)
    const value = adding
      ? { playlist_id: target.id, episode_ids: ids, undo: `Undo ${title}` }
      : { episode_ids: ids, undo: `Undo ${title}` }
    return { value, outcome: { message: title, undo: undo.flat().map((c) => change(c)) } }
  })
