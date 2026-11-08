import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Operation, PlaybackSettings, State, TimelineRules, Units } from "../src/index.ts"

const s0 = State.initial(
  new PlaybackSettings.PlaybackSettings({
    speed: 1,
    skipIntro: Units.Seconds.make(0),
    skipOutro: Units.Seconds.make(0),
    volumeBoost: false
  })
)
const min = (m: number) => Units.EpochMillis.make(1_793_750_400_000 + m * 60_000)

let n = 0
const op = (minute: number, change: unknown) =>
  Schema.decodeUnknownSync(Operation.Operation)({
    id: `op-${++n}`,
    deviceId: "phone",
    sequence: n,
    recordedAt: min(minute),
    change
  })
const add = (minute: number, episodeId: string, playlistId = "default") =>
  op(minute, { _tag: "AddEntry", playlistId, episodeId, placement: "last" })
const report = (minute: number, episodeId: string, position: number, playlistId = "default") =>
  op(minute, {
    _tag: "ReportPosition",
    playlistId,
    episodeId,
    position,
    listenedAt: min(minute)
  })
const playedBy = (minute: number, episodeId: string, playlistId = "default") =>
  op(minute, { _tag: "MarkPlayed", episodeId, source: { _tag: "Playback", playlistId } })
const rewind = (minute: number, to: number, playlistId = "default") =>
  op(minute, { _tag: "Rewind", playlistId, to: min(to) })

const replay = (...ops: Array<Operation.Operation>) => State.applyOperations(s0, ops).state
const def = (s: State.State) => {
  const p = s.playlists[0]
  if (p === undefined) throw new Error("no Default Playlist")
  return p
}

/** Listening to A, falling asleep at 10:05 while A, then B, finish and C starts. */
const asleep = () => [
  add(0, "A"),
  add(0, "B"),
  add(0, "C"),
  add(0, "D"),
  report(0, "A", 100),
  report(5, "A", 400),
  playedBy(30, "A"),
  report(31, "B", 30),
  // Deliberate edits while that was happening: add X, mark D Played by hand.
  add(50, "X"),
  op(55, { _tag: "MarkPlayed", episodeId: "D", source: { _tag: "User" } }),
  playedBy(60, "B"),
  report(61, "C", 20)
]

describe("Rewind", () => {
  it("undoes what playback did since the moment and keeps deliberate edits", () => {
    const before = replay(...asleep())
    expect(def(before).entries.map((e) => e.episodeId)).toEqual(["C", "X"])
    expect(def(before).cursor).toBe("C")

    const after = replay(...asleep(), rewind(70, 6))
    expect(def(after).entries.map((e) => e.episodeId)).toEqual(["A", "B", "C", "X"])
    expect(def(after).cursor).toBe("A")
    expect(def(after).entries[0]?.position).toBe(400)
    expect(after.episodeStates.A).toBeUndefined()
    expect(after.episodeStates.B).toBeUndefined()
    expect(after.episodeStates.D?.played?.source._tag).toBe("User")
    expect(def(after).history).toEqual([])
  })

  it("resets what playback moved since then: C, started after the moment, is back at 0:00", () => {
    const after = replay(...asleep(), rewind(70, 6))
    expect(def(after).entries.find((e) => e.episodeId === "C")?.position).toBe(0)
  })

  it("puts restored Entries back where they were, before the Entry that followed them", () => {
    const s = replay(
      add(0, "Q"),
      add(0, "A"),
      add(0, "B"),
      report(0, "A", 100),
      playedBy(10, "A"),
      report(11, "B", 30),
      // A deliberate reorder since: Q moves to the end.
      op(20, { _tag: "MoveEntry", playlistId: "default", episodeId: "Q", after: "B" }),
      rewind(30, 5)
    )
    expect(def(s).entries.map((e) => e.episodeId)).toEqual(["A", "B", "Q"])
    expect(def(s).cursor).toBe("A")
  })

  it("only undoes Played facts from this Playlist's playback", () => {
    const s = replay(
      add(0, "A"),
      op(0, { _tag: "CreatePlaylist", playlistId: "replay", name: "Replay", clearOnPlayed: false }),
      add(0, "Z", "replay"),
      report(0, "Z", 10, "replay"),
      playedBy(10, "A"),
      rewind(20, 5, "replay")
    )
    expect(s.episodeStates.A?.played?.source._tag).toBe("Playback")
  })

  it("does nothing when the Timeline has no point that early", () => {
    const s = replay(...asleep())
    expect(State.applyOperations(s, [rewind(70, -10)]).state).toBe(s)
  })
})

describe("Listening Timeline", () => {
  it("keeps at most one point a minute per Episode", () => {
    const s = replay(add(0, "A"), report(0, "A", 10), report(0.5, "A", 40), report(1, "A", 70))
    expect(def(s).timeline.map((t) => t.position)).toEqual([10, 70])
  })

  it("does not reintroduce expired points through late reports", () => {
    const day = 24 * 60
    const s = replay(add(0, "A"), report(31 * day, "A", 20), report(0, "A", 10))
    expect(def(s).timeline.map((t) => t.position)).toEqual([20])
    expect(def(s).entries[0]?.position).toBe(20)
  })

  it("drops points older than 30 days", () => {
    const day = 24 * 60
    const s = replay(add(0, "A"), report(0, "A", 10), report(31 * day, "A", 20))
    expect(def(s).timeline.map((t) => t.position)).toEqual([20])
    expect(TimelineRules.retentionMillis).toBe(30 * day * 60_000)
  })
})
