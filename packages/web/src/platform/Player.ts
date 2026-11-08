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
  readonly proxyUrl?: string
  readonly volumeBoost?: boolean
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
  Notice: { readonly message: string | null }
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
  static readonly layerBrowser = (createAudio: () => HTMLAudioElement = () => new Audio()) =>
    Layer.effect(
      Player,
      Effect.gen(function* () {
        const events = yield* Queue.unbounded<PlayerEvent>()
        const remote = yield* Queue.unbounded<RemoteCommand>()
        const offer = (event: PlayerEvent) => Queue.offerUnsafe(events, event)
        let audio = createAudio()
        let cleanup = () => {}
        let context: AudioContext | null = null
        let track: Track | null = null
        let candidates: Array<{ url: string; boost: boolean }> = []
        let source = 0
        let wanted = false
        let rate = 1
        let timeout: ReturnType<typeof setTimeout> | undefined
        const clearTimer = () => clearTimeout(timeout)
        const dispose = () => {
          clearTimer()
          cleanup()
          audio.pause()
          audio.removeAttribute("src")
          audio.load()
          void context?.close()
          context = null
        }
        const failed = (message: string) => {
          clearTimer()
          wanted = false
          offer(PlayerEvent.Failed({ message }))
        }
        const fallback = () => {
          if (source + 1 >= candidates.length) return false
          const position = audio.currentTime
          source++
          select(position)
          if (wanted) void start().catch((error: Error) => failed(error.message))
          return true
        }
        const armTimer = () => {
          clearTimer()
          timeout = setTimeout(() => {
            if (wanted && !fallback()) failed("The Episode’s audio didn’t load.")
          }, 10_000)
        }
        // Each source gets a fresh element: Web Audio cannot be detached, and even at
        // unity gain it silences a CORS-less host (pod-13u).
        const select = (position: number) => {
          dispose()
          audio = createAudio()
          const element = audio
          const candidate = candidates[source]
          if (!candidate) return
          audio.preload = "auto"
          audio.playbackRate = rate
          if (candidate.boost) {
            audio.crossOrigin = "anonymous"
            context = new AudioContext()
            const compressor = context.createDynamicsCompressor()
            compressor.threshold.value = -30
            compressor.knee.value = 20
            compressor.ratio.value = 4
            const gain = context.createGain()
            gain.gain.value = 1.8
            context
              .createMediaElementSource(audio)
              .connect(compressor)
              .connect(gain)
              .connect(context.destination)
            void context.resume()
          }
          const listeners: Array<[string, () => void]> = [
            [
              "playing",
              () => {
                clearTimer()
                offer(PlayerEvent.Playing())
              }
            ],
            ["pause", () => offer(PlayerEvent.Paused())],
            [
              "ended",
              () => {
                wanted = false
                offer(PlayerEvent.Ended())
              }
            ],
            [
              "timeupdate",
              () =>
                offer(
                  PlayerEvent.Position({
                    seconds: element.currentTime,
                    duration: Number.isFinite(element.duration) ? element.duration : null
                  })
                )
            ],
            [
              "error",
              () => {
                if (!fallback()) failed(element.error?.message ?? "Playback failed")
              }
            ]
          ]
          for (const [name, listener] of listeners) element.addEventListener(name, listener)
          cleanup = () => {
            for (const [name, listener] of listeners) element.removeEventListener(name, listener)
          }
          audio.src = candidate.url
          audio.currentTime = position
          offer(
            PlayerEvent.Notice({
              message:
                track?.volumeBoost && !candidate.boost
                  ? "Playing directly without Volume Boost."
                  : null
            })
          )
        }
        const start = async (): Promise<void> => {
          wanted = true
          const element = audio
          armTimer()
          try {
            await element.play()
          } catch (error) {
            // An error event may already have switched the source, or a new Entry loaded.
            if (element !== audio || !wanted) return
            if (error instanceof DOMException && error.name === "NotAllowedError") {
              clearTimer()
              throw error
            }
            if (!fallback()) {
              clearTimer()
              throw error
            }
          }
        }
        yield* Effect.addFinalizer(() => Effect.sync(dispose))

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
                artwork:
                  info.artworkUrl === null ? [] : [{ src: info.artworkUrl, sizes: "512x512" }]
              })
            }
          })

        const load = (next: Track) =>
          Effect.gen(function* () {
            wanted = false
            track = next
            source = 0
            const local = next.url.startsWith("blob:")
            candidates =
              local || !next.proxyUrl || next.proxyUrl === next.url
                ? [{ url: next.url, boost: next.volumeBoost ?? false }]
                : next.volumeBoost
                  ? [
                      { url: next.proxyUrl, boost: true },
                      { url: next.url, boost: false }
                    ]
                  : [
                      { url: next.url, boost: false },
                      { url: next.proxyUrl, boost: false }
                    ]
            select(next.startAt)
            yield* showInfo(next)
          })
        const setVolumeBoost = (on: boolean) =>
          Effect.gen(function* () {
            if (!track || !!track.volumeBoost === on) return
            const resume = wanted
            yield* load({ ...track, startAt: audio.currentTime, volumeBoost: on })
            if (resume)
              yield* Effect.promise(() => start().catch((error: Error) => failed(error.message)))
          })

        return Player.of({
          setVolumeBoost,
          load,
          describe: showInfo,
          play: Effect.tryPromise({
            try: start,
            catch: (e) => new PlayError({ message: e instanceof Error ? e.message : String(e) })
          }),
          pause: Effect.sync(() => {
            wanted = false
            clearTimer()
            audio.pause()
          }),
          seek: (seconds) => Effect.sync(() => (audio.currentTime = seconds)),
          setRate: (next) =>
            Effect.sync(() => {
              rate = next
              audio.playbackRate = next
            }),
          events: Stream.fromQueue(events),
          remote: Stream.fromQueue(remote)
        })
      })
    )

  static readonly layerWeb = Player.layerBrowser()
}
