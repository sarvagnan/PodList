import { Operation, PlaybackSettings, State, Units } from "@podlist/domain"
import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { changesFor, type EpisodeAction, undoFor } from "./episodeActions.ts"

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})
const change = Schema.decodeUnknownSync(Operation.Change)
let clock = 1_000
const apply = (state: State.State, changes: ReadonlyArray<Operation.Change>) =>
  changes.reduce((s, c) => State.apply(s, c, { at: Units.EpochMillis.make(++clock) }), state)

/** Default [e1, e2, e3] with the Cursor on e2 at 5:00; Commute [e2]. */
const start = apply(State.initial(defaults), [
  ...["e1", "e2", "e3"].map((episodeId) =>
    change({ _tag: "AddEntry", playlistId: "default", episodeId, placement: "last" })
  ),
  change({ _tag: "SetCursor", playlistId: "default", episodeId: "e2" }),
  change({
    _tag: "ReportPosition",
    playlistId: "default",
    episodeId: "e2",
    position: 300,
    listenedAt: 500
  }),
  change({ _tag: "CreatePlaylist", playlistId: "commute", name: "Commute", clearOnPlayed: false }),
  change({ _tag: "AddEntry", playlistId: "commute", episodeId: "e2", placement: "last" })
])

/** Runs an action and then its undo; returns the State after each. */
const roundTrip = (action: EpisodeAction) => {
  const after = apply(start, changesFor(action, start))
  const undone = apply(after, undoFor(action, start, after, ++clock))
  return { after, undone }
}

const shape = (s: State.State) =>
  s.playlists.map((p) => ({
    id: p.id,
    cursor: p.cursor,
    entries: p.entries.map((e) => [e.episodeId, e.position])
  }))

describe("Episode actions and their undo", () => {
  it("takes back adding a new Entry", () => {
    const { after, undone } = roundTrip({
      _tag: "Add",
      episodeId: "e9",
      playlistId: "commute",
      placement: "last"
    })
    expect(after.playlists[1]?.entries.map((e) => e.episodeId)).toEqual(["e2", "e9"])
    expect(shape(undone)).toEqual(shape(start))
  })

  it("puts a moved Entry back in its place with its Position", () => {
    const { after, undone } = roundTrip({
      _tag: "Add",
      episodeId: "e3",
      playlistId: "default",
      placement: "next"
    })
    expect(after.playlists[0]?.entries.map((e) => e.episodeId)).toEqual(["e1", "e2", "e3"])
    const { after: moved, undone: back } = roundTrip({
      _tag: "Add",
      episodeId: "e1",
      playlistId: "default",
      placement: "last"
    })
    expect(moved.playlists[0]?.entries.map((e) => e.episodeId)).toEqual(["e2", "e3", "e1"])
    expect(shape(back)).toEqual(shape(start))
    expect(shape(undone)).toEqual(shape(start))
  })

  it("Marking Played and taking it back restores Entries that Clear on Played removed", () => {
    const { after, undone } = roundTrip({ _tag: "Played", episodeId: "e2", played: true })
    expect(after.playlists[0]?.entries.map((e) => e.episodeId)).toEqual(["e1", "e3"])
    expect(after.episodeStates.e2?.played).not.toBeNull()
    expect(shape(undone)).toEqual(shape(start))
    expect(undone.episodeStates.e2?.played ?? null).toBeNull()
  })

  it("takes back a batch: each undo from just before its action, last first", () => {
    const actions: ReadonlyArray<EpisodeAction> = [
      { _tag: "Add", episodeId: "e9", playlistId: "default", placement: "next" },
      { _tag: "Add", episodeId: "e1", playlistId: "default", placement: "next" },
      { _tag: "Played", episodeId: "e2", played: true }
    ]
    let current = start
    const undos: Array<ReadonlyArray<Operation.Change>> = []
    for (const action of actions) {
      const after = apply(current, changesFor(action, current))
      undos.push(undoFor(action, current, after, ++clock))
      current = after
    }
    const undone = apply(current, undos.reverse().flat())
    expect(shape(undone)).toEqual(shape(start))
  })

  it("takes back a Star", () => {
    const { after, undone } = roundTrip({ _tag: "Star", episodeId: "e1", starred: true })
    expect(after.episodeStates.e1?.starred).toBe(true)
    expect(undone.episodeStates.e1?.starred ?? false).toBe(false)
  })
})
