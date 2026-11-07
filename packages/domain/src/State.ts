import { Schema } from "effect"
import { DownloadRule } from "./Device.ts"
import type { EpisodeId, PlaylistId } from "./Ids.ts"
import { EpisodeState, Played } from "./Library.ts"
import type { Change, Operation } from "./Operation.ts"
import { PlaybackSettings } from "./PlaybackSettings.ts"
import * as PlayedRules from "./PlayedRules.ts"
import { DefaultPlaylistId, Entry, Playlist } from "./Playlist.ts"
import * as PlaylistRules from "./PlaylistRules.ts"
import * as TimelineRules from "./TimelineRules.ts"
import { EpochMillis, PositiveInt, Seconds } from "./Units.ts"
import { View } from "./View.ts"

/** Everything a user owns that operations change. The Library catalogue is separate. */
/** A deleted Playlist, kept with its History and Listening Timeline (CONTEXT.md › Trash). */
export class TrashedPlaylist extends Schema.Class<TrashedPlaylist>(
  "@podlist/domain/TrashedPlaylist"
)({
  playlist: Playlist,
  deletedAt: EpochMillis
}) {}

export class State extends Schema.Class<State>("@podlist/domain/State")({
  playlists: Schema.Array(Playlist),
  activePlaylistId: Schema.String,
  /** Only Episodes with a non-default state (Played or Starred) appear here. */
  episodeStates: Schema.Record(Schema.String, EpisodeState),
  views: Schema.Array(View),
  downloadRules: Schema.Array(DownloadRule),
  playbackSettings: PlaybackSettings,
  /** Deleted Playlists, oldest first; absent when empty (states from before the Trash). */
  trash: Schema.optionalKey(Schema.Array(TrashedPlaylist)),
  /** How many days the Trash keeps a Playlist; absent means 30. */
  trashDays: Schema.optionalKey(PositiveInt)
}) {}

export const defaultTrashDays = 30
const day = 86_400_000

export const trashOf = (state: State): ReadonlyArray<TrashedPlaylist> => state.trash ?? []
export const trashDaysOf = (state: State): number => state.trashDays ?? defaultTrashDays

/** Lets go of Playlists kept longer than the Trash keeps them. */
const purgeTrash = (state: State, at: EpochMillis): State => {
  const trash = trashOf(state)
  const cutoff = at - trashDaysOf(state) * day
  const kept = trash.filter((t) => t.deletedAt >= cutoff)
  return kept.length === trash.length ? state : new State({ ...state, trash: kept })
}

export const initial = (playbackSettings: PlaybackSettings): State =>
  new State({
    playlists: [
      new Playlist({
        id: DefaultPlaylistId,
        name: "Default",
        isDefault: true,
        clearOnPlayed: true,
        entries: [],
        cursor: null,
        history: [],
        timeline: []
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

/** Sets an Episode's state, dropping the record when it is back to the default. */
const setEpisodeState = (
  state: State,
  episodeId: EpisodeId,
  patch: { readonly played?: Played | null; readonly starred?: boolean }
): Record<string, EpisodeState> => {
  const current = state.episodeStates[episodeId]
  const played = patch.played === undefined ? (current?.played ?? null) : patch.played
  const starred = patch.starred ?? current?.starred ?? false
  const { [episodeId]: _, ...rest } = state.episodeStates
  if (played === null && !starred) return rest
  return { ...rest, [episodeId]: new EpisodeState({ episodeId, played, starred }) }
}

const replace = (state: State, patch: Partial<ConstructorParameters<typeof State>[0]>) =>
  new State({ ...state, ...patch })

/**
 * Applies one change. A change whose target no longer exists, or that would break
 * an invariant (renaming or deleting the Default Playlist), leaves the state as it is.
 */
export const apply = (state: State, change: Change, context: Context): State =>
  purgeTrash(applyChange(state, change, context), context.at)

const applyChange = (state: State, change: Change, context: Context): State => {
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
            cursor: null,
            history: [],
            timeline: []
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
          state.activePlaylistId === change.playlistId ? DefaultPlaylistId : state.activePlaylistId,
        trash: [
          ...trashOf(state).filter((t) => t.playlist.id !== change.playlistId),
          new TrashedPlaylist({ playlist, deletedAt: context.at })
        ]
      })
    }
    case "RestorePlaylist": {
      const trashed = trashOf(state).find((t) => t.playlist.id === change.playlistId)
      const expired =
        trashed === undefined || trashed.deletedAt < context.at - trashDaysOf(state) * day
      if (expired || findPlaylist(state, change.playlistId) !== undefined) return state
      return replace(state, {
        playlists: [...state.playlists, trashed.playlist],
        trash: trashOf(state).filter((t) => t !== trashed)
      })
    }
    case "SetTrashDays":
      return replace(state, { trashDays: change.days })
    case "SetActivePlaylist":
      if (findPlaylist(state, change.playlistId) === undefined) return state
      return replace(state, { activePlaylistId: change.playlistId })
    case "SetStar":
      return replace(state, {
        episodeStates: setEpisodeState(state, change.episodeId, { starred: change.starred })
      })
    case "MarkPlayed": {
      const played = new Played({ at: context.at, source: change.source })
      const source = change.source
      return replace(state, {
        episodeStates: setEpisodeState(state, change.episodeId, { played }),
        playlists: state.playlists.map((p) =>
          PlayedRules.onPlayed(
            p,
            change.episodeId,
            source._tag === "Playback" && source.playlistId === p.id,
            context.at
          )
        )
      })
    }
    case "MarkUnplayed":
      return replace(state, {
        episodeStates: setEpisodeState(state, change.episodeId, { played: null })
      })
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
    case "ReportPosition":
      return withPlaylist(state, change.playlistId, (p) => {
        const entry = p.entries.find((e) => e.episodeId === change.episodeId)
        // The latest listen wins: a report older than what we have is stale (ADR 0003).
        if (entry === undefined) return p
        const recorded = TimelineRules.record(
          p,
          change.episodeId,
          change.position,
          change.listenedAt
        )
        if (change.listenedAt < entry.positionAt) return recorded
        return new Playlist({
          ...recorded,
          entries: recorded.entries.map((e) =>
            e === entry
              ? new Entry({ ...e, position: change.position, positionAt: change.listenedAt })
              : e
          )
        })
      })
    case "Rewind":
      return rewind(state, change.playlistId, change.to, context.at)
    // Both need the Library catalogue (which Episodes a Subscription has, and the
    // Subscription record itself), so the server applies them to its own tables.
    case "MarkSubscriptionPlayed":
    case "SetSubscriptionOverrides":
      return state
  }
}

/**
 * Rewind a Playlist to a moment on its Listening Timeline (ADR 0006). Undoes only what
 * this Playlist's playback did since then: Episodes it finished become unplayed again
 * and, if Clear on Played removed them, return in the order they finished, just before
 * the current Entry. The Cursor and Position go back to the moment. Deliberate edits
 * (adds, reorders, Episodes marked Played by hand) are kept.
 */
const rewind = (state: State, playlistId: PlaylistId, to: EpochMillis, at: EpochMillis): State => {
  const playlist = findPlaylist(state, playlistId)
  const point = playlist === undefined ? undefined : TimelineRules.pointAt(playlist, to)
  if (playlist === undefined || point === undefined) return state

  const finished = playlist.history.filter((h) => h.finishedAt > to).reverse()
  let episodeStates = state.episodeStates
  for (const { episodeId } of finished) {
    const played = episodeStates[episodeId]?.played
    const byThisPlayback =
      played?.source._tag === "Playback" && played.source.playlistId === playlistId
    if (played && byThisPlayback && played.at > to) {
      episodeStates = setEpisodeState(new State({ ...state, episodeStates }), episodeId, {
        played: null
      })
    }
  }

  const present = new Set(playlist.entries.map((e) => e.episodeId))
  const restored = [...new Set([...finished.map((h) => h.episodeId), point.episodeId])].filter(
    (id) => !present.has(id)
  )
  const cursorIndex =
    playlist.cursor === null
      ? -1
      : playlist.entries.findIndex((e) => e.episodeId === playlist.cursor)
  const insertAt = cursorIndex === -1 ? playlist.entries.length : cursorIndex
  const restoredEntries = restored.map(
    (episodeId) => new Entry({ episodeId, position: Seconds.make(0), positionAt: at })
  )
  const entries = [
    ...playlist.entries.slice(0, insertAt),
    ...restoredEntries,
    ...playlist.entries.slice(insertAt)
  ].map((e) =>
    e.episodeId === point.episodeId
      ? new Entry({ ...e, position: point.position, positionAt: at })
      : e
  )

  return replace(state, {
    episodeStates,
    playlists: state.playlists.map((p) =>
      p.id === playlistId
        ? new Playlist({
            ...playlist,
            entries,
            cursor: point.episodeId,
            history: playlist.history.filter((h) => h.finishedAt <= to)
          })
        : p
    )
  })
}

/** The result of replaying operations: the new state and every operation id applied so far. */
export interface Replayed {
  readonly state: State
  readonly applied: ReadonlySet<string>
}

/**
 * Replays operations in order, skipping any whose id was already applied, so the same
 * operation delivered twice (a retry after a dropped connection) takes effect once.
 * Each change uses its own recording time.
 */
export const applyOperations = (
  state: State,
  operations: Iterable<Operation>,
  applied: ReadonlySet<string> = new Set()
): Replayed => {
  const seen = new Set(applied)
  let current = state
  for (const operation of operations) {
    if (seen.has(operation.id)) continue
    current = apply(current, operation.change, { at: operation.recordedAt })
    seen.add(operation.id)
  }
  return { state: current, applied: seen }
}
