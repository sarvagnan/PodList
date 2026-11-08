import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Listening, Operation, PlaybackSettings, Sql, State, Units } from "../src/index.ts"

const initial = () =>
  State.initial(
    new PlaybackSettings.PlaybackSettings({
      speed: 1,
      skipIntro: Units.Seconds.make(0),
      skipOutro: Units.Seconds.make(0),
      volumeBoost: false
    })
  )
const operation = (id: string, change: unknown, deviceId = "phone", recordedAt = 1000) =>
  Schema.decodeUnknownSync(Operation.Operation)({
    id,
    deviceId,
    sequence: 0,
    recordedAt,
    change
  })
const amounts = [{ day: "2026-11-08", subscriptionId: "s", seconds: 15 }]
const report = {
  _tag: "ReportPosition",
  playlistId: "default",
  episodeId: "A",
  position: 15,
  listenedAt: 15000,
  listening: amounts
}

describe("Listening log", () => {
  it("counts elapsed listening at different speeds and rejects seeks, pauses and long gaps", () => {
    const before = { at: 0, position: 100 }
    expect(Listening.sample(before, { at: 15000, position: 130 }, 2, 0)).toEqual([
      { day: "1970-01-01", seconds: 15 }
    ])
    expect(Listening.sample(before, { at: 15000, position: 111.25 }, 0.75, 0)[0]?.seconds).toBe(15)
    expect(Listening.sample(before, { at: 15000, position: 200 }, 1, 0)).toEqual([])
    expect(Listening.sample(before, { at: 15000, position: 80 }, 1, 0)).toEqual([])
    expect(Listening.sample(before, { at: 15000, position: 100 }, 1, 0)).toEqual([])
    expect(Listening.sample(before, { at: 60000, position: 115 }, 1, 0)).toEqual([])
    expect(Listening.sample(null, { at: 15000, position: 115 }, 1, 0)).toEqual([])
    expect(Listening.sample(before, { at: 0, position: 115 }, 1, 0)).toEqual([])
    expect(Listening.sample(before, { at: 15000, position: 115.5 }, 1, 0)[0]?.seconds).toBe(15)
  })

  it("splits midnight on the listening Device, including fractional-hour timezones", () => {
    const at = Date.UTC(2026, 10, 8, 18, 30, 5)
    expect(
      Listening.sample({ at: at - 15000, position: 0 }, { at, position: 15 }, 1, -330)
    ).toEqual([
      { day: "2026-11-08", seconds: 10 },
      { day: "2026-11-09", seconds: 5 }
    ])
    const west = Date.UTC(2026, 10, 9, 8, 0, 5)
    expect(
      Listening.sample({ at: west - 15000, position: 0 }, { at: west, position: 15 }, 1, 480)
    ).toEqual([
      { day: "2026-11-08", seconds: 10 },
      { day: "2026-11-09", seconds: 5 }
    ])
  })

  it("adds several Devices independently of stale Positions, missing Entries and retry order", () => {
    const phone = operation("phone", report)
    const mac = operation("mac", { ...report, listenedAt: 5000, position: 5 }, "mac")
    const forward = State.applyOperations(initial(), [phone, mac, phone])
    const reverse = State.applyOperations(initial(), [mac, phone])
    expect(forward.state.listeningLog).toEqual({ "2026-11-08": { s: 30 } })
    expect(reverse.state.listeningLog).toEqual(forward.state.listeningLog)
    expect(State.applyOperations(forward.state, [phone], forward.applied).state).toEqual(
      forward.state
    )
  })

  it("persists forever through SQLite, loads older States, and never invents past listening", () => {
    const old = initial()
    expect(
      Schema.decodeUnknownSync(State.State)(JSON.parse(JSON.stringify(old))).listeningLog
    ).toBeUndefined()
    expect(Sql.rowsToState(Sql.stateToRows(old))).toEqual(old)
    const current = State.applyOperations(old, [operation("log", report)]).state
    const muchLater = State.applyOperations(current, [
      operation("edit", { _tag: "SetTrashDays", days: 7 }, "phone", Date.UTC(2036, 10, 8))
    ]).state
    expect(Sql.rowsToState(Sql.stateToRows(muchLater)).listeningLog).toEqual(current.listeningLog)
    const { listening: _, ...legacyReport } = report
    const positionOnly = State.applyOperations(old, [operation("old", legacyReport)]).state
    expect(positionOnly.listeningLog).toBeUndefined()
  })

  it("keeps the log through Rewind, Unplayed and Playlist deletion, and counts the tail after Played", () => {
    const state = State.applyOperations(initial(), [
      operation("add", {
        _tag: "AddEntry",
        playlistId: "default",
        episodeId: "A",
        placement: "last"
      }),
      operation("report", report),
      operation("played", {
        _tag: "MarkPlayed",
        episodeId: "A",
        source: { _tag: "Playback", playlistId: "default" }
      }),
      operation("tail", { _tag: "RecordListening", amounts }),
      operation("rewind", { _tag: "Rewind", playlistId: "default", to: 15000 }),
      operation("unplayed", { _tag: "MarkUnplayed", episodeId: "A" })
    ]).state
    expect(state.listeningLog).toEqual({ "2026-11-08": { s: 30 } })
    const deleted = State.applyOperations(state, [
      operation("create", {
        _tag: "CreatePlaylist",
        playlistId: "p",
        name: "Old",
        clearOnPlayed: false
      }),
      operation("delete", { _tag: "DeletePlaylist", playlistId: "p" })
    ]).state
    expect(deleted.listeningLog).toEqual(state.listeningLog)
  })
})

describe("Listening stats", () => {
  it("derives Monday weeks, calendar months, all-time, ranked podcasts and 30 daily totals", () => {
    const log = Schema.decodeUnknownSync(Listening.Log)({
      "2026-10-31": { a: 60 },
      "2026-11-01": { a: 120 },
      "2026-11-02": { b: 180 },
      "2026-11-07": { a: 240 },
      "2026-11-08": { b: 300 },
      "2026-11-09": { a: 999 }
    })
    const played = [
      { at: new Date(2026, 9, 31).getTime(), source: { _tag: "Playback" } },
      { at: new Date(2026, 10, 1).getTime(), source: { _tag: "Playback" } },
      { at: new Date(2026, 10, 8).getTime(), source: { _tag: "Playback" } },
      { at: new Date(2026, 10, 8).getTime(), source: { _tag: "User" } }
    ]
    const result = Listening.stats(log, played, new Date(2026, 10, 8, 12))
    expect(result.totals).toEqual([
      { seconds: 720, finished: 1 },
      { seconds: 840, finished: 2 },
      { seconds: 1899, finished: 3 }
    ])
    expect(result.podcasts).toEqual([
      ["a", 1419],
      ["b", 480]
    ])
    expect(result.days).toHaveLength(30)
    expect(result.days.at(-1)).toEqual({ day: "2026-11-08", seconds: 300 })
    expect(result.streak).toBe(2)
  })

  it("handles no listening, year boundaries, yesterday’s streak and broken streaks", () => {
    const log = Schema.decodeUnknownSync(Listening.Log)({
      "2025-12-30": { a: 1 },
      "2025-12-31": { a: 1 }
    })
    expect(Listening.stats(log, [], new Date(2026, 0, 1)).streak).toBe(2)
    expect(Listening.stats(log, [], new Date(2026, 0, 2)).streak).toBe(0)
    const empty = Listening.stats({}, [], new Date(2026, 0, 1))
    expect(empty.totals).toEqual(Array.from({ length: 3 }, () => ({ seconds: 0, finished: 0 })))
    expect(empty.podcasts).toEqual([])
    expect(empty.streak).toBe(0)
  })
})
