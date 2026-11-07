import { Operation, type Playlist, State, Units } from "@podlist/domain"
import { Schema } from "effect"

// The Listening Timeline as people read it (docs/design/ui-layout.md › Rewind): stretches
// of listening and finished Episodes, newest first, each a moment to Rewind to; what a
// Rewind would change; and how to take one back.

export type TimelineEvent =
  | {
      readonly _tag: "Listened"
      readonly episodeId: string
      /** When the stretch began and ended, and the Positions at each end. */
      readonly start: number
      readonly end: number
      readonly from: number
      readonly to: number
    }
  | { readonly _tag: "Finished"; readonly episodeId: string; readonly at: number }
  | {
      /** One of the person's own edits (added, moved, removed, marked Played). */
      readonly _tag: "Edited"
      readonly kind: "added" | "moved" | "removed" | "markedPlayed"
      readonly episodeId: string
      readonly at: number
    }

/** Points of one Episode further apart than this start a new stretch. */
const gapMillis = 10 * 60_000

export const timelineEvents = (playlist: Playlist.Playlist): ReadonlyArray<TimelineEvent> => {
  const events: Array<TimelineEvent> = []
  let run: { episodeId: string; start: number; end: number; from: number; to: number } | null = null
  for (const point of playlist.timeline) {
    if (run !== null && run.episodeId === point.episodeId && point.at - run.end <= gapMillis) {
      run.end = point.at
      run.to = point.position
      continue
    }
    if (run !== null) events.push({ _tag: "Listened", ...run })
    run = {
      episodeId: point.episodeId,
      start: point.at,
      end: point.at,
      from: point.position,
      to: point.position
    }
  }
  if (run !== null) events.push({ _tag: "Listened", ...run })
  for (const h of playlist.history) {
    events.push({ _tag: "Finished", episodeId: h.episodeId, at: h.finishedAt })
  }
  // The same edit twice at one moment (one step that added and then moved) shows once.
  const seen = new Set<string>()
  for (const e of playlist.edits ?? []) {
    const key = `${e.kind}\u0000${e.episodeId}\u0000${e.at}`
    if (seen.has(key)) continue
    seen.add(key)
    events.push({ _tag: "Edited", kind: e.kind, episodeId: e.episodeId, at: e.at })
  }
  const time = (e: TimelineEvent) => (e._tag === "Listened" ? e.start : e.at)
  // Newest first; at one moment, what was recorded last comes first.
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => time(b.event) - time(a.event) || b.index - a.index)
    .map(({ event }) => event)
}

/** The moment a Rewind to this event returns to. */
export const momentOf = (event: TimelineEvent) =>
  event._tag === "Finished" ? event.at - 1 : event._tag === "Edited" ? event.at : event.start

const change = Schema.decodeUnknownSync(Operation.Change)

export const rewindChange = (playlistId: string, to: number) =>
  change({ _tag: "Rewind", playlistId, to })

export interface RewindPreview {
  readonly after: State.State
  /** Where playback returns to. */
  readonly cursor: string | null
  readonly position: number
  /** Episodes that become Unplayed again. */
  readonly unplayed: ReadonlyArray<string>
  /** Episodes whose Entries come back. */
  readonly restored: ReadonlyArray<string>
}

/** What a Rewind to `to` would do, without doing it. */
export const previewRewind = (
  state: State.State,
  playlistId: string,
  to: number,
  at: number
): RewindPreview | null => {
  const after = State.apply(state, rewindChange(playlistId, to), {
    at: Units.EpochMillis.make(at)
  })
  if (after === state) return null
  const before = state.playlists.find((p) => p.id === playlistId)
  const now = after.playlists.find((p) => p.id === playlistId)
  if (before === undefined || now === undefined) return null
  const had = new Set(before.entries.map((e) => e.episodeId))
  const cursor = now.cursor
  return {
    after,
    cursor,
    position: now.entries.find((e) => e.episodeId === cursor)?.position ?? 0,
    unplayed: Object.keys(state.episodeStates).filter(
      (id) => state.episodeStates[id]?.played != null && after.episodeStates[id]?.played == null
    ),
    restored: now.entries.map((e) => e.episodeId).filter((id) => !had.has(id))
  }
}

/** The operations that take a Rewind back: Played again, Entries out, Cursor and Positions. */
export const undoRewind = (
  before: State.State,
  after: State.State,
  playlistId: string,
  at: number
): ReadonlyArray<Operation.Change> => {
  const was = before.playlists.find((p) => p.id === playlistId)
  const now = after.playlists.find((p) => p.id === playlistId)
  if (was === undefined || now === undefined) return []
  const had = new Set(was.entries.map((e) => e.episodeId))
  const ops: Array<Operation.Change> = []
  for (const e of was.entries) {
    const moved = now.entries.find((n) => n.episodeId === e.episodeId)
    if (moved !== undefined && moved.position !== e.position) {
      ops.push(
        change({
          _tag: "ReportPosition",
          playlistId,
          episodeId: e.episodeId,
          position: e.position,
          listenedAt: at
        })
      )
    }
  }
  if (was.cursor !== null)
    ops.push(change({ _tag: "SetCursor", playlistId, episodeId: was.cursor }))
  for (const id of Object.keys(before.episodeStates)) {
    const played = before.episodeStates[id]?.played
    if (played != null && after.episodeStates[id]?.played == null) {
      ops.push(change({ _tag: "MarkPlayed", episodeId: id, source: played.source }))
    }
  }
  for (const e of now.entries) {
    if (!had.has(e.episodeId))
      ops.push(change({ _tag: "RemoveEntry", playlistId, episodeId: e.episodeId }))
  }
  return ops
}
