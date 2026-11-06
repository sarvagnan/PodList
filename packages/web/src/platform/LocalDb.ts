import * as SqliteClient from "@effect/sql-sqlite-wasm/SqliteClient"
import * as SqliteMigrator from "@effect/sql-sqlite-wasm/SqliteMigrator"
import { Sql } from "@podlist/domain"
import { Context, Effect, Layer, Schedule } from "effect"
import { Migrator, SqlClient } from "effect/sql"

// The LocalDb seam (ADR 0007): the app talks to `effect/sql`'s SqlClient, migrated to
// the schema shared with the server. On the web it is SQLite (WASM) in a worker, on
// OPFS (ADR 0005). A native shell provides SqlClient from native SQLite instead.

/** Tables only clients have: the outbox of unsent operations and sync bookkeeping. */
export const clientMigrations = Migrator.fromRecord({
  "0001_outbox": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE TABLE outbox (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      operation TEXT NOT NULL
    )`
    yield* sql`CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  }),
  // Episodes stored on this Device; Manual Downloads are kept whatever the Download Rule.
  "0002_download": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE TABLE download (
      episode_id TEXT PRIMARY KEY,
      manual INTEGER NOT NULL,
      bytes INTEGER NOT NULL,
      saved_at INTEGER NOT NULL
    )`
  })
})

/**
 * SQLite in a worker, opened with retries: OPFS access handles from a just-closed
 * worker (or from the tab that handed over with "Use here") are released
 * asynchronously, so the first attempt can find the database still locked.
 */
const clientWithRetry = (databaseName: string) =>
  Layer.effectContext(
    SqliteClient.make({
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
    }).pipe(
      // A locked database can leave the worker waiting rather than failing, so each
      // attempt has a deadline before it is retried with a fresh worker.
      Effect.timeout("3 seconds"),
      Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 12 }),
      Effect.map((client) =>
        Context.make(SqliteClient.SqliteClient, client).pipe(
          Context.add(SqlClient.SqlClient, client)
        )
      )
    )
  )

export const layerWeb = (databaseName = "podlist.db") =>
  Layer.mergeAll(
    SqliteMigrator.layer({ loader: Sql.migrationLoader }),
    SqliteMigrator.layer({ loader: clientMigrations, table: "client_migrations" })
  ).pipe(Layer.provideMerge(clientWithRetry(databaseName)))

/**
 * The same schema in an in-memory SQLite on the current thread: for tests of logic that
 * doesn't depend on OPFS persistence (OPFS allows one open pool per origin at a time).
 */
export const layerMemory = Layer.mergeAll(
  SqliteMigrator.layer({ loader: Sql.migrationLoader }),
  SqliteMigrator.layer({ loader: clientMigrations, table: "client_migrations" })
).pipe(Layer.provideMerge(SqliteClient.layerMemory({})))
