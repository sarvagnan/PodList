import type { EpisodeId } from "./Ids.ts"
import { Entry, Playlist } from "./Playlist.ts"
import { type EpochMillis, Seconds } from "./Units.ts"

// Pure rules over a single Playlist. Each returns the Playlist unchanged when the
// change no longer makes sense (its target is gone): operations are dropped, not
// errors (ADR 0003).

export type Placement = "now" | "next" | "last"

const indexOf = (entries: ReadonlyArray<Entry>, episodeId: EpisodeId) =>
  entries.findIndex((e) => e.episodeId === episodeId)

const without = (entries: ReadonlyArray<Entry>, episodeId: EpisodeId) =>
  entries.filter((e) => e.episodeId !== episodeId)

const insertAt = (entries: ReadonlyArray<Entry>, index: number, entry: Entry) => [
  ...entries.slice(0, index),
  entry,
  ...entries.slice(index)
]

const update = (playlist: Playlist, entries: ReadonlyArray<Entry>, cursor: EpisodeId | null) =>
  new Playlist({ ...playlist, entries, cursor })

/**
 * Play Now / Play Next / Play Last. An Episode already in the Playlist is moved and
 * keeps its Position.
 *
 * - now: goes just before the Cursor and becomes current; the previous current Entry
 *   comes next.
 * - next: goes just after the Cursor.
 * - last: goes to the end.
 *
 * When the Cursor has run past the end (or the Playlist is empty), the added Entry
 * becomes current, so it is what plays next.
 */
export const addEntry = (
  playlist: Playlist,
  episodeId: EpisodeId,
  placement: Placement,
  at: EpochMillis
): Playlist => {
  const oldIndex = indexOf(playlist.entries, episodeId)
  if (placement === "now" && playlist.cursor === episodeId) return playlist

  const entry =
    playlist.entries[oldIndex] ??
    new Entry({ episodeId, position: Seconds.make(0), positionAt: at })
  let cursor = playlist.cursor
  if (cursor === episodeId) {
    // Moving the current Entry away: whatever followed it becomes current.
    cursor = playlist.entries[oldIndex + 1]?.episodeId ?? null
  }
  const rest = without(playlist.entries, episodeId)
  const cursorIndex = cursor === null ? -1 : indexOf(rest, cursor)

  if (cursorIndex === -1) return update(playlist, [...rest, entry], episodeId)
  switch (placement) {
    case "now":
      return update(playlist, insertAt(rest, cursorIndex, entry), episodeId)
    case "next":
      return update(playlist, insertAt(rest, cursorIndex + 1, entry), cursor)
    case "last":
      return update(playlist, [...rest, entry], cursor)
  }
}

/** Reorder: place the Entry directly after `after`, or first when `after` is null. */
export const moveEntry = (
  playlist: Playlist,
  episodeId: EpisodeId,
  after: EpisodeId | null
): Playlist => {
  const oldIndex = indexOf(playlist.entries, episodeId)
  const entry = playlist.entries[oldIndex]
  if (entry === undefined || after === episodeId) return playlist
  const rest = without(playlist.entries, episodeId)
  if (after === null) return update(playlist, [entry, ...rest], playlist.cursor)
  const afterIndex = indexOf(rest, after)
  if (afterIndex === -1) return playlist
  return update(playlist, insertAt(rest, afterIndex + 1, entry), playlist.cursor)
}

/** Removing the current Entry makes the following Entry current. */
export const removeEntry = (playlist: Playlist, episodeId: EpisodeId): Playlist => {
  const index = indexOf(playlist.entries, episodeId)
  if (index === -1) return playlist
  const cursor =
    playlist.cursor === episodeId
      ? (playlist.entries[index + 1]?.episodeId ?? null)
      : playlist.cursor
  return update(playlist, without(playlist.entries, episodeId), cursor)
}

export const setCursor = (playlist: Playlist, episodeId: EpisodeId | null): Playlist => {
  if (episodeId !== null && indexOf(playlist.entries, episodeId) === -1) return playlist
  return update(playlist, playlist.entries, episodeId)
}
