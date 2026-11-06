import { type Operation, PlaybackSettings, State, Units } from "@podlist/domain"
import { Effect, Layer, Stream, SubscriptionRef } from "effect"
import { Atom } from "effect/reactivity"
import { SqlClient } from "effect/sql"
import { artworkSrc } from "../lib/artwork.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { Player } from "../platform/Player.ts"
import { Playback } from "../playback/Playback.ts"
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

export const AppLayer = Playback.layer({
  audioUrl: (id) => `/api/episodes/${id}/audio`,
  artworkUrl: (url) => new URL(artworkSrc(url, 256), location.origin).href
}).pipe(
  Layer.provideMerge(SyncEngine.layer({ defaults, deviceName: deviceName() })),
  Layer.provideMerge(LocalDb.layerWeb()),
  Layer.provide(Player.layerWeb),
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

/** The loaded Entry and whether it is playing; null when nothing is queued. */
export const nowPlayingAtom = runtime.atom(
  Stream.unwrap(
    Effect.gen(function* () {
      const playback = yield* Playback
      return SubscriptionRef.changes(playback.now)
    })
  )
)

type Command =
  | { readonly _tag: "toggle" }
  | { readonly _tag: "skip"; readonly seconds: number }
  | { readonly _tag: "seek"; readonly seconds: number }
  | { readonly _tag: "playEntry"; readonly playlistId: string; readonly episodeId: string }

/** Player controls: play/pause, skip, seek and Play from here. */
export const playbackAtom = runtime.fn((command: Command) =>
  Effect.gen(function* () {
    const playback = yield* Playback
    switch (command._tag) {
      case "toggle":
        return yield* playback.toggle
      case "skip":
        return yield* playback.skip(command.seconds)
      case "seek":
        return yield* playback.seek(command.seconds)
      case "playEntry":
        return yield* playback.playEntry(command.playlistId, command.episodeId)
    }
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
