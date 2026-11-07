import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Operation, PlaybackSettings, State, Units } from "../src/index.ts"

// Trash (CONTEXT.md): a deleted Playlist goes there with its History and Listening
// Timeline, can be restored for a number of days (30 unless set), then is gone.

const day = 86_400_000
const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})
const decodeChange = Schema.decodeUnknownSync(Operation.Change)
const at = (t: number) => ({ at: Units.EpochMillis.make(t) })
const run = (state: State.State, t: number, ...changes: Array<unknown>) =>
  changes.reduce<State.State>((s, c) => State.apply(s, decodeChange(c), at(t)), state)

const withReplay = () =>
  run(
    State.initial(defaults),
    1_000,
    { _tag: "CreatePlaylist", playlistId: "replay", name: "Replay", clearOnPlayed: false },
    { _tag: "AddEntry", playlistId: "replay", episodeId: "e1", placement: "last" },
    { _tag: "SetActivePlaylist", playlistId: "replay" }
  )

describe("Trash", () => {
  it("keeps a deleted Playlist, with its Entries, until it is restored", () => {
    const deleted = run(withReplay(), 2_000, { _tag: "DeletePlaylist", playlistId: "replay" })
    expect(deleted.playlists.map((p) => p.id)).toEqual(["default"])
    expect(deleted.activePlaylistId).toBe("default")
    expect(State.trashOf(deleted).map((t) => [t.playlist.id, t.deletedAt])).toEqual([
      ["replay", 2_000]
    ])

    const restored = run(deleted, 3_000, { _tag: "RestorePlaylist", playlistId: "replay" })
    expect(restored.playlists.map((p) => p.id)).toEqual(["default", "replay"])
    expect(restored.playlists[1]?.entries.map((e) => e.episodeId)).toEqual(["e1"])
    expect(State.trashOf(restored)).toEqual([])
  })

  it("lets go of a deleted Playlist after the retention period, 30 days unless set", () => {
    const deleted = run(withReplay(), 0, { _tag: "DeletePlaylist", playlistId: "replay" })
    expect(
      State.trashOf(run(deleted, 29 * day, { _tag: "SetStar", episodeId: "x", starred: true }))
    ).toHaveLength(1)
    expect(
      State.trashOf(run(deleted, 31 * day, { _tag: "SetStar", episodeId: "x", starred: true }))
    ).toEqual([])

    const week = run(deleted, 1, { _tag: "SetTrashDays", days: 7 })
    expect(State.trashDaysOf(week)).toBe(7)
    expect(
      State.trashOf(run(week, 8 * day, { _tag: "SetStar", episodeId: "x", starred: true }))
    ).toEqual([])
  })

  it("can't restore once it is gone, and never trashes the Default Playlist", () => {
    const deleted = run(withReplay(), 0, { _tag: "DeletePlaylist", playlistId: "replay" })
    const late = run(deleted, 40 * day, { _tag: "RestorePlaylist", playlistId: "replay" })
    expect(late.playlists.map((p) => p.id)).toEqual(["default"])
    const s = State.initial(defaults)
    expect(run(s, 0, { _tag: "DeletePlaylist", playlistId: "default" })).toBe(s)
  })
})
