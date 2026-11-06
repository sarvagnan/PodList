import { describe, expect, it } from "@effect/vitest"
import { Operation, PlaybackSettings, State, StateStore, Units } from "@podlist/domain"
import { Effect, Schema } from "effect"
import { SqlClient } from "effect/sql"
import * as LocalDb from "./LocalDb.ts"

describe("LocalDb (SQLite WASM on OPFS)", () => {
  it.effect("migrates to the shared schema and keeps data across restarts", () =>
    Effect.gen(function* () {
      const name = `test-${crypto.randomUUID()}.db`
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO setting (key, value) VALUES ('probe', '"kept"')`
      }).pipe(Effect.provide(LocalDb.layerWeb(name)))

      const value = yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const tables = yield* sql<{
          name: string
        }>`SELECT name FROM sqlite_schema WHERE type = 'table'`
        expect(tables.map((t) => t.name)).toEqual(
          expect.arrayContaining(["episode", "playlist", "entry_index"])
        )
        const [row] = yield* sql<{ value: string }>`SELECT value FROM setting WHERE key = 'probe'`
        return row?.value
      }).pipe(Effect.provide(LocalDb.layerWeb(name)))
      expect(value).toBe('"kept"')
    })
  )
})

describe("StateStore over LocalDb", () => {
  it.effect("saves and reloads user State in the browser database", () =>
    Effect.gen(function* () {
      const settings = new PlaybackSettings.PlaybackSettings({
        speed: 1.2,
        skipIntro: Units.Seconds.make(0),
        skipOutro: Units.Seconds.make(0),
        volumeBoost: false
      })
      const name = `state-${crypto.randomUUID()}.db`
      const initial = State.initial(settings)
      const changed = State.apply(
        initial,
        Schema.decodeUnknownSync(Operation.Change)({
          _tag: "AddEntry",
          playlistId: "default",
          episodeId: "ep-1",
          placement: "last"
        }),
        { at: Units.EpochMillis.make(1) }
      )
      yield* StateStore.save(null, changed).pipe(Effect.provide(LocalDb.layerWeb(name)))
      const reloaded = yield* StateStore.load(settings).pipe(Effect.provide(LocalDb.layerWeb(name)))
      expect(reloaded.playlists[0]?.entries.map((e) => e.episodeId)).toEqual(["ep-1"])
    })
  )
})
