import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node"
import { Sql } from "@podlist/domain"
import { Layer } from "effect"
import * as SyncStore from "./SyncStore.ts"

/**
 * SQLite at `filename`, migrated before anything uses it: first the schema shared with
 * clients, then the server-only tables (tracked in their own migrations table).
 */
export const layer = (filename: string) =>
  Layer.mergeAll(
    SqliteMigrator.layer({ loader: Sql.migrationLoader }),
    SqliteMigrator.layer({ loader: SyncStore.migrationLoader, table: "server_migrations" })
  ).pipe(Layer.provideMerge(SqliteClient.layer({ filename })))
