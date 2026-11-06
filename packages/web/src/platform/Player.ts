import { Context, Data, Effect, Layer, Queue, Stream } from "effect"

// The Player seam (ADR 0007). The web implementation drives an <audio> element and the
// Media Session API (lock screen, notification and headset controls); a native shell
// swaps in Media3 / AVPlayer behind the same interface.

export interface Track {
  readonly url: string
  readonly title: string
  readonly podcast: string
  readonly artworkUrl: string | null
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
    readonly play: Effect.Effect<void, PlayError>
    readonly pause: Effect.Effect<void>
    readonly seek: (seconds: number) => Effect.Effect<void>
    readonly setRate: (rate: number) => Effect.Effect<void>
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

      const load = (track: Track) =>
        Effect.sync(() => {
          audio.src = track.url
          audio.currentTime = track.startAt
          if (session && typeof MediaMetadata !== "undefined") {
            session.metadata = new MediaMetadata({
              title: track.title,
              artist: track.podcast,
              artwork:
                track.artworkUrl === null ? [] : [{ src: track.artworkUrl, sizes: "512x512" }]
            })
          }
        })

      return Player.of({
        load,
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
