import {
  Device,
  Ids,
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
import {
  catalogueKey,
  type DataStatus,
  entryMembershipKey,
  episodeFactsKey,
  playedKey,
  progressMembershipKey,
  type RecordBatch
} from "../data/DataLayer.ts"
import { LocalWork } from "../platform/LocalWork.ts"
import { restoreStateClasses } from "../platform/workerState.ts"
import { episodeRow, insertCatalogueRows, subscriptionRow } from "./Catalogue.ts"
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
    readonly recordBatch: RecordBatch
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
        const worker = yield* Effect.serviceOption(LocalWork)
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
          yield* withSql(
            StateStore.ensure(
              options.defaults,
              worker._tag === "Some"
                ? (rows) =>
                    worker.value
                      .run({ task: "decodeRows", rows })
                      .pipe(Effect.flatMap(restoreStateClasses), Effect.orDie)
                : undefined
            )
          )
        )
        const invalidate = (dirty: StateStore.QueryChanges, catalogue = false) =>
          reactivity.invalidate([
            ...(catalogue ? [catalogueKey] : []),
            ...(dirty.played ? [playedKey] : []),
            ...(dirty.episodeFacts ? [episodeFactsKey] : []),
            ...(dirty.entries ? [entryMembershipKey] : []),
            ...(dirty.progress ? [progressMembershipKey] : [])
          ])
        const triggers = yield* Queue.sliding<void>(1)
        const countPending = sql<{ n: number }>`SELECT count(*) AS n FROM outbox`.pipe(
          Effect.map(([row]) => row?.n ?? 0)
        )
        const status = yield* SubscriptionRef.make<DataStatus>({
          pending: options.standalone ? 0 : yield* countPending,
          lastSyncedAt: null,
          error: null,
          ready: options.standalone === true || (yield* getMeta("catalogueCursor")) !== undefined
        })
        const recordBatch: RecordBatch = (plan) =>
          Effect.gen(function* () {
            const before = yield* SubscriptionRef.get(state)
            const edits = plan(before)
            let step = edits.next()
            if (step.done) return step.value

            const recorded = yield* Effect.gen(function* () {
              let sequence = Number((yield* getMeta("sequence")) ?? "0")
              let after = before
              let catalogue = false
              let serverVersion: number | undefined
              const changes: Operation.Change[] = []
              const operations: Array<{ id: string; seq: number; operation: string }> = []
              const append = (change: Operation.Change, recordedAt: Units.EpochMillis) => {
                const id = Ids.OperationId.make(crypto.randomUUID())
                const operation = new Operation.Operation({
                  id,
                  deviceId: Ids.DeviceId.make(myDevice),
                  sequence,
                  recordedAt,
                  change
                })
                operations.push({
                  id,
                  seq: sequence++,
                  operation: Schema.encodeSync(OperationJson)(operation)
                })
                after = State.apply(after, change, { at: recordedAt })
                changes.push(change)
              }
              for (let processed = 0; !step.done; processed++) {
                const change = step.value
                const at = Units.EpochMillis.make(Date.now())
                if (options.standalone) {
                  if (change._tag === "SetSubscriptionOverrides") {
                    yield* sql`UPDATE subscription SET
                      playback_settings = ${JSON.stringify(change.playbackSettings)},
                      played_threshold = ${change.playedThreshold}
                      WHERE id = ${change.subscriptionId}`
                    catalogue = true
                  }
                  if (change._tag === "MarkSubscriptionPlayed") {
                    const episodes = yield* sql<{ id: string }>`
                      SELECT id FROM episode WHERE subscription_id = ${change.subscriptionId}
                      ORDER BY published, id`
                    for (const [index, { id }] of episodes.entries()) {
                      if (index % 32 === 31) yield* Effect.yieldNow
                      if (after.episodeStates[id]?.played != null) continue
                      append(
                        Schema.decodeUnknownSync(Operation.Change)({
                          _tag: "MarkPlayed",
                          episodeId: id,
                          source: { _tag: "User" }
                        }),
                        at
                      )
                    }
                  } else append(change, at)
                } else {
                  const minimum = Protocol.minimumVersion(change._tag) ?? Protocol.version + 1
                  if (minimum > Protocol.legacyVersion) {
                    serverVersion ??= yield* transport.serverVersion ??
                      Effect.succeed(Protocol.legacyVersion)
                    if (serverVersion < minimum)
                      return yield* Effect.die(
                        new Error("Update the PodList server to save this change")
                      )
                  }
                  append(change, at)
                }
                if (processed % 32 === 31) yield* Effect.yieldNow
                step = edits.next(after)
              }
              for (let i = 0; i < operations.length; i += 128) {
                const [first, ...rest] = operations.slice(i, i + 128)
                if (first === undefined) break
                if (options.standalone) {
                  const row = ({ seq, operation }: typeof first) => ({ seq, operation })
                  yield* sql`INSERT INTO local_operation ${sql.insert([row(first), ...rest.map(row)])}`
                } else {
                  const row = ({ id, operation }: typeof first) => ({ id, operation })
                  yield* sql`INSERT INTO outbox ${sql.insert([row(first), ...rest.map(row)])}`
                }
              }
              const dirty = yield* withSql(StateStore.saveChanges(before, after, changes))
              yield* setMeta("sequence", String(sequence))
              return { after, catalogue, dirty, count: operations.length, result: step.value }
            }).pipe(sql.withTransaction, Effect.orDie)

            yield* SubscriptionRef.set(state, recorded.after)
            yield* invalidate(recorded.dirty, recorded.catalogue)
            if (!options.standalone) {
              yield* SubscriptionRef.update(status, (s) => ({
                ...s,
                pending: s.pending + recorded.count
              }))
              yield* Queue.offer(triggers, undefined)
            }
            return recorded.result
          }).pipe(Effect.orDie, Effect.uninterruptible, lock.withPermits(1))

        const record = (change: Operation.Change) =>
          recordBatch(function* () {
            yield change
          })

        if (options.standalone) {
          return SyncEngine.of({
            state,
            status,
            deviceId: myDevice,
            record,
            recordBatch,
            sync: Effect.void,
            runInBackground: Effect.never
          })
        }
        const deviceKind = options.deviceKind ?? "pwa"
        const confirmedJson = yield* getMeta("confirmedState")
        let confirmed =
          confirmedJson === undefined
            ? State.initial(options.defaults)
            : worker._tag === "Some"
              ? yield* worker.value
                  .run({ task: "decodeState", json: confirmedJson })
                  .pipe(Effect.flatMap(restoreStateClasses))
              : Schema.decodeSync(StateJson)(confirmedJson)
        const syncLock = yield* Semaphore.make(1)
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
              const dirty = yield* withSql(
                StateStore.saveChanges(
                  before,
                  after,
                  fresh.map((o) => o.change)
                )
              )
              yield* setMeta(checkpoint.key, checkpoint.value)
              return { after, dirty, pending: yield* countPending }
            }).pipe(sql.withTransaction)
            yield* SubscriptionRef.set(state, applied.after)
            yield* invalidate(applied.dirty)
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

        const catalogueRows = (since: number) =>
          worker._tag === "Some" && transport.catalogueText
            ? transport.catalogueText(since).pipe(
                Effect.flatMap((json) => worker.value.run({ task: "catalogue", json })),
                Effect.mapError((error) =>
                  error instanceof Offline ? error : new Offline(error.message)
                )
              )
            : transport.catalogue(since).pipe(
                Effect.map((page) => ({
                  cursor: page.cursor,
                  more: page.more,
                  subscriptions: [
                    ...page.subscriptions,
                    ...(page.referencedSubscriptions ?? [])
                  ].map(subscriptionRow),
                  episodes: page.episodes.map(episodeRow)
                }))
              )

        const syncCatalogue = Effect.gen(function* () {
          let since = Number((yield* getMeta("catalogueCursor").pipe(Effect.orDie)) ?? "0")
          for (;;) {
            const page = yield* catalogueRows(since)
            yield* Effect.gen(function* () {
              yield* withSql(insertCatalogueRows("subscription", page.subscriptions))
              yield* withSql(insertCatalogueRows("episode", page.episodes))
              yield* setMeta("catalogueCursor", String(page.cursor))
            }).pipe(sql.withTransaction, Effect.orDie)
            if (page.subscriptions.length > 0 || page.episodes.length > 0) {
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

            const nextConfirmed =
              pulled.snapshot ?? State.applyOperations(confirmed, pulled.operations).state
            const confirmedJson =
              confirmed === nextConfirmed
                ? undefined
                : worker._tag === "Some"
                  ? yield* worker.value
                      .run({ task: "encodeState", state: nextConfirmed })
                      .pipe(Effect.mapError((error) => new Offline(error.message)))
                  : Schema.encodeSync(StateJson)(nextConfirmed)

            // Keep edits made while the server and Worker were preparing the confirmed State.
            yield* Effect.gen(function* () {
              const durable = yield* Effect.gen(function* () {
                const sentUpTo = toSend.at(-1)?.seq ?? 0
                if (sentUpTo > 0) yield* sql`DELETE FROM outbox WHERE seq <= ${sentUpTo}`
                const stillPending = (yield* outbox).map((o) => o.operation)
                const before = yield* SubscriptionRef.get(state)
                const after =
                  confirmed === nextConfirmed && sentUpTo === 0
                    ? before
                    : State.applyOperations(nextConfirmed, stillPending).state
                const dirty = yield* withSql(StateStore.saveChanges(before, after))
                if (confirmedJson !== undefined) yield* setMeta("confirmedState", confirmedJson)
                yield* setMeta("userCursor", String(pulled.cursor))
                return { after, before, dirty, pending: stillPending.length }
              }).pipe(sql.withTransaction)
              confirmed = nextConfirmed
              if (durable.after !== durable.before) yield* SubscriptionRef.set(state, durable.after)
              yield* invalidate(durable.dirty)
              yield* SubscriptionRef.update(status, (s) => ({
                ...s,
                pending: durable.pending,
                lastSyncedAt: Date.now(),
                error: null,
                syncBlocked: undefined
              }))
            }).pipe(Effect.orDie, Effect.uninterruptible, lock.withPermits(1))

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
          recordBatch,
          sync: sync(true),
          queueBringOver,
          runInBackground
        })
      })
    )
}
