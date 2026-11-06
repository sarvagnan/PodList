import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Operation, PlaybackSettings, PlayedRules, State, Units } from "../src/index.ts"

const at = Units.EpochMillis.make(5000)
const s0 = State.initial(
  new PlaybackSettings.PlaybackSettings({
    speed: 1,
    skipIntro: Units.Seconds.make(0),
    skipOutro: Units.Seconds.make(0),
    volumeBoost: false
  })
)
const decodeChange = Schema.decodeUnknownSync(Operation.Change)
const run = (state: State.State, ...changes: Array<unknown>) =>
  changes.reduce<State.State>((s, c) => State.apply(s, decodeChange(c), { at }), state)
const playlist = (state: State.State, id: string) => {
  const found = state.playlists.find((p) => p.id === id)
  if (found === undefined) throw new Error(`no playlist ${id}`)
  return found
}
const order = (state: State.State, id: string) =>
  playlist(state, id).entries.map((e) => e.episodeId)
const add = (playlistId: string, episodeId: string) => ({
  _tag: "AddEntry",
  playlistId,
  episodeId,
  placement: "last"
})
const playedBy = (episodeId: string, playlistId: string) => ({
  _tag: "MarkPlayed",
  episodeId,
  source: { _tag: "Playback", playlistId }
})

/** Default has 1–5 (Clear on Played); Replay keeps 2, 3, 4 (the Q3 scenario). */
const setup = () =>
  run(
    s0,
    ...["1", "2", "3", "4", "5"].map((e) => add("default", e)),
    { _tag: "CreatePlaylist", playlistId: "replay", name: "Replay", clearOnPlayed: false },
    ...["2", "3", "4"].map((e) => add("replay", e))
  )

describe("Played", () => {
  it("finishing in Default removes the Entry, records History and moves the Cursor on", () => {
    const s = run(setup(), playedBy("1", "default"))
    expect(order(s, "default")).toEqual(["2", "3", "4", "5"])
    expect(playlist(s, "default").cursor).toBe("2")
    expect(playlist(s, "default").history.map((h) => h.episodeId)).toEqual(["1"])
    expect(s.episodeStates["1"]?.played?.source._tag).toBe("Playback")
  })

  it("finishing in Replay keeps the Entry at 0:00, still clears it from Default (Q16, Q17)", () => {
    const s = run(setup(), playedBy("2", "replay"))
    expect(order(s, "replay")).toEqual(["2", "3", "4"])
    expect(playlist(s, "replay").entries[0]?.position).toBe(0)
    expect(playlist(s, "replay").cursor).toBe("3")
    expect(playlist(s, "replay").history.map((h) => h.episodeId)).toEqual(["2"])
    expect(order(s, "default")).toEqual(["1", "3", "4", "5"])
    expect(playlist(s, "default").history).toEqual([])
  })

  it("marking Played by hand clears it everywhere with Clear on Played but adds no History", () => {
    const s = run(setup(), { _tag: "MarkPlayed", episodeId: "3", source: { _tag: "User" } })
    expect(order(s, "default")).toEqual(["1", "2", "4", "5"])
    expect(order(s, "replay")).toEqual(["2", "3", "4"])
    expect(playlist(s, "default").history).toEqual([])
    expect(playlist(s, "replay").history).toEqual([])
  })

  it("a Star does not stop Clear on Played (Q20)", () => {
    const s = run(
      setup(),
      { _tag: "SetStar", episodeId: "4", starred: true },
      playedBy("4", "default")
    )
    expect(order(s, "default")).not.toContain("4")
    expect(s.episodeStates["4"]?.starred).toBe(true)
  })

  it("marking unplayed clears the flag but does not bring Entries back", () => {
    const s = run(setup(), playedBy("1", "default"), { _tag: "MarkUnplayed", episodeId: "1" })
    expect(s.episodeStates["1"]).toBeUndefined()
    expect(order(s, "default")).not.toContain("1")
  })
})

describe("Played threshold", () => {
  const sec = Units.Seconds.make
  it("counts the last 30 seconds as finished, with a per-Subscription override", () => {
    expect(PlayedRules.isFinished(sec(3570), sec(3600), null)).toBe(true)
    expect(PlayedRules.isFinished(sec(3569), sec(3600), null)).toBe(false)
    expect(PlayedRules.isFinished(sec(3555), sec(3600), sec(45))).toBe(true)
  })

  it("never finishes early when the duration is unknown", () => {
    expect(PlayedRules.isFinished(sec(99999), null, null)).toBe(false)
  })
})
