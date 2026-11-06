import { mkdtempSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { backupOnce } from "../src/Backup.ts"
import * as Database from "../src/Database.ts"

describe("backups", () => {
  it.effect("writes a consistent copy and keeps only the newest ones", () =>
    Effect.gen(function* () {
      const directory = mkdtempSync(join(tmpdir(), "podlist-backup-"))
      for (let i = 0; i < 3; i++) yield* backupOnce(directory, 2)
      const files = readdirSync(directory)
      assert.strictEqual(files.length, 2)
      const copy = new DatabaseSync(join(directory, files[0] ?? ""))
      const tables = copy
        .prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name = 'episode'")
        .get()
      assert.strictEqual(tables?.n, 1)
    }).pipe(Effect.provide(Database.layer(":memory:")))
  )
})
