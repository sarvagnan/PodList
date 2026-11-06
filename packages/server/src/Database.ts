import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node"
import { Sql } from "@podlist/domain"
import { Layer } from "effect"

/** SQLite at `filename`, migrated to the shared schema before anything uses it. */
export const layer = (filename: string) =>
  SqliteMigrator.layer({ loader: Sql.migrationLoader }).pipe(
    Layer.provideMerge(SqliteClient.layer({ filename }))
  )
