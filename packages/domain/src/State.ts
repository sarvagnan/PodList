import { Schema } from "effect"
import { DownloadRule } from "./Device.ts"
import type { PlaylistId } from "./Ids.ts"
import { EpisodeState } from "./Library.ts"
import type { Change } from "./Operation.ts"
import { PlaybackSettings } from "./PlaybackSettings.ts"
import { DefaultPlaylistId, Playlist } from "./Playlist.ts"
import * as PlaylistRules from "./PlaylistRules.ts"
import type { EpochMillis } from "./Units.ts"
import { View } from "./View.ts"

/** Everything a user owns that operations change. The Library catalogue is separate. */
export class State extends Schema.Class<State>("@podlist/domain/State")({
  playlists: Schema.Array(Playlist),
  activePlaylistId: Schema.String,
  /** Only Episodes with a non-default state (Played or Starred) appear here. */
  episodeStates: Schema.Record(Schema.String, EpisodeState),
  views: Schema.Array(View),
  downloadRules: Schema.Array(DownloadRule),
  playbackSettings: PlaybackSettings
}) {}

export const initial = (playbackSettings: PlaybackSettings): State =>
  new State({
    playlists: [
      new Playlist({
        id: DefaultPlaylistId,
        name: "Default",
        isDefault: true,
        clearOnPlayed: true,
        entries: [],
        cursor: null
      })
    ],
    activePlaylistId: DefaultPlaylistId,
    episodeStates: {},
    views: [],
    downloadRules: [],
    playbackSettings
  })

/** What `apply` needs besides the change itself. */
export interface Context {
  /** The operation's time, used for new Entries and Played facts. */
  readonly at: EpochMillis
}

const findPlaylist = (state: State, id: PlaylistId) => state.playlists.find((p) => p.id === id)

const withPlaylist = (state: State, id: PlaylistId, f: (p: Playlist) => Playlist): State => {
  const playlist = findPlaylist(state, id)
  if (playlist === undefined) return state
  const next = f(playlist)
  if (next === playlist) return state
  return new State({
    ...state,
    playlists: state.playlists.map((p) => (p.id === id ? next : p))
  })
}

const replace = (state: State, patch: Partial<ConstructorParameters<typeof State>[0]>) =>
  new State({ ...state, ...patch })

/**
 * Applies one change. A change whose target no longer exists, or that would break
 * an invariant (renaming or deleting the Default Playlist), leaves the state as it is.
 */
export const apply = (state: State, change: Change, context: Context): State => {
  switch (change._tag) {
    case "AddEntry":
      return withPlaylist(state, change.playlistId, (p) =>
        PlaylistRules.addEntry(p, change.episodeId, change.placement, context.at)
      )
    case "MoveEntry":
      return withPlaylist(state, change.playlistId, (p) =>
        PlaylistRules.moveEntry(p, change.episodeId, change.after)
      )
    case "RemoveEntry":
      return withPlaylist(state, change.playlistId, (p) =>
        PlaylistRules.removeEntry(p, change.episodeId)
      )
    case "SetCursor":
      return withPlaylist(state, change.playlistId, (p) =>
        PlaylistRules.setCursor(p, change.episodeId)
      )
    case "CreatePlaylist":
      if (findPlaylist(state, change.playlistId) !== undefined) return state
      return replace(state, {
        playlists: [
          ...state.playlists,
          new Playlist({
            id: change.playlistId,
            name: change.name,
            isDefault: false,
            clearOnPlayed: change.clearOnPlayed,
            entries: [],
            cursor: null
          })
        ]
      })
    case "RenamePlaylist":
      return withPlaylist(state, change.playlistId, (p) =>
        p.isDefault ? p : new Playlist({ ...p, name: change.name })
      )
    case "SetClearOnPlayed":
      return withPlaylist(
        state,
        change.playlistId,
        (p) => new Playlist({ ...p, clearOnPlayed: change.clearOnPlayed })
      )
    case "DeletePlaylist": {
      const playlist = findPlaylist(state, change.playlistId)
      if (playlist === undefined || playlist.isDefault) return state
      return replace(state, {
        playlists: state.playlists.filter((p) => p.id !== change.playlistId),
        activePlaylistId:
          state.activePlaylistId === change.playlistId ? DefaultPlaylistId : state.activePlaylistId
      })
    }
    case "SetActivePlaylist":
      if (findPlaylist(state, change.playlistId) === undefined) return state
      return replace(state, { activePlaylistId: change.playlistId })
    case "SetStar": {
      const current = state.episodeStates[change.episodeId]
      const next = new EpisodeState({
        episodeId: change.episodeId,
        played: current?.played ?? null,
        starred: change.starred
      })
      return replace(state, { episodeStates: { ...state.episodeStates, [change.episodeId]: next } })
    }
    case "SaveView":
      return replace(state, {
        views: state.views.some((v) => v.id === change.view.id)
          ? state.views.map((v) => (v.id === change.view.id ? change.view : v))
          : [...state.views, change.view]
      })
    case "DeleteView":
      return replace(state, { views: state.views.filter((v) => v.id !== change.viewId) })
    case "SetDownloadRule": {
      const same = (r: DownloadRule) =>
        r.subscriptionId === change.rule.subscriptionId && r.deviceId === change.rule.deviceId
      return replace(state, {
        downloadRules: [...state.downloadRules.filter((r) => !same(r)), change.rule]
      })
    }
    case "SetPlaybackSettings":
      return replace(state, { playbackSettings: change.settings })
    // Played and Clear on Played (pod-301.4), Position merging (pod-301.5) and Rewind
    // (pod-301.6) land with their own rules. Subscription overrides and marking a
    // whole Subscription Played need the Library catalogue and are applied server-side.
    case "ReportPosition":
    case "MarkPlayed":
    case "MarkUnplayed":
    case "MarkSubscriptionPlayed":
    case "Rewind":
    case "SetSubscriptionOverrides":
      return state
  }
}
