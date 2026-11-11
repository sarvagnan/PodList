import { type Operation, PlaybackSettings, Units } from "@podlist/domain"
import { Effect, Layer, Stream, SubscriptionRef } from "effect"
import { Atom } from "effect/reactivity"
import { DataLayer } from "../data/DataLayer.ts"
import { localClientLayer } from "../data/LocalClient.ts"
import { Downloads } from "../downloads/Downloads.ts"
import { artworkSrc } from "../lib/artwork.ts"
import { LibraryClient } from "../library/LibraryClient.ts"
import { Player } from "../platform/Player.ts"
import { Playback, type SleepRequest } from "../playback/Playback.ts"
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

// Kept for fallback and Volume Boost; Playback reads the host URL locally (ADR 0009).
const audioUrl = (id: string) => `/api/episodes/${id}/audio`

/** Playback plays a stored download when this Device has one. */
const PlaybackLive = Layer.unwrap(
  Effect.gen(function* () {
    const downloads = yield* Downloads
    return Playback.layer({
      audioUrl,
      localAudio: downloads.playableUrl,
      artworkUrl: (url) => new URL(artworkSrc(url, 256), location.origin).href
    })
  })
)

// Milestone 1: both builds still select the local client.
export const AppLayer = PlaybackLive.pipe(
  Layer.provideMerge(localClientLayer({ defaults, deviceName: deviceName(), audioUrl })),
  Layer.provide(Player.layerWeb),
  Layer.provide(Transport.layerHttp(location.origin)),
  Layer.provideMerge(LibraryClient.layerHttp(location.origin))
)

export const runtime = Atom.runtime(AppLayer)

/**
 * The local (optimistic) user State; updates on every edit and sync. It stays Initial
 * until the local database has loaded, so screens never show a made-up empty State.
 */
export const stateAtom = runtime.atom(
  Stream.unwrap(
    Effect.gen(function* () {
      const engine = yield* DataLayer
      return SubscriptionRef.changes(engine.state)
    })
  )
)

export const syncStatusAtom = runtime.atom(
  Stream.unwrap(
    Effect.gen(function* () {
      const engine = yield* DataLayer
      return SubscriptionRef.changes(engine.status)
    })
  )
)

/** Mounted once at the root: keeps the Device in sync while the app is open. */
export const backgroundSyncAtom = runtime.atom(
  Effect.gen(function* () {
    const engine = yield* DataLayer
    yield* Effect.forkScoped(engine.runInBackground)
  })
)

/** Records an edit (applied locally at once, synced in the background). */
export const recordAtom = runtime.fn(
  (change: Operation.Change) =>
    Effect.gen(function* () {
      const engine = yield* DataLayer
      yield* engine.record(change)
    }),
  // Quick edits (a View's conditions) must each be recorded, not cancel one another.
  { concurrent: true }
)

/** This Device's id: Download Rules are per Device. */
export const deviceIdAtom = runtime.atom(Effect.map(DataLayer, (engine) => engine.deviceId))

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
  | { readonly _tag: "retry" }
  | { readonly _tag: "skip"; readonly seconds: number }
  | { readonly _tag: "seek"; readonly seconds: number }
  | { readonly _tag: "playEntry"; readonly playlistId: string; readonly episodeId: string }
  | { readonly _tag: "setSpeed"; readonly speed: number }
  | { readonly _tag: "setSleep"; readonly sleep: SleepRequest | null }

/** Player controls: play/pause, skip, seek and Play from here. */
export const playbackAtom = runtime.fn((command: Command) =>
  Effect.gen(function* () {
    const playback = yield* Playback
    switch (command._tag) {
      case "toggle":
        return yield* playback.toggle
      case "retry":
        return yield* playback.retry
      case "skip":
        return yield* playback.skip(command.seconds)
      case "seek":
        return yield* playback.seek(command.seconds)
      case "playEntry":
        return yield* playback.playEntry(command.playlistId, command.episodeId)
      case "setSpeed":
        return yield* playback.setSpeed(command.speed)
      case "setSleep":
        return yield* playback.setSleep(command.sleep)
    }
  })
)

/** Downloads on this Device, by Episode. */
export const downloadsAtom = runtime.atom(
  Stream.unwrap(
    Effect.gen(function* () {
      const downloads = yield* Downloads
      return SubscriptionRef.changes(downloads.status)
    })
  )
)

/** Download, stop, or delete an Episode's download on this Device. */
export const downloadAtom = runtime.fn(
  (command: { readonly _tag: "download" | "cancel" | "remove"; readonly episodeId: string }) =>
    Effect.gen(function* () {
      const downloads = yield* Downloads
      return yield* downloads[command._tag](command.episodeId)
    })
)
