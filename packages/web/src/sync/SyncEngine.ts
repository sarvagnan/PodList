import {
  Device,
  Operation,
  type PlaybackSettings,
  Protocol,
  State,
  StateStore,
  Units
} from "@podlist/domain"
import { Context, Duration, Effect, Layer, Queue, Schema, Semaphore, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { catalogueKey, type DataStatus } from "../data/DataLayer.ts"
import { upsertEpisodes, upsertSubscriptions } from "./Catalogue.ts"
import { Offline, SyncBlocked, Transport } from "./Transport.ts"

export type { DataStatus as SyncStatus } from "../data/DataLayer.ts"
export { catalogueKey } from "../data/DataLayer.ts"

// Offline-first sync (ADR 0003). Every edit becomes an Operation in a local outbox and is
// applied at once to the local State, so the UI never waits for the network. A sync
// pushes the outbox, pulls the server's operations since the last cursor, and rebuilds:
// confirmed State = the server's; local State = confirmed + whatever is still unsent.
// Network calls happen outside the lock, so editing never waits on a slow connection.

const OperationJson = Schema.fromJsonString(Operation.Operation)
const StateJson = Schema.fromJsonString(State.State)

export class SyncEngine extends Context.Service<
  SyncEngine,
  {
    /** The local (optimistic) State the UI renders. */
    readonly state: SubscriptionRef.SubscriptionRef<State.State>
    readonly status: SubscriptionRef.SubscriptionRef<DataStatus>
    readonly deviceId: string
    /** Records an edit: queued for the server and applied locally straight away. */
    readonly record: (change: Operation.Change) => Effect.Effect<void>
    /** One full sync; fails with Offline when the server can't be reached. */
    readonly sync: Effect.Effect<void, Offline>
    /** Queue mapped source operations and save a destination checkpoint in one transaction. */
    readonly queueBringOver?: (
      operations: ReadonlyArray<Operation.Operation>,
      checkpoint: { readonly key: string; readonly value: string }
    ) => Effect.Effect<void, Offline>
    /** Syncs now, after edits, every minute and when the browser comes back online. */
    readonly runInBackground: Effect.Effect<never>
  }
>()("@podlist/web/SyncEngine") {
  static readonly layer = (options: {
    readonly defaults: PlaybackSettings.PlaybackSettings
    readonly deviceName: string
    readonly deviceKind?: "pwa" | "desktop"
    readonly standalone?: boolean
  }) =>
    Layer.effect(
      SyncEngine,
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const reactivity = yield* Reactivity.Reactivity
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
        const state = yield* SubscriptionRef.make(
          yield* withSql(StateStore.ensure(options.defaults))
        )
        if (options.standalone) {
          const status = yield* SubscriptionRef.make<DataStatus>({
            pending: 0,
            lastSyncedAt: null,
            error: null,
            ready: true
          })
          const record = (change: Operation.Change) =>
            Effect.gen(function* () {
              const before = yield* SubscriptionRef.get(state)
              const at = Units.EpochMillis.make(Date.now())
              const after = yield* Effect.gen(function* () {
                let sequence = Number((yield* getMeta("sequence")) ?? "0")
                let updated = before
                const append = (concrete: Operation.Change) =>
                  Effect.gen(function* () {
                    const operation = Schema.decodeUnknownSync(Operation.Operation)({
                      id: crypto.randomUUID(),
                      deviceId: myDevice,
                      sequence,
                      recordedAt: at,
                      change: Schema.encodeSync(Operation.Change)(concrete)
                    })
                    yield* sql`INSERT INTO local_operation (seq, operation)
                      VALUES (${sequence++}, ${Schema.encodeSync(OperationJson)(operation)})`
                    updated = State.apply(updated, concrete, { at })
                  })
                if (change._tag === "SetSubscriptionOverrides") {
                  yield* sql`UPDATE subscription SET
                    playback_settings = ${JSON.stringify(change.playbackSettings)},
                    played_threshold = ${change.playedThreshold}
                    WHERE id = ${change.subscriptionId}`
                }
                if (change._tag === "MarkSubscriptionPlayed") {
                  const episodes = yield* sql<{ id: string }>`
                    SELECT id FROM episode WHERE subscription_id = ${change.subscriptionId}
                    ORDER BY published, id`
                  for (const { id } of episodes) {
                    if (before.episodeStates[id]?.played != null) continue
                    yield* append(
                      Schema.decodeUnknownSync(Operation.Change)({
                        _tag: "MarkPlayed",
                        episodeId: id,
                        source: { _tag: "User" }
                      })
                    )
                  }
                } else {
                  yield* append(change)
                }
                yield* withSql(StateStore.save(before, updated))
                yield* setMeta("sequence", String(sequence))
                return updated
              }).pipe(sql.withTransaction, Effect.orDie)
              yield* SubscriptionRef.set(state, after)
              if (change._tag === "SetSubscriptionOverrides") {
                yield* reactivity.invalidate([catalogueKey])
              }
            }).pipe(lock.withPermits(1), Effect.uninterruptible)
          return SyncEngine.of({
            state,
            status,
            deviceId: myDevice,
            record,
            sync: Effect.void,
            runInBackground: Effect.never
          })
        }
        const deviceKind = options.deviceKind ?? "pwa"
        const confirmedJson = yield* getMeta("confirmedState")
        let confirmed =
          confirmedJson === undefined
            ? State.initial(options.defaults)
            : Schema.decodeSync(StateJson)(confirmedJson)
        const countPending = sql<{ n: number }>`SELECT count(*) AS n FROM outbox`.pipe(
          Effect.map(([row]) => row?.n ?? 0)
        )
        const status = yield* SubscriptionRef.make<DataStatus>({
          pending: yield* countPending,
          lastSyncedAt: null,
          error: null,
          ready: (yield* getMeta("catalogueCursor").pipe(Effect.orDie)) !== undefined
        })
        const syncLock = yield* Semaphore.make(1)
        const triggers = yield* Queue.sliding<void>(1)
        let blocked: SyncBlocked | undefined

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
            if (
              (Protocol.minimumVersion(change._tag) ?? Protocol.version + 1) >
              Protocol.legacyVersion
            ) {
              const version = yield* (
                transport.serverVersion ?? Effect.succeed(Protocol.legacyVersion)
              ).pipe(Effect.orDie)
              if (version < (Protocol.minimumVersion(change._tag) ?? Protocol.version + 1))
                return yield* Effect.die(new Error("Update the PodList server to save this change"))
            }
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

        const queueBringOver = (
          operations: ReadonlyArray<Operation.Operation>,
          checkpoint: { readonly key: string; readonly value: string }
        ) =>
          Effect.gen(function* () {
            const before = yield* SubscriptionRef.get(state)
            const applied = yield* Effect.gen(function* () {
              const fresh: Operation.Operation[] = []
              for (const operation of operations) {
                const rows = yield* sql<{ id: string }>`
                  INSERT INTO outbox (id, operation)
                  VALUES (${operation.id}, ${Schema.encodeSync(OperationJson)(operation)})
                  ON CONFLICT (id) DO NOTHING RETURNING id`
                if (rows.length) fresh.push(operation)
              }
              const after = State.applyOperations(before, fresh).state
              yield* withSql(StateStore.save(before, after))
              yield* setMeta(checkpoint.key, checkpoint.value)
              return { after, pending: yield* countPending }
            }).pipe(sql.withTransaction)
            yield* SubscriptionRef.set(state, applied.after)
            yield* SubscriptionRef.update(status, (previous) => ({
              ...previous,
              pending: applied.pending
            }))
            yield* Queue.offer(triggers, undefined)
          }).pipe(
            lock.withPermits(1),
            Effect.uninterruptible,
            Effect.mapError(
              () => new Offline("Could not save the Bring Over checkpoint. Try again.")
            )
          )

        const syncCatalogue = Effect.gen(function* () {
          let since = Number((yield* getMeta("catalogueCursor").pipe(Effect.orDie)) ?? "0")
          for (;;) {
            const page = yield* transport.catalogue(since)
            const subscriptions = [...page.subscriptions, ...(page.referencedSubscriptions ?? [])]
            yield* Effect.gen(function* () {
              yield* withSql(upsertSubscriptions(subscriptions))
              yield* withSql(upsertEpisodes(page.episodes))
              yield* setMeta("catalogueCursor", String(page.cursor))
            }).pipe(sql.withTransaction, Effect.orDie)
            if (subscriptions.length > 0 || page.episodes.length > 0) {
              yield* reactivity.invalidate([catalogueKey])
            }
            since = page.cursor
            if (!page.more) return
          }
        })

        const sync = (retry = false) =>
          Effect.gen(function* () {
            if (retry) blocked = undefined
            if (blocked) return yield* Effect.fail(blocked)
            const registered = yield* getMeta("registered").pipe(Effect.orDie)
            // Older Electron builds saved "1" after registering this ID as a PWA.
            if (
              registered === undefined ||
              (deviceKind === "desktop" && registered !== "desktop")
            ) {
              yield* transport.registerDevice(
                Schema.decodeUnknownSync(Device.Device)({
                  id: myDevice,
                  name: options.deviceName,
                  kind: deviceKind,
                  registeredAt: Date.now()
                })
              )
              yield* setMeta("registered", deviceKind === "desktop" ? deviceKind : "1").pipe(
                Effect.orDie
              )
            }
            // Network first, outside the lock.
            const toSend = yield* outbox.pipe(Effect.orDie)
            if (toSend.length > 0) yield* transport.push(toSend.map((o) => o.operation))
            const cursor = Number((yield* getMeta("userCursor").pipe(Effect.orDie)) ?? "0")
            const pulled = yield* transport.pull(cursor)

            // Then rebuild under the lock, keeping edits made while we were talking to the server.
            yield* Effect.gen(function* () {
              confirmed =
                pulled.snapshot ?? State.applyOperations(confirmed, pulled.operations).state
              const sentUpTo = toSend.at(-1)?.seq ?? 0
              yield* sql`DELETE FROM outbox WHERE seq <= ${sentUpTo}`
              const stillPending = (yield* outbox).map((o) => o.operation)
              const before = yield* SubscriptionRef.get(state)
              const after = State.applyOperations(confirmed, stillPending).state
              yield* withSql(StateStore.save(before, after))
              yield* setMeta("confirmedState", Schema.encodeSync(StateJson)(confirmed))
              yield* setMeta("userCursor", String(pulled.cursor))
              yield* SubscriptionRef.set(state, after)
              yield* SubscriptionRef.update(status, (s) => ({
                ...s,
                pending: stillPending.length,
                lastSyncedAt: Date.now(),
                error: null,
                syncBlocked: undefined
              }))
            }).pipe(sql.withTransaction, Effect.orDie, lock.withPermits(1))

            yield* syncCatalogue
            yield* SubscriptionRef.update(status, (s) => ({ ...s, ready: true }))
          }).pipe(
            Effect.tapError((e) => {
              if (e instanceof SyncBlocked) blocked = e
              return SubscriptionRef.update(status, (s) => ({
                ...s,
                error: blocked?.message ?? e.message,
                ...(blocked ? { syncBlocked: blocked.reason } : {})
              }))
            }),
            syncLock.withPermits(1)
          )

        const runInBackground = Effect.gen(function* () {
          // Sync when the connection returns, and when the app is looked at again (the
          // phone brought back from the background), so it never shows a stale Library.
          const online = () => Queue.offerUnsafe(triggers, undefined)
          const visible = () => {
            if (document.visibilityState === "visible") Queue.offerUnsafe(triggers, undefined)
          }
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              window.addEventListener("online", online)
              document.addEventListener("visibilitychange", visible)
            }),
            () =>
              Effect.sync(() => {
                window.removeEventListener("online", online)
                document.removeEventListener("visibilitychange", visible)
              })
          )
          // Sync at once on start, so a fresh Device shows its Library without a wait.
          yield* Effect.ignore(sync())
          for (;;) {
            yield* Queue.take(triggers).pipe(Effect.timeout(Duration.minutes(1)), Effect.ignore)
            yield* Effect.sleep(Duration.seconds(2)) // let a burst of edits settle
            yield* Queue.clear(triggers)
            yield* Effect.ignore(sync())
          }
        }).pipe(Effect.scoped) as Effect.Effect<never>

        return SyncEngine.of({
          state,
          status,
          deviceId: myDevice,
          record,
          sync: sync(true),
          queueBringOver,
          runInBackground
        })
      })
    )
}
