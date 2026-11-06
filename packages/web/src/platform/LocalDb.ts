import * as SqliteClient from "@effect/sql-sqlite-wasm/SqliteClient"
import * as SqliteMigrator from "@effect/sql-sqlite-wasm/SqliteMigrator"
import { Sql } from "@podlist/domain"
import { Effect, Layer } from "effect"

// The LocalDb seam (ADR 0007): the app talks to `effect/sql`'s SqlClient, migrated to
// the schema shared with the server. On the web it is SQLite (WASM) in a worker, on
// OPFS (ADR 0005). A native shell provides SqlClient from native SQLite instead.

export const layerWeb = (databaseName = "podlist.db") =>
  SqliteMigrator.layer({ loader: Sql.migrationLoader }).pipe(
    Layer.provideMerge(
      SqliteClient.layer({
        worker: Effect.acquireRelease(
          Effect.sync(
            () =>
              new Worker(new URL("./localDbWorker.ts", import.meta.url), {
                type: "module",
                name: databaseName
              })
          ),
          (worker) => Effect.sync(() => worker.terminate())
        )
      })
    )
  )
