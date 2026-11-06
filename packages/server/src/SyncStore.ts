import { type Device, Operation, PlaybackSettings, Sql, State, Units } from "@podlist/domain"
import { Context, Effect, Layer, Schema, Semaphore } from "effect"
import { SqlClient } from "effect/sql"

// The server's copy of the user's State and the log of every operation applied to it
// (ADR 0003). Pushes are serialised; each runs in one transaction.

const OperationJson = Schema.fromJsonString(Operation.Operation)
const encodeOperation = Schema.encodeSync(OperationJson)
const decodeOperation = Schema.decodeSync(OperationJson)

/** Server-only tables, migrated separately from the shared schema. */
export const migrations = {
  "0001_sync_log": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE TABLE device (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      registered_at INTEGER NOT NULL
    )`
    yield* sql`CREATE TABLE operation_log (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      device_id TEXT NOT NULL,
      received_at INTEGER NOT NULL,
      operation TEXT NOT NULL
    )`
  })
} satisfies Record<string, Effect.Effect<void, unknown, SqlClient.SqlClient>>

export const defaultPlaybackSettings = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})

type Rows = Sql.StateRows
type Key = { readonly [K in keyof Rows]: (row: Rows[K][number]) => string }
const keys: Key = {
  playlist: (r) => r.id,
  view: (r) => r.id,
  episode_state: (r) => r.episode_id,
  entry_index: (r) => `${r.playlist_id}\u0000${r.episode_id}`,
  download_rule: (r) => `${r.subscription_id}\u0000${r.device_id}`,
  setting: (r) => r.key
}
const keyColumns: { readonly [K in keyof Rows]: ReadonlyArray<string> } = {
  playlist: ["id"],
  view: ["id"],
  episode_state: ["episode_id"],
  entry_index: ["playlist_id", "episode_id"],
  download_rule: ["subscription_id", "device_id"],
  setting: ["key"]
}

export class SyncStore extends Context.Service<
  SyncStore,
  {
    readonly registerDevice: (device: Device.Device) => Effect.Effect<Device.Device>
    readonly push: (
      operations: ReadonlyArray<Operation.Operation>
    ) => Effect.Effect<{ readonly cursor: number; readonly accepted: number }>
    readonly pull: (since: number) => Effect.Effect<{
      readonly cursor: number
      readonly snapshot: State.State | null
      readonly operations: ReadonlyArray<Operation.Operation>
    }>
  }
>()("@podlist/server/SyncStore") {
  static readonly layer = Layer.effect(
    SyncStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const lock = yield* Semaphore.make(1)

      const loadState = Effect.gen(function* () {
        const setting = yield* sql<Rows["setting"][number]>`SELECT key, value FROM setting`
        if (setting.length === 0) return State.initial(defaultPlaybackSettings)
        return Sql.rowsToState({
          setting,
          playlist: yield* sql<Rows["playlist"][number]>`SELECT id, doc FROM playlist`,
          view: yield* sql<Rows["view"][number]>`SELECT id, doc FROM view`,
          episode_state: yield* sql<Rows["episode_state"][number]>`
            SELECT episode_id, played_at, played_source, starred FROM episode_state`,
          download_rule: yield* sql<Rows["download_rule"][number]>`
            SELECT subscription_id, device_id, mode, keep_at_most FROM download_rule`
        })
      })

      /** Writes only the rows that changed between two States. */
      const saveState = (before: State.State | null, after: State.State) =>
        Effect.gen(function* () {
          const old = before === null ? null : Sql.stateToRows(before)
          const next = Sql.stateToRows(after)
          for (const table of Object.keys(keys) as Array<keyof Rows>) {
            const keyOf = keys[table] as (row: object) => string
            const oldRows = new Map((old?.[table] ?? []).map((r) => [keyOf(r), r]))
            const newRows = new Map(next[table].map((r) => [keyOf(r), r]))
            for (const [key, row] of oldRows) {
              if (newRows.has(key)) continue
              const where = keyColumns[table]
                .map((c) => sql`${sql(c)} = ${(row as Record<string, string>)[c] ?? null}`)
                .reduce((a, b) => sql`${a} AND ${b}`)
              yield* sql`DELETE FROM ${sql(table)} WHERE ${where}`
            }
            for (const [key, row] of newRows) {
              const prior = oldRows.get(key)
              if (prior !== undefined && JSON.stringify(prior) === JSON.stringify(row)) continue
              yield* sql`INSERT OR REPLACE INTO ${sql(table)} ${sql.insert(row as Record<string, unknown>)}`
            }
          }
        })

      const cursorNow = sql<{
        cursor: number | null
      }>`SELECT max(seq) AS cursor FROM operation_log`.pipe(
        Effect.map((rows) => rows[0]?.cursor ?? 0)
      )

      const registerDevice = (device: Device.Device) =>
        sql`INSERT INTO device ${sql.insert({
          id: device.id,
          name: device.name,
          kind: device.kind,
          registered_at: device.registeredAt
        })}
          ON CONFLICT (id) DO UPDATE SET name = excluded.name, kind = excluded.kind`.pipe(
          Effect.as(device),
          Effect.orDie
        )

      const push = (operations: ReadonlyArray<Operation.Operation>) =>
        Effect.gen(function* () {
          const ids = operations.map((o) => o.id)
          const seen =
            ids.length === 0
              ? []
              : yield* sql<{ id: string }>`SELECT id FROM operation_log WHERE ${sql.in("id", ids)}`
          const fresh = operations.filter((o) => !seen.some((s) => s.id === o.id))
          const unique = fresh.filter((o, i) => fresh.findIndex((x) => x.id === o.id) === i)
          if (unique.length > 0) {
            const hasState = (yield* sql`SELECT 1 FROM setting LIMIT 1`).length > 0
            const before = yield* loadState
            const after = State.applyOperations(before, unique).state
            yield* saveState(hasState ? before : null, after)
            const now = Date.now()
            for (const o of unique) {
              yield* sql`INSERT INTO operation_log ${sql.insert({
                id: o.id,
                device_id: o.deviceId,
                received_at: now,
                operation: encodeOperation(o)
              })}`
            }
          }
          return { cursor: yield* cursorNow, accepted: unique.length }
        }).pipe(sql.withTransaction, Effect.orDie, lock.withPermits(1))

      const pull = (since: number) =>
        Effect.gen(function* () {
          const cursor = yield* cursorNow
          if (since <= 0) return { cursor, snapshot: yield* loadState, operations: [] }
          const rows = yield* sql<{ operation: string }>`
            SELECT operation FROM operation_log WHERE seq > ${since} ORDER BY seq`
          return {
            cursor,
            snapshot: null,
            operations: rows.map((r) => decodeOperation(r.operation))
          }
        }).pipe(Effect.orDie)

      return SyncStore.of({ registerDevice, push, pull })
    })
  )
}
