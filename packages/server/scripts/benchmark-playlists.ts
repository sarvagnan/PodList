// A repeatable check of ADR 0008’s document rewrite at the large-Playlist fixture size.
import { Operation, PlaybackSettings, State, StateStore, Units } from "@podlist/domain"
import { Effect, Schema } from "effect"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"

await Effect.runPromise(
  Effect.gen(function* () {
    const change = Schema.decodeUnknownSync(Operation.Change)
    const at = Units.EpochMillis.make(Date.now())
    let state = State.initial(
      new PlaybackSettings.PlaybackSettings({
        speed: 1,
        skipIntro: Units.Seconds.make(0),
        skipOutro: Units.Seconds.make(0),
        volumeBoost: false
      })
    )
    for (let i = 0; i < 500; i++)
      state = State.apply(
        state,
        change({ _tag: "AddEntry", playlistId: "default", episodeId: `e${i}`, placement: "last" }),
        { at }
      )
    yield* StateStore.save(null, state)
    const move: number[] = []
    const write: number[] = []
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
      move.push(performance.now() - start)
      const next = State.apply(
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
      yield* StateStore.save(state, next)
      write.push(performance.now() - writeStart)
      state = next
    }
    const sql = yield* SqlClient.SqlClient
    const [row] = yield* sql<{ doc: string }>`SELECT doc FROM playlist WHERE id = 'default'`
    const p95 = (values: number[]) => Number(values.sort((a, b) => a - b)[95]?.toFixed(2))
    console.log(
      JSON.stringify({
        entries: 500,
        samples: 100,
        playlistBytes: row?.doc.length,
        moveP95: p95(move),
        positionWriteP95: p95(write)
      })
    )
  }).pipe(Effect.provide(Database.layer(":memory:")))
)
