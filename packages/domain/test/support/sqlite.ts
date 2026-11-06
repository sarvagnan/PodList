// Test-only helper: a real SQLite (Node's built-in driver) with the shared migrations applied.
import { DatabaseSync } from "node:sqlite"
import { Sql } from "../../src/index.ts"

export const migratedDatabase = () => {
  const db = new DatabaseSync(":memory:")
  for (const migration of Sql.migrations) {
    for (const statement of migration.statements) db.exec(statement)
  }
  return db
}

export const insertRows = (db: DatabaseSync, table: string, rows: ReadonlyArray<object>) => {
  for (const row of rows) {
    const keys = Object.keys(row)
    db.prepare(
      `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`
    ).run(...(Object.values(row) as Array<string | number | null>))
  }
}
