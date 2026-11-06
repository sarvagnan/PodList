import { Device, Operation, type PlaybackSettings, State, StateStore } from "@podlist/domain"
import { Context, Duration, Effect, Layer, Queue, Schema, Semaphore, SubscriptionRef } from "effect"
import { SqlClient } from "effect/sql"
import { upsertEpisodes, upsertSubscriptions } from "./Catalogue.ts"
import { type Offline, Transport } from "./Transport.ts"

// Offline-first sync (ADR 0003). Every edit becomes an Operation in a local outbox and is
// applied at once to the local State, so the UI never waits for the network. A sync
// pushes the outbox, pulls the server's operations since the last cursor, and rebuilds:
// confirmed State = the server's; local State = confirmed + whatever is still unsent.
// Network calls happen outside the lock, so editing never waits on a slow connection.

const OperationJson = Schema.fromJsonString(Operation.Operation)
const StateJson = Schema.fromJsonString(State.State)

export interface SyncStatus {
  readonly pending: number
  readonly lastSyncedAt: number | null
  readonly error: string | null
}

export class SyncEngine extends Context.Service<
  SyncEngine,
  {
    /** The local (optimistic) State the UI renders. */
    readonly state: SubscriptionRef.SubscriptionRef<State.State>
    readonly status: SubscriptionRef.SubscriptionRef<SyncStatus>
    readonly deviceId: string
    /** Records an edit: queued for the server and applied locally straight away. */
    readonly record: (change: Operation.Change) => Effect.Effect<void>
    /** One full sync; fails with Offline when the server can't be reached. */
    readonly sync: Effect.Effect<void, Offline>
    /** Syncs now, after edits, every minute and when the browser comes back online. */
    readonly runInBackground: Effect.Effect<never>
  }
>()("@podlist/web/SyncEngine") {
  static readonly layer = (options: {
    readonly defaults: PlaybackSettings.PlaybackSettings
    readonly deviceName: string
  }) =>
    Layer.effect(
      SyncEngine,
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const transport = yield* Transport
        const lock = yield* Semaphore.make(1)
        const withSql = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) =>
          Effect.provideService(effect, SqlClient.SqlClient, sql)

        const getMeta = (key: string) =>
          sql<{ value: string }>`SELECT value FROM sync_meta WHERE key = ${key}`.pipe(
            Effect.map(([row]) => row?.value)
          )
        const setMeta = (key: string, value: string) =>
          sql`INSERT OR REPLACE INTO sync_meta (key, value) VALUES (${key}, ${value})`

        let deviceId = yield* getMeta("deviceId")
        if (deviceId === undefined) {
          deviceId = crypto.randomUUID()
          yield* setMeta("deviceId", deviceId)
        }
        const myDevice = deviceId
        const confirmedJson = yield* getMeta("confirmedState")
        let confirmed =
          confirmedJson === undefined
            ? State.initial(options.defaults)
            : Schema.decodeSync(StateJson)(confirmedJson)
        const state = yield* SubscriptionRef.make(
          yield* withSql(StateStore.ensure(options.defaults))
        )
        const countPending = sql<{ n: number }>`SELECT count(*) AS n FROM outbox`.pipe(
          Effect.map(([row]) => row?.n ?? 0)
        )
        const status = yield* SubscriptionRef.make<SyncStatus>({
          pending: yield* countPending,
          lastSyncedAt: null,
          error: null
        })
        const triggers = yield* Queue.sliding<void>(1)

        const outbox = sql<{
          seq: number
          operation: string
        }>`SELECT seq, operation FROM outbox ORDER BY seq`.pipe(
          Effect.map((rows) =>
            rows.map((r) => ({
              seq: r.seq,
              operation: Schema.decodeSync(OperationJson)(r.operation)
            }))
          )
        )

        const record = (change: Operation.Change) =>
          Effect.gen(function* () {
            const sequence = Number((yield* getMeta("sequence")) ?? "0")
            const operation = Schema.decodeUnknownSync(Operation.Operation)({
              id: crypto.randomUUID(),
              deviceId: myDevice,
              sequence,
              recordedAt: Date.now(),
              change: Schema.encodeSync(Operation.Change)(change)
            })
            yield* sql`INSERT INTO outbox ${sql.insert({
              id: operation.id,
              operation: Schema.encodeSync(OperationJson)(operation)
            })}`
            yield* setMeta("sequence", String(sequence + 1))
            const before = yield* SubscriptionRef.get(state)
            const after = State.apply(before, operation.change, { at: operation.recordedAt })
            yield* withSql(StateStore.save(before, after))
            yield* SubscriptionRef.set(state, after)
            yield* SubscriptionRef.update(status, (s) => ({ ...s, pending: s.pending + 1 }))
          }).pipe(
            sql.withTransaction,
            Effect.orDie,
            lock.withPermits(1),
            Effect.tap(() => Queue.offer(triggers, undefined))
          )

        const syncCatalogue = Effect.gen(function* () {
          let since = Number((yield* getMeta("catalogueCursor").pipe(Effect.orDie)) ?? "0")
          for (;;) {
            const page = yield* transport.catalogue(since)
            yield* Effect.gen(function* () {
              yield* withSql(upsertSubscriptions(page.subscriptions))
              yield* withSql(upsertEpisodes(page.episodes))
              yield* setMeta("catalogueCursor", String(page.cursor))
            }).pipe(sql.withTransaction, Effect.orDie)
            since = page.cursor
            if (!page.more) return
          }
        })

        const sync = Effect.gen(function* () {
          if ((yield* getMeta("registered").pipe(Effect.orDie)) === undefined) {
            yield* transport.registerDevice(
              Schema.decodeUnknownSync(Device.Device)({
                id: myDevice,
                name: options.deviceName,
                kind: "pwa",
                registeredAt: Date.now()
              })
            )
            yield* setMeta("registered", "1").pipe(Effect.orDie)
          }
          // Network first, outside the lock.
          const toSend = yield* outbox.pipe(Effect.orDie)
          if (toSend.length > 0) yield* transport.push(toSend.map((o) => o.operation))
          const cursor = Number((yield* getMeta("userCursor").pipe(Effect.orDie)) ?? "0")
          const pulled = yield* transport.pull(cursor)

          // Then rebuild under the lock, keeping edits made while we were talking to the server.
          yield* Effect.gen(function* () {
            confirmed = pulled.snapshot ?? State.applyOperations(confirmed, pulled.operations).state
            const sentUpTo = toSend.at(-1)?.seq ?? 0
            yield* sql`DELETE FROM outbox WHERE seq <= ${sentUpTo}`
            const stillPending = (yield* outbox).map((o) => o.operation)
            const before = yield* SubscriptionRef.get(state)
            const after = State.applyOperations(confirmed, stillPending).state
            yield* withSql(StateStore.save(before, after))
            yield* setMeta("confirmedState", Schema.encodeSync(StateJson)(confirmed))
            yield* setMeta("userCursor", String(pulled.cursor))
            yield* SubscriptionRef.set(state, after)
            yield* SubscriptionRef.set(status, {
              pending: stillPending.length,
              lastSyncedAt: Date.now(),
              error: null
            })
          }).pipe(sql.withTransaction, Effect.orDie, lock.withPermits(1))

          yield* syncCatalogue
        }).pipe(
          Effect.tapError((e) =>
            SubscriptionRef.update(status, (s) => ({ ...s, error: e.message }))
          )
        )

        const runInBackground = Effect.gen(function* () {
          const online = () => Queue.offerUnsafe(triggers, undefined)
          yield* Effect.acquireRelease(
            Effect.sync(() => window.addEventListener("online", online)),
            () => Effect.sync(() => window.removeEventListener("online", online))
          )
          yield* Queue.offer(triggers, undefined)
          for (;;) {
            yield* Queue.take(triggers).pipe(Effect.timeout(Duration.minutes(1)), Effect.ignore)
            yield* Effect.sleep(Duration.seconds(2)) // let a burst of edits settle
            yield* Queue.clear(triggers)
            yield* Effect.ignore(sync)
          }
        }).pipe(Effect.scoped) as Effect.Effect<never>

        return SyncEngine.of({ state, status, deviceId: myDevice, record, sync, runInBackground })
      })
    )
}
