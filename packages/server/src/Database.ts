import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node"
import { Sql } from "@podlist/domain"
import { Layer } from "effect"
import { Migrator } from "effect/sql"
import * as Library from "./Library.ts"
import * as SyncStore from "./SyncStore.ts"

/**
 * SQLite at `filename`, migrated before anything uses it: first the schema shared with
 * clients, then the server-only tables (tracked in their own migrations table).
 */
export const layer = (filename: string) =>
  Layer.mergeAll(
    SqliteMigrator.layer({ loader: Sql.migrationLoader }),
    SqliteMigrator.layer({
      loader: Migrator.fromRecord({ ...SyncStore.migrations, ...Library.migrations }),
      table: "server_migrations"
    })
  ).pipe(Layer.provideMerge(SqliteClient.layer({ filename })))
