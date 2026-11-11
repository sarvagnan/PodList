import { type Operation, PlaybackSettings, Units } from "@podlist/domain"
import { Effect, Layer, Stream, SubscriptionRef } from "effect"
import { Atom } from "effect/reactivity"
import { clientLayer, playerLayer } from "#client"
import { DataLayer } from "../data/DataLayer.ts"
import { Downloads } from "../downloads/DownloadService.ts"
import { artworkSrc } from "../lib/artwork.ts"
import { LibraryClient } from "../library/LibraryClient.ts"
import { Playback, type SleepRequest } from "../playback/Playback.ts"
import { Transport } from "../sync/Transport.ts"

// The app runtime selects its platform data and playback services at build time.
// Only Electron waits for the local database gate.

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

// Vite selects the platform adapter and excludes local storage from web.
export const AppLayer = PlaybackLive.pipe(
  Layer.provideMerge(
    clientLayer({ defaults, deviceName: deviceName(), audioUrl, origin: location.origin })
  ),
  Layer.provide(playerLayer),
  Layer.provide(Transport.layerHttp(location.origin)),
  Layer.provideMerge(LibraryClient.layerHttp(location.origin))
)

export const runtime = Atom.runtime(AppLayer)

/**
 * The optimistic user State; updates on accepted edits and server catch-up.
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

export const retrySyncAtom = runtime.fn(() => Effect.flatMap(DataLayer, (data) => data.sync))
