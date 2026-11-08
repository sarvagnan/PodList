// Test-only helper: a real SQLite (Node's built-in driver) with the shared migrations applied.
import { DatabaseSync } from "node:sqlite"
import { Mentions, Sql } from "../../src/index.ts"

export const migratedDatabase = () => {
  const db = new DatabaseSync(":memory:")
  for (const migration of Sql.migrations) {
    for (const statement of migration.statements) db.exec(statement)
  }
  return db
}

export const insertRows = (db: DatabaseSync, table: string, rows: ReadonlyArray<object>) => {
  for (const value of rows) {
    const row = {
      ...value,
      ...((table === "episode" || table === "subscription") && "title" in value
        ? { title_folded: Mentions.fold(String(value.title)) }
        : {}),
      ...(table === "episode" && "description" in value
        ? { description_folded: Mentions.fold(String(value.description)) }
        : {})
    }
    const keys = Object.keys(row)
    db.prepare(
      `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`
    ).run(...(Object.values(row) as Array<string | number | null>))
  }
}
