import { Device, Library, PlaybackSettings, Playlist, State, View } from "@podlist/domain"
import { Effect } from "effect"

// The worker validates the snapshot once. Structured clone keeps its fields and
// drops the prototypes that Effect Schema needs for later document encoding.
export const restoreStateClasses = (state: State.State) =>
  Effect.gen(function* () {
    let visited = 0
    const restore = (value: object, prototype: object) =>
      Effect.gen(function* () {
        Object.setPrototypeOf(value, prototype)
        if (++visited % 256 === 0) yield* Effect.yieldNow
      })
    const restorePlaylist = (playlist: Playlist.Playlist) =>
      Effect.gen(function* () {
        yield* restore(playlist, Playlist.Playlist.prototype)
        for (const entry of playlist.entries) yield* restore(entry, Playlist.Entry.prototype)
        for (const item of playlist.history) yield* restore(item, Playlist.HistoryItem.prototype)
        for (const point of playlist.timeline)
          yield* restore(point, Playlist.TimelinePoint.prototype)
        for (const edit of playlist.edits ?? [])
          yield* restore(edit, Playlist.PlaylistEdit.prototype)
      })
    yield* restore(state, State.State.prototype)
    yield* restore(state.playbackSettings, PlaybackSettings.PlaybackSettings.prototype)
    for (const playlist of state.playlists) yield* restorePlaylist(playlist)
    for (const trashed of State.trashOf(state)) {
      yield* restore(trashed, State.TrashedPlaylist.prototype)
      yield* restorePlaylist(trashed.playlist)
    }
    for (const view of state.views) yield* restore(view, View.View.prototype)
    for (const rule of state.downloadRules) yield* restore(rule, Device.DownloadRule.prototype)
    for (const episode of Object.values(state.episodeStates)) {
      yield* restore(episode, Library.EpisodeState.prototype)
      if (episode.played !== null) yield* restore(episode.played, Library.Played.prototype)
    }
    return state
  })
