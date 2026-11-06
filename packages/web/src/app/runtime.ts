import { type Operation, PlaybackSettings, State, Units } from "@podlist/domain"
import { Effect, Layer, Stream, SubscriptionRef } from "effect"
import { Atom } from "effect/reactivity"
import { SqlClient } from "effect/sql"
import * as LocalDb from "../platform/LocalDb.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { Transport } from "../sync/Transport.ts"

// The app's Effect runtime: local database, server transport and sync engine, exposed to
// React through atoms. Built only once this tab owns the database (see TabGate).

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})

const deviceName = () => {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return "Android phone"
  if (/Electron/i.test(ua)) return "Mac app"
  if (/Macintosh/i.test(ua)) return "Mac browser"
  return "Browser"
}

export const AppLayer = SyncEngine.layer({ defaults, deviceName: deviceName() }).pipe(
  Layer.provideMerge(LocalDb.layerWeb()),
  Layer.provide(Transport.layerHttp(location.origin))
)

export const runtime = Atom.runtime(AppLayer)

/** The local (optimistic) user State; updates on every edit and sync. */
export const stateAtom = runtime.atom(
  Stream.unwrap(
    Effect.gen(function* () {
      const engine = yield* SyncEngine
      return SubscriptionRef.changes(engine.state)
    })
  ),
  { initialValue: State.initial(defaults) }
)

export const syncStatusAtom = runtime.atom(
  Stream.unwrap(
    Effect.gen(function* () {
      const engine = yield* SyncEngine
      return SubscriptionRef.changes(engine.status)
    })
  )
)

/** Mounted once at the root: keeps the Device in sync while the app is open. */
export const backgroundSyncAtom = runtime.atom(
  Effect.gen(function* () {
    const engine = yield* SyncEngine
    yield* Effect.forkScoped(engine.runInBackground)
  })
)

/** Records an edit (applied locally at once, synced in the background). */
export const recordAtom = runtime.fn((change: Operation.Change) =>
  Effect.gen(function* () {
    const engine = yield* SyncEngine
    yield* engine.record(change)
  })
)

/** Runs a read-only query against the local database. */
export const queryAtom = <A>(run: (sql: SqlClient.SqlClient) => Effect.Effect<A, unknown>) =>
  runtime.atom(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      return yield* run(sql)
    })
  )
