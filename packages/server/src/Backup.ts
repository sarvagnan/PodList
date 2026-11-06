import { mkdirSync, readdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { Config, Duration, Effect, Layer, Option, Schedule } from "effect"
import { SqlClient } from "effect/sql"

// Daily SQLite backups: VACUUM INTO writes a consistent copy while the server keeps
// running. Copies older than the newest BACKUP_KEEP are deleted.

export const BackupConfig = Config.all({
  directory: Config.option(Config.String("BACKUP_DIR")),
  keep: Config.Int("BACKUP_KEEP").pipe(Config.withDefault(14))
})

export const backupOnce = (directory: string, keep: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    mkdirSync(directory, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const file = join(directory, `podlist-${stamp}.db`)
    yield* sql`VACUUM INTO ${file}`
    const copies = readdirSync(directory)
      .filter((f) => /^podlist-.*\.db$/.test(f))
      .sort()
    for (const old of copies.slice(0, Math.max(0, copies.length - keep))) {
      rmSync(join(directory, old))
    }
    return file
  })

/** Backs up once at start and then every day, if BACKUP_DIR is set. */
export const background = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* BackupConfig
    if (Option.isNone(config.directory)) return
    const directory = config.directory.value
    yield* backupOnce(directory, config.keep).pipe(
      Effect.tap((file) => Effect.log("database backed up", file)),
      Effect.catchCause((cause) => Effect.logError("database backup failed", cause)),
      Effect.repeat(Schedule.spaced(Duration.days(1))),
      Effect.forkScoped
    )
  })
)
