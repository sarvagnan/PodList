import { Operation, type State } from "@podlist/domain"
import { Schema } from "effect"

// What can be done to an Episode from a list, and how to take it back. Each action
// records its operations and answers with a confirmation and the operations that undo
// it, worked out from the State just before the change.

export type EpisodeAction =
  | {
      readonly _tag: "Add"
      readonly episodeId: string
      readonly playlistId: string
      readonly placement: "next" | "last"
    }
  | { readonly _tag: "PlayNow"; readonly episodeId: string }
  | { readonly _tag: "Star"; readonly episodeId: string; readonly starred: boolean }
  | { readonly _tag: "Played"; readonly episodeId: string; readonly played: boolean }

export interface Outcome {
  readonly message: string
  readonly undo: ReadonlyArray<Operation.Change>
}

const change = Schema.decodeUnknownSync(Operation.Change)

/** Puts the Episode back where it was in each Playlist, Position and Cursor included. */
const restoreEntries = (before: State.State, after: State.State, episodeId: string, at: number) =>
  before.playlists.flatMap((p) => {
    const index = p.entries.findIndex((e) => e.episodeId === episodeId)
    const entry = p.entries[index]
    if (entry === undefined) return []
    const now = after.playlists.find((q) => q.id === p.id)
    const nowIndex = now?.entries.findIndex((e) => e.episodeId === episodeId) ?? -1
    const previous = p.entries[index - 1]?.episodeId ?? null
    const unchanged =
      nowIndex !== -1 &&
      (now?.entries[nowIndex - 1]?.episodeId ?? null) === previous &&
      now?.entries[nowIndex]?.position === entry.position &&
      (now?.cursor === episodeId) === (p.cursor === episodeId)
    if (unchanged) return []
    return [
      ...(nowIndex === -1
        ? [change({ _tag: "AddEntry", playlistId: p.id, episodeId, placement: "last" })]
        : []),
      change({ _tag: "MoveEntry", playlistId: p.id, episodeId, after: previous }),
      ...(entry.position > 0
        ? [
            change({
              _tag: "ReportPosition",
              playlistId: p.id,
              episodeId,
              position: entry.position,
              listenedAt: at
            })
          ]
        : []),
      ...(p.cursor === episodeId
        ? [change({ _tag: "SetCursor", playlistId: p.id, episodeId })]
        : [])
    ]
  })

/** The operations that take an action back, given the State before and after it. */
export const undoFor = (
  action: EpisodeAction,
  before: State.State,
  after: State.State,
  at: number
): ReadonlyArray<Operation.Change> => {
  switch (action._tag) {
    case "Add": {
      const playlist = before.playlists.find((p) => p.id === action.playlistId)
      const wasThere = playlist?.entries.some((e) => e.episodeId === action.episodeId) ?? false
      if (!wasThere) {
        return [
          change({
            _tag: "RemoveEntry",
            playlistId: action.playlistId,
            episodeId: action.episodeId
          })
        ]
      }
      return restoreEntries(before, after, action.episodeId, at)
    }
    case "Star":
      return [change({ _tag: "SetStar", episodeId: action.episodeId, starred: !action.starred })]
    case "Played":
      return action.played
        ? [
            change({ _tag: "MarkUnplayed", episodeId: action.episodeId }),
            // Clear on Played took it out of Playlists: put it back as it was.
            ...restoreEntries(before, after, action.episodeId, at)
          ]
        : [
            change({
              _tag: "MarkPlayed",
              episodeId: action.episodeId,
              source: before.episodeStates[action.episodeId]?.played?.source ?? { _tag: "User" }
            })
          ]
    case "PlayNow":
      return []
  }
}

export const confirmation = (action: EpisodeAction, state: State.State) => {
  const name = (id: string) => state.playlists.find((p) => p.id === id)?.name ?? "Playlist"
  switch (action._tag) {
    case "Add":
      return `${action.placement === "next" ? "Playing next" : "Added last"} in ${name(action.playlistId)}`
    case "PlayNow":
      return `Playing in ${name(state.activePlaylistId)}`
    case "Star":
      return action.starred ? "Starred" : "Unstarred"
    case "Played":
      return action.played ? "Marked Played" : "Marked Unplayed"
  }
}

export const changesFor = (action: EpisodeAction, state: State.State) => {
  switch (action._tag) {
    case "Add":
      return [
        change({
          _tag: "AddEntry",
          playlistId: action.playlistId,
          episodeId: action.episodeId,
          placement: action.placement
        })
      ]
    case "PlayNow":
      return [
        change({
          _tag: "AddEntry",
          playlistId: state.activePlaylistId,
          episodeId: action.episodeId,
          placement: "now"
        })
      ]
    case "Star":
      return [change({ _tag: "SetStar", episodeId: action.episodeId, starred: action.starred })]
    case "Played":
      return [
        action.played
          ? change({ _tag: "MarkPlayed", episodeId: action.episodeId, source: { _tag: "User" } })
          : change({ _tag: "MarkUnplayed", episodeId: action.episodeId })
      ]
  }
}
