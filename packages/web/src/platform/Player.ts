import { Context, Data, Effect, Layer, Queue, Stream } from "effect"

// The Player seam (ADR 0007). The web implementation drives an <audio> element and the
// Media Session API (lock screen, notification and headset controls); a native shell
// swaps in Media3 / AVPlayer behind the same interface.

/** What the lock screen and notification show for the current track. */
export interface TrackInfo {
  readonly title: string
  readonly podcast: string
  readonly artworkUrl: string | null
}

export interface Track extends TrackInfo {
  readonly url: string
  /** Where to start, in seconds (the Entry's Position). */
  readonly startAt: number
}

type NoFields = Record<never, never>
export type PlayerEvent = Data.TaggedEnum<{
  Playing: NoFields
  Paused: NoFields
  Position: { readonly seconds: number; readonly duration: number | null }
  Ended: NoFields
  Failed: { readonly message: string }
}>
export const PlayerEvent = Data.taggedEnum<PlayerEvent>()

/** Commands from outside the app: lock screen, headset buttons, media keys. */
export type RemoteCommand = "play" | "pause" | "back" | "forward" | "previous" | "next"

export class PlayError extends Data.TaggedError("PlayError")<{ readonly message: string }> {}

export class Player extends Context.Service<
  Player,
  {
    readonly load: (track: Track) => Effect.Effect<void>
    /** Updates the lock screen details without reloading the audio. */
    readonly describe: (info: TrackInfo) => Effect.Effect<void>
    readonly play: Effect.Effect<void, PlayError>
    readonly pause: Effect.Effect<void>
    readonly seek: (seconds: number) => Effect.Effect<void>
    readonly setRate: (rate: number) => Effect.Effect<void>
    /** Louder, evened-out speech (compressor and gain), for quiet or uneven podcasts. */
    readonly setVolumeBoost: (on: boolean) => Effect.Effect<void>
    readonly events: Stream.Stream<PlayerEvent>
    readonly remote: Stream.Stream<RemoteCommand>
  }
>()("@podlist/web/Player") {
  static readonly layerWeb = Layer.effect(
    Player,
    Effect.gen(function* () {
      const audio = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const element = new Audio()
          element.preload = "auto"
          return element
        }),
        (element) =>
          Effect.sync(() => {
            element.pause()
            element.removeAttribute("src")
            element.load()
          })
      )
      const events = yield* Queue.unbounded<PlayerEvent>()
      const remote = yield* Queue.unbounded<RemoteCommand>()
      const offer = (event: PlayerEvent) => Queue.offerUnsafe(events, event)
      const duration = () => (Number.isFinite(audio.duration) ? audio.duration : null)

      const listeners: Array<[string, () => void]> = [
        ["playing", () => offer(PlayerEvent.Playing())],
        ["pause", () => offer(PlayerEvent.Paused())],
        ["ended", () => offer(PlayerEvent.Ended())],
        [
          "timeupdate",
          () => offer(PlayerEvent.Position({ seconds: audio.currentTime, duration: duration() }))
        ],
        [
          "error",
          () => offer(PlayerEvent.Failed({ message: audio.error?.message ?? "Playback failed" }))
        ]
      ]
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          for (const [name, f] of listeners) audio.addEventListener(name, f)
        }),
        () =>
          Effect.sync(() => {
            for (const [name, f] of listeners) audio.removeEventListener(name, f)
          })
      )

      const session = "mediaSession" in navigator ? navigator.mediaSession : undefined
      const actions: Array<[MediaSessionAction, RemoteCommand]> = [
        ["play", "play"],
        ["pause", "pause"],
        ["seekbackward", "back"],
        ["seekforward", "forward"],
        ["previoustrack", "previous"],
        ["nexttrack", "next"]
      ]
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          for (const [action, command] of actions) {
            session?.setActionHandler(action, () => Queue.offerUnsafe(remote, command))
          }
          session?.setActionHandler("seekto", (details) => {
            if (details.seekTime !== undefined) audio.currentTime = details.seekTime
          })
        }),
        () =>
          Effect.sync(() => {
            for (const [action] of actions) session?.setActionHandler(action, null)
            session?.setActionHandler("seekto", null)
          })
      )

      const showInfo = (info: TrackInfo) =>
        Effect.sync(() => {
          if (session && typeof MediaMetadata !== "undefined") {
            session.metadata = new MediaMetadata({
              title: info.title,
              artist: info.podcast,
              artwork: info.artworkUrl === null ? [] : [{ src: info.artworkUrl, sizes: "512x512" }]
            })
          }
        })

      const load = (track: Track) =>
        Effect.gen(function* () {
          audio.src = track.url
          audio.currentTime = track.startAt
          yield* showInfo(track)
        })

      // Volume boost routes the element through Web Audio. The graph is only built the
      // first time boost is switched on, so playback that never uses it stays a plain
      // media element (which is what background playback on phones relies on).
      let boost: {
        compressor: DynamicsCompressorNode
        gain: GainNode
        context: AudioContext
      } | null = null
      const setVolumeBoost = (on: boolean) =>
        Effect.sync(() => {
          if (!on && boost === null) return
          if (boost === null) {
            const context = new AudioContext()
            const source = context.createMediaElementSource(audio)
            const compressor = context.createDynamicsCompressor()
            compressor.threshold.value = -30
            compressor.knee.value = 20
            compressor.ratio.value = 4
            const gain = context.createGain()
            source.connect(compressor).connect(gain).connect(context.destination)
            boost = { compressor, gain, context }
          }
          if (boost.context.state === "suspended") void boost.context.resume()
          // Off: unity gain with no compression (the graph stays, as it must).
          boost.compressor.ratio.value = on ? 4 : 1
          boost.gain.gain.value = on ? 1.8 : 1
        })

      return Player.of({
        setVolumeBoost,
        load,
        describe: showInfo,
        play: Effect.tryPromise({
          try: () => audio.play(),
          catch: (e) => new PlayError({ message: e instanceof Error ? e.message : String(e) })
        }),
        pause: Effect.sync(() => audio.pause()),
        seek: (seconds) => Effect.sync(() => (audio.currentTime = seconds)),
        setRate: (rate) => Effect.sync(() => (audio.playbackRate = rate)),
        events: Stream.fromQueue(events),
        remote: Stream.fromQueue(remote)
      })
    })
  )
}
