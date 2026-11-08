import { type Device, Operation, PlaybackSettings, State, StateStore, Units } from "@podlist/domain"
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

      const loadState = StateStore.load(defaultPlaybackSettings).pipe(
        Effect.provideService(SqlClient.SqlClient, sql)
      )
      const saveState = (before: State.State | null, after: State.State) =>
        StateStore.save(before, after).pipe(Effect.provideService(SqlClient.SqlClient, sql))

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

      /**
       * Changes that need the Library catalogue are resolved here, so every Device
       * replays the same concrete operations: marking a whole Subscription Played
       * becomes one Played per Episode, and Subscription overrides update the
       * catalogue record.
       */
      const expandServerSide = (o: Operation.Operation, state: State.State) =>
        Effect.gen(function* () {
          const change = o.change
          if (change._tag === "SetSubscriptionOverrides") {
            yield* sql`UPDATE subscription SET
                playback_settings = ${JSON.stringify(change.playbackSettings)},
                played_threshold = ${change.playedThreshold}
              WHERE id = ${change.subscriptionId}`
            return [o]
          }
          if (change._tag !== "MarkSubscriptionPlayed") return [o]
          const episodes = yield* sql<{ id: string }>`
            SELECT e.id FROM episode e
            WHERE e.subscription_id = ${change.subscriptionId}
            ORDER BY e.published`
          return [
            o,
            ...episodes
              .filter((e) => state.episodeStates[e.id]?.played == null)
              .map((e) =>
                Schema.decodeUnknownSync(Operation.Operation)({
                  id: `${o.id}:${e.id}`,
                  deviceId: o.deviceId,
                  sequence: o.sequence,
                  recordedAt: o.recordedAt,
                  change: { _tag: "MarkPlayed", episodeId: e.id, source: { _tag: "User" } }
                })
              )
          ]
        })

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
            // Expand against the result of preceding intentions in this push, not
            // the pre-push episode_state index (ADR 0003's ordered replay).
            const expanded: Array<Operation.Operation> = []
            let after = before
            for (const operation of unique) {
              const concrete = yield* expandServerSide(operation, after)
              after = State.applyOperations(after, concrete).state
              expanded.push(...concrete)
            }
            yield* saveState(hasState ? before : null, after)
            const now = Date.now()
            for (const o of expanded) {
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
