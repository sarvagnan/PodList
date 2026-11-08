import { expect, it } from "@effect/vitest"
import { Operation, PlaybackSettings, State, StateStore, Units } from "@podlist/domain"
import { Effect, Schema } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import * as LocalDb from "../platform/LocalDb.ts"

it.live("moves and persists Positions in a 500-Entry Playlist (ADR 0008)", (context) =>
  Effect.gen(function* () {
    const change = Schema.decodeUnknownSync(Operation.Change)
    let state = State.initial(
      new PlaybackSettings.PlaybackSettings({
        speed: 1,
        skipIntro: Units.Seconds.make(0),
        skipOutro: Units.Seconds.make(0),
        volumeBoost: false
      })
    )
    const at = Units.EpochMillis.make(1_000_000)
    for (let i = 0; i < 500; i++)
      state = State.apply(
        state,
        change({ _tag: "AddEntry", playlistId: "default", episodeId: `e${i}`, placement: "last" }),
        { at }
      )
    yield* StateStore.save(null, state)
    const moves: number[] = []
    const writes: number[] = []
    for (let i = 0; i < 100; i++) {
      const start = performance.now()
      const moved = State.apply(
        state,
        change({
          _tag: "MoveEntry",
          playlistId: "default",
          episodeId: "e499",
          after: i % 2 ? null : "e0"
        }),
        { at }
      )
      moves.push(performance.now() - start)
      const after = State.apply(
        moved,
        change({
          _tag: "ReportPosition",
          playlistId: "default",
          episodeId: "e1",
          position: i + 1,
          listenedAt: at + i * 15000
        }),
        { at: Units.EpochMillis.make(at + i * 15000) }
      )
      const writeStart = performance.now()
      yield* StateStore.save(state, after)
      writes.push(performance.now() - writeStart)
      state = after
    }
    const sql = yield* SqlClient.SqlClient
    const [row] = yield* sql<{ doc: string }>`SELECT doc FROM playlist WHERE id = 'default'`
    expect(JSON.parse(row?.doc ?? "{}").entries).toHaveLength(500)
    const p95 = (values: number[]) =>
      Number(values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)]?.toFixed(2))
    yield* Effect.promise(() =>
      context.annotate(
        JSON.stringify({
          playlistBytes: row?.doc.length,
          moveP95: p95(moves),
          positionWriteP95: p95(writes)
        }),
        "performance"
      )
    )
  }).pipe(Effect.provide(LocalDb.layerMemory), Effect.provide(Reactivity.layer))
)
