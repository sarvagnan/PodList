import { Operation, PlaybackSettings, State, Units } from "@podlist/domain"
import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { previewRewind, timelineEvents, undoRewind } from "./timeline.ts"

const min = (m: number) => 1_793_750_400_000 + m * 60_000
const s0 = State.initial(
  new PlaybackSettings.PlaybackSettings({
    speed: 1,
    skipIntro: Units.Seconds.make(0),
    skipOutro: Units.Seconds.make(0),
    volumeBoost: false
  })
)
const change = Schema.decodeUnknownSync(Operation.Change)
const run = (state: State.State, minute: number, c: unknown) =>
  State.apply(state, change(c), { at: Units.EpochMillis.make(min(minute)) })
const report = (episodeId: string, position: number, minute: number) => ({
  _tag: "ReportPosition",
  playlistId: "default",
  episodeId,
  position,
  listenedAt: min(minute)
})

/** A then B in Default; A listened to from 0 to 30 min and finished; B started. */
const listened = () => {
  let s = run(s0, 0, { _tag: "AddEntry", playlistId: "default", episodeId: "A", placement: "last" })
  s = run(s, 0, { _tag: "AddEntry", playlistId: "default", episodeId: "B", placement: "last" })
  for (const m of [0, 5, 10, 30]) s = run(s, m, report("A", m * 60, m))
  s = run(s, 31, {
    _tag: "MarkPlayed",
    episodeId: "A",
    source: { _tag: "Playback", playlistId: "default" }
  })
  s = run(s, 32, report("B", 60, 32))
  return s
}

describe("the Listening Timeline", () => {
  it("reads as stretches of listening and finished Episodes, newest first", () => {
    const playlist = listened().playlists[0]
    if (playlist === undefined) throw new Error("no Default Playlist")
    // Playback only: the adds that set it up are edits (below).
    const events = timelineEvents(playlist).filter((e) => e._tag !== "Edited")
    // A pause of more than 10 minutes (10 → 30) starts a new stretch.
    expect(events.map((e) => [e._tag, e.episodeId])).toEqual([
      ["Listened", "B"],
      ["Finished", "A"],
      ["Listened", "A"],
      ["Listened", "A"]
    ])
  })

  it("previews a Rewind and takes it back", () => {
    const before = listened()
    const preview = previewRewind(before, "default", min(6), min(40))
    expect(preview?.cursor).toBe("A")
    expect(preview?.unplayed).toEqual(["A"])
    expect(preview?.restored).toEqual(["A"])
    if (preview == null) throw new Error("no preview")
    const undo = undoRewind(before, preview.after, "default", min(41))
    const back = undo.reduce(
      (s, c) => State.apply(s, c, { at: Units.EpochMillis.make(min(41)) }),
      preview.after
    )
    expect(back.playlists[0]?.entries.map((e) => e.episodeId)).toEqual(["B"])
    expect(back.playlists[0]?.cursor).toBe("B")
    expect(back.episodeStates.A?.played).not.toBeNull()
  })
})

describe("your own edits on the Listening Timeline", () => {
  it("lists adds, moves, removals and hand-marked Played, newest first; playback isn't an edit", () => {
    let s = listened()
    s = run(s, 40, { _tag: "AddEntry", playlistId: "default", episodeId: "C", placement: "last" })
    s = run(s, 41, { _tag: "MoveEntry", playlistId: "default", episodeId: "C", after: null })
    s = run(s, 42, { _tag: "MarkPlayed", episodeId: "B", source: { _tag: "User" } })
    s = run(s, 43, { _tag: "RemoveEntry", playlistId: "default", episodeId: "C" })
    const playlist = s.playlists.find((p) => p.id === "default")
    if (playlist === undefined) throw new Error("no Default Playlist")
    const edits = timelineEvents(playlist).filter((e) => e._tag === "Edited")
    expect(edits.map((e) => (e._tag === "Edited" ? `${e.kind} ${e.episodeId}` : ""))).toEqual([
      "removed C",
      "markedPlayed B",
      "moved C",
      "added C",
      "added B",
      "added A"
    ])
  })
})
