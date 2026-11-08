import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Operation, PlaybackSettings, Sql, State, Units } from "../src/index.ts"

const initial = () =>
  State.initial(
    new PlaybackSettings.PlaybackSettings({
      speed: 1,
      skipIntro: Units.Seconds.make(0),
      skipOutro: Units.Seconds.make(0),
      volumeBoost: false
    })
  )
const rule = (mode: string, at: number, deviceId = "phone", keepAtMost: number | null = null) =>
  Schema.decodeUnknownSync(Operation.Operation)({
    id: `${deviceId}-${at}`,
    deviceId: "editor",
    sequence: at,
    recordedAt: at,
    change: { _tag: "SetDownloadRule", rule: { subscriptionId: "s", deviceId, mode, keepAtMost } }
  })
const json = (state: State.State) => Schema.encodeSync(State.State)(state).downloadRules

describe("Download Rule All New activation", () => {
  it("starts again on re-entry, preserves the date for cap edits, and isolates Devices", () => {
    const operations = [
      rule("allNew", 100),
      rule("allNew", 200, "phone", 3),
      rule("allNew", 250, "desktop"),
      rule("never", 300),
      rule("allNew", 400)
    ]
    const state = (count: number) =>
      State.applyOperations(initial(), operations.slice(0, count)).state
    expect(json(state(1))[0]).toMatchObject({ since: 100 })
    expect(json(state(2))[0]).toMatchObject({ since: 100, keepAtMost: 3 })
    expect(json(state(4)).find((r) => r.deviceId === "phone")).not.toHaveProperty("since")
    expect(json(state(5))).toEqual([
      { subscriptionId: "s", deviceId: "desktop", mode: "allNew", keepAtMost: null, since: 250 },
      { subscriptionId: "s", deviceId: "phone", mode: "allNew", keepAtMost: null, since: 400 }
    ])
    const snapshot = Schema.decodeUnknownSync(State.State)(JSON.parse(JSON.stringify(state(5))))
    const rows = Sql.stateToRows(snapshot)
    expect(json(Sql.rowsToState(rows))).toEqual(json(snapshot))
    // One sync batch, incremental replay, snapshot and duplicate delivery agree.
    const first = State.applyOperations(initial(), operations.slice(0, 2))
    const rest = State.applyOperations(
      first.state,
      [...operations, ...operations.slice(4)],
      first.applied
    )
    expect(json(rest.state)).toEqual(json(state(5)))
    const viaEntry = State.applyOperations(state(5), [
      rule("onEntry", 500),
      rule("allNew", 600)
    ]).state
    expect(json(viaEntry).find((r) => r.deviceId === "phone")).toMatchObject({ since: 600 })
  })
})
