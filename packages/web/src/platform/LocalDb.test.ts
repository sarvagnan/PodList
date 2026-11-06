import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
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
