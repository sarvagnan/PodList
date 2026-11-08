import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "@effect/vitest"
import { Sql, Units, ViewQuery } from "@podlist/domain"
import { Effect } from "effect"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"

describe("Mentions migration", () => {
  it.effect("backfills a populated version 3 database and keeps the result after reopening", () => {
    const directory = mkdtempSync(join(tmpdir(), "podlist-mentions-"))
    const filename = join(directory, "library.db")
    const db = new DatabaseSync(filename)
    db.exec(
      "CREATE TABLE effect_sql_migrations (migration_id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    )
    for (const migration of Sql.migrations.filter((m) => m.id <= 3)) {
      for (const statement of migration.statements) db.exec(statement)
      db.prepare("INSERT INTO effect_sql_migrations (migration_id, name) VALUES (?, ?)").run(
        migration.id,
        migration.name
      )
    }
    db.exec(
      "INSERT INTO subscription (id, feed_url, title, subscribed_at) VALUES ('s', 'f', 'ПОДКАСТ', 0)"
    )
    const insert = db.prepare(
      "INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url) VALUES (?, 's', ?, 'Café', 'Straße é', 1, 'audio')"
    )
    // Cross multiple backfill batches with opaque ids in binary keyset order.
    for (let i = 0; i < 260; i++) insert.run(String(i), String(i))
    db.close()
    const read = Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const compiled = ViewQuery.compile(
        { filter: { text: "CAFE STRASSE ПОДКАСТ É" }, sort: "publishedDesc", limit: null },
        Units.EpochMillis.make(1)
      )
      expect((yield* sql.unsafe(compiled.sql, compiled.params)).length).toBe(260)
      expect(yield* sql`SELECT title, description FROM episode WHERE id = '0'`).toEqual([
        { title: "Café", description: "Straße é" }
      ])
    })
    return Effect.gen(function* () {
      yield* read.pipe(Effect.provide(Database.layer(filename)))
      yield* read.pipe(Effect.provide(Database.layer(filename)))
    }).pipe(Effect.ensuring(Effect.sync(() => rmSync(directory, { recursive: true, force: true }))))
  })
})
