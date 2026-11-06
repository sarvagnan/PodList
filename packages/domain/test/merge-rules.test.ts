import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Operation, PlaybackSettings, State, Units } from "../src/index.ts"

const s0 = State.initial(
  new PlaybackSettings.PlaybackSettings({
    speed: 1,
    skipIntro: Units.Seconds.make(0),
    skipOutro: Units.Seconds.make(0),
    volumeBoost: false
  })
)

let counter = 0
const op = (change: unknown, deviceId = "phone", recordedAt = 1000) =>
  Schema.decodeUnknownSync(Operation.Operation)({
    id: `op-${++counter}`,
    deviceId,
    sequence: counter,
    recordedAt,
    change
  })
const position = (episodeId: string, seconds: number, listenedAt: number) =>
  op({ _tag: "ReportPosition", playlistId: "default", episodeId, position: seconds, listenedAt })
const entryOf = (state: State.State, episodeId: string) =>
  state.playlists[0]?.entries.find((e) => e.episodeId === episodeId)

const withA = () =>
  State.applyOperations(s0, [
    op({ _tag: "AddEntry", playlistId: "default", episodeId: "A", placement: "last" })
  ]).state

describe("Position merging", () => {
  it("keeps the most recent listen, whatever order the reports arrive in", () => {
    const phone = position("A", 600, 2000)
    const mac = position("A", 300, 1500)
    const inOrder = State.applyOperations(withA(), [mac, phone]).state
    const outOfOrder = State.applyOperations(withA(), [phone, mac]).state
    expect(entryOf(inOrder, "A")?.position).toBe(600)
    expect(entryOf(outOfOrder, "A")?.position).toBe(600)
    expect(entryOf(outOfOrder, "A")?.positionAt).toBe(2000)
  })

  it("drops a Position for an Entry that has since been removed", () => {
    const s = State.applyOperations(withA(), [
      op({ _tag: "RemoveEntry", playlistId: "default", episodeId: "A" }),
      position("A", 600, 2000)
    ]).state
    expect(entryOf(s, "A")).toBeUndefined()
  })
})

describe("Replay", () => {
  it("applies an operation delivered twice only once", () => {
    const played = op({
      _tag: "MarkPlayed",
      episodeId: "A",
      source: { _tag: "Playback", playlistId: "default" }
    })
    const first = State.applyOperations(withA(), [played])
    const again = State.applyOperations(first.state, [played], first.applied)
    expect(again.state).toBe(first.state)
    expect(again.state.playlists[0]?.history).toHaveLength(1)
  })

  it("merges offline edits from two Devices without losing either", () => {
    // Phone (offline) reorders; Mac meanwhile adds two Entries and removes one.
    const base = State.applyOperations(
      s0,
      ["A", "B", "C"].map((e) =>
        op({ _tag: "AddEntry", playlistId: "default", episodeId: e, placement: "last" })
      )
    ).state
    const mac = [
      op({ _tag: "AddEntry", playlistId: "default", episodeId: "D", placement: "last" }, "mac"),
      op({ _tag: "RemoveEntry", playlistId: "default", episodeId: "B" }, "mac")
    ]
    const phone = [
      op({ _tag: "MoveEntry", playlistId: "default", episodeId: "C", after: null }, "phone"),
      op({ _tag: "MoveEntry", playlistId: "default", episodeId: "B", after: "C" }, "phone")
    ]
    const s = State.applyOperations(base, [...mac, ...phone]).state
    expect(s.playlists[0]?.entries.map((e) => e.episodeId)).toEqual(["C", "A", "D"])
  })
})
