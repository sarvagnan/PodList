import { Operation, PlaybackSettings, PlayedRules, type State, Units } from "@podlist/domain"
import {
  Clock,
  Context,
  Duration,
  Effect,
  Fiber,
  Layer,
  Queue,
  Schema,
  Semaphore,
  Stream,
  SubscriptionRef
} from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import {
  fromStoredChapters as fromStored,
  nextChapterStart,
  type PlayerChapter,
  toPlayerChapter
} from "../lib/chapters.ts"
import { effectiveSettings, storedOverride } from "../lib/playbackSettings.ts"
import { Player } from "../platform/Player.ts"
import { catalogueKey, SyncEngine } from "../sync/SyncEngine.ts"
import { Transport } from "../sync/Transport.ts"

// Plays the Active Playlist's Cursor Entry through the Player seam and reports where
// listening got to, as ReportPosition operations, so every Device resumes at the same
// place (latest listen wins, ADR 0003). Finishing an Entry marks it Played from its
// Playlist, and playback carries on with the Playlist's next Entry.

export interface NowPlaying {
  readonly playlistId: string
  readonly episodeId: string
  readonly title: string
  readonly podcast: string
  readonly artworkUrl: string | null
  readonly playing: boolean
  readonly position: number
  readonly duration: number | null
  readonly error: string | null
  /** The Episode's Chapters, in order; empty when it has none (or they aren't known yet). */
  readonly chapters: ReadonlyArray<PlayerChapter>
  /** The speed it plays at: the podcast's own, or the global default. */
  readonly speed: number
  readonly sleep: SleepTimer | null
}

/** When playback will pause by itself. */
export type SleepTimer =
  | { readonly _tag: "At"; readonly until: number }
  | { readonly _tag: "EndOfEpisode" }
  | { readonly _tag: "EndOfChapter"; readonly at: number }

export type SleepRequest =
  | { readonly _tag: "Minutes"; readonly minutes: number }
  | { readonly _tag: "EndOfEpisode" }
  | { readonly _tag: "EndOfChapter" }

/** How often a Position is reported while playing. */
export const reportEveryMillis = 15_000
export const backSeconds = 15
export const forwardSeconds = 30

const decodeChange = Schema.decodeUnknownSync(Operation.Change)

export class Playback extends Context.Service<
  Playback,
  {
    /** The loaded Entry and its playback status; null when the Active Playlist has no Cursor. */
    readonly now: SubscriptionRef.SubscriptionRef<NowPlaying | null>
    readonly play: Effect.Effect<void>
    readonly pause: Effect.Effect<void>
    readonly toggle: Effect.Effect<void>
    /** After a playback error: loads the Entry again where it was and plays. */
    readonly retry: Effect.Effect<void>
    readonly seek: (seconds: number) => Effect.Effect<void>
    /** Moves by a number of seconds: negative goes back. */
    readonly skip: (seconds: number) => Effect.Effect<void>
    /** Makes the Playlist active, puts its Cursor on the Entry and plays it. */
    readonly playEntry: (playlistId: string, episodeId: string) => Effect.Effect<void>
    /** Changes the speed: the podcast's own if it has one, otherwise the global default. */
    readonly setSpeed: (speed: number) => Effect.Effect<void>
    /** Sets or clears (null) the sleep timer. */
    readonly setSleep: (request: SleepRequest | null) => Effect.Effect<void>
  }
>()("@podlist/web/Playback") {
  static readonly layer = (options: {
    readonly audioUrl: (episodeId: string) => string
    /** The Episode's audio stored on this Device, if any: played instead of streaming. */
    readonly localAudio?: (episodeId: string) => Effect.Effect<string | null>
    /** Where the lock screen fetches a feed image from; the image itself by default. */
    readonly artworkUrl?: (url: string) => string
    readonly reportEveryMillis?: number
  }) =>
    Layer.effect(
      Playback,
      Effect.gen(function* () {
        const player = yield* Player
        const engine = yield* SyncEngine
        const sql = yield* SqlClient.SqlClient
        const reactivity = yield* Reactivity.Reactivity
        const transport = yield* Transport
        const now = yield* SubscriptionRef.make<NowPlaying | null>(null)
        const scope = yield* Effect.scope
        const lockScreenArt = (url: string | null) =>
          url === null ? null : (options.artworkUrl?.(url) ?? url)
        let lastReport = { at: 0, position: -1 }
        // The loaded Entry's Played threshold, and whether it has been finished (marked
        // Played) and has reached the end of its audio.
        let loaded = {
          threshold: null as number | null,
          finished: false,
          ended: false,
          subscriptionId: null as string | null,
          override: {} as PlaybackSettings.PlaybackSettingsOverride,
          skipOutro: 0
        }

        /** The Episode's details from the local catalogue, which may not have synced yet. */
        const lookup = (episodeId: string) =>
          Effect.gen(function* () {
            const [row] = yield* sql<{
              title: string
              podcast: string
              duration: number | null
              artwork_url: string | null
              podcast_artwork_url: string | null
              played_threshold: number | null
              chapters: string
              subscription_id: string
              playback_settings: string | null
            }>`SELECT e.title, s.title AS podcast, e.duration, e.artwork_url,
                 s.artwork_url AS podcast_artwork_url, s.played_threshold, e.chapters,
                 s.id AS subscription_id, s.playback_settings
               FROM episode e JOIN subscription s ON s.id = e.subscription_id
               WHERE e.id = ${episodeId}`.pipe(Effect.orDie)
            return {
              title: row?.title ?? "",
              podcast: row?.podcast ?? "",
              artworkUrl: row?.artwork_url ?? row?.podcast_artwork_url ?? null,
              duration: row?.duration ?? null,
              threshold: row?.played_threshold ?? null,
              subscriptionId: row?.subscription_id ?? null,
              override: storedOverride(row?.playback_settings ?? null),
              chapters: row ? fromStored(row.chapters) : []
            }
          })

        const target = (state: State.State) => {
          const playlist = state.playlists.find((p) => p.id === state.activePlaylistId)
          const entry = playlist?.entries.find((e) => e.episodeId === playlist.cursor)
          return playlist && entry ? { playlist, entry } : undefined
        }

        // One load at a time: Play from here and a State change can both ask for a load,
        // and a second load would interrupt the first one's play.
        const loading = yield* Semaphore.make(1)

        /** Loads the Active Playlist's Cursor Entry unless it is already loaded. */
        const follow = (state: State.State) =>
          Effect.gen(function* () {
            const next = target(state)
            const current = yield* SubscriptionRef.get(now)
            if (next === undefined) {
              if (current !== null) {
                yield* player.pause
                yield* SubscriptionRef.set(now, null)
              }
              return
            }
            if (
              current?.playlistId === next.playlist.id &&
              current.episodeId === next.entry.episodeId &&
              !loaded.finished
            ) {
              // Another Device listened to this Entry since this one last reported: the
              // latest listen wins here too, so a paused player moves to it (ADR 0003).
              const remote = next.entry
              if (
                !current.playing &&
                remote.positionAt > lastReport.at &&
                Math.abs(remote.position - current.position) >= 1
              ) {
                lastReport = { at: remote.positionAt, position: remote.position }
                yield* player.seek(remote.position)
                yield* SubscriptionRef.set(now, { ...current, position: remote.position })
              }
              return
            }
            // Leaving an Entry: keep where it got to.
            if (current !== null) yield* report(current.position)
            const { threshold, subscriptionId, override, ...info } = yield* lookup(
              next.entry.episodeId
            )
            const settings = effectiveSettings(state.playbackSettings, override)
            loaded = {
              threshold,
              finished: false,
              ended: false,
              subscriptionId,
              override,
              skipOutro: settings.skipOutro
            }
            // Skip intro: an Episode started from (near) the beginning starts after it.
            const startAt =
              settings.skipIntro > 0 &&
              next.entry.position < settings.skipIntro &&
              (info.duration === null || info.duration > settings.skipIntro)
                ? settings.skipIntro
                : next.entry.position
            const previousSleep = current?.sleep ?? null
            const track: NowPlaying = {
              playlistId: next.playlist.id,
              episodeId: next.entry.episodeId,
              ...info,
              playing: false,
              position: startAt,
              error: null,
              speed: settings.speed,
              // A timer in minutes carries on to the next Episode; the others were for this one.
              sleep: previousSleep?._tag === "At" ? previousSleep : null
            }
            lastReport = { at: yield* Clock.currentTimeMillis, position: next.entry.position }
            yield* player.load({
              url:
                (options.localAudio ? yield* options.localAudio(track.episodeId) : null) ??
                options.audioUrl(track.episodeId),
              title: track.title,
              podcast: track.podcast,
              artworkUrl: lockScreenArt(track.artworkUrl),
              startAt: track.position
            })
            yield* player.setRate(settings.speed)
            yield* player.setVolumeBoost(settings.volumeBoost)
            yield* SubscriptionRef.set(now, track)
            // Ask the server too: it finds Chapters the first time anyone asks.
            yield* transport.chapters(track.episodeId).pipe(
              Effect.flatMap((chapters) =>
                chapters.length === 0
                  ? Effect.void
                  : update((n) =>
                      n.episodeId === track.episodeId
                        ? { ...n, chapters: chapters.map(toPlayerChapter) }
                        : n
                    )
              ),
              Effect.ignore,
              Effect.forkIn(scope)
            )
          }).pipe(loading.withPermits(1))

        const report = (position: number) =>
          Effect.gen(function* () {
            const current = yield* SubscriptionRef.get(now)
            // A finished Entry has been reset or removed; later Positions would undo that.
            if (current === null || loaded.finished) return
            if (Math.abs(position - lastReport.position) < 1) return
            const at = yield* Clock.currentTimeMillis
            lastReport = { at, position }
            yield* engine.record(
              decodeChange({
                _tag: "ReportPosition",
                playlistId: current.playlistId,
                episodeId: current.episodeId,
                position: Units.Seconds.make(Math.max(0, position)),
                listenedAt: at
              })
            )
          })

        const update = (f: (n: NowPlaying) => NowPlaying) =>
          SubscriptionRef.update(now, (n) => (n === null ? n : f(n)))

        /** Marks the loaded Episode Played from its Playlist; the domain then moves the
         * Cursor on, records History and applies Clear on Played. */
        const finish = Effect.gen(function* () {
          const current = yield* SubscriptionRef.get(now)
          if (current === null || loaded.finished) return
          yield* report(current.position)
          loaded = { ...loaded, finished: true }
          yield* engine.record(
            decodeChange({
              _tag: "MarkPlayed",
              episodeId: current.episodeId,
              source: { _tag: "Playback", playlistId: current.playlistId }
            })
          )
        })

        /** Finished but not at the end yet: stay on it rather than jumping to the next Entry. */
        const holding = (n: NowPlaying | null) =>
          n !== null && (n.playing || (loaded.finished && !loaded.ended))

        const start = player.play.pipe(
          Effect.catch((e) => update((n) => ({ ...n, playing: false, error: e.message })))
        )

        const play = Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(engine.state)
          const playlist = state.playlists.find((p) => p.id === state.activePlaylistId)
          const first = playlist?.entries[0]
          if (playlist && playlist.cursor === null && first) {
            yield* engine.record(
              decodeChange({
                _tag: "SetCursor",
                playlistId: playlist.id,
                episodeId: first.episodeId
              })
            )
          }
          if (!holding(yield* SubscriptionRef.get(now))) {
            yield* follow(yield* SubscriptionRef.get(engine.state))
          }
          if ((yield* SubscriptionRef.get(now)) === null) return
          yield* start
        })

        const pause = player.pause
        const seek = (seconds: number) =>
          Effect.gen(function* () {
            const current = yield* SubscriptionRef.get(now)
            if (current === null) return
            const position = Math.max(0, Math.min(seconds, current.duration ?? seconds))
            yield* player.seek(position)
            yield* update((n) => ({ ...n, position }))
            yield* report(position)
          })
        const skip = (seconds: number) =>
          Effect.gen(function* () {
            const current = yield* SubscriptionRef.get(now)
            if (current !== null) yield* seek(current.position + seconds)
          })
        const toggle = Effect.gen(function* () {
          const current = yield* SubscriptionRef.get(now)
          yield* current?.playing ? pause : play
        })

        const playEntry = (playlistId: string, episodeId: string) =>
          Effect.gen(function* () {
            const state = yield* SubscriptionRef.get(engine.state)
            if (state.activePlaylistId !== playlistId) {
              yield* engine.record(decodeChange({ _tag: "SetActivePlaylist", playlistId }))
            }
            const playlist = state.playlists.find((p) => p.id === playlistId)
            if (playlist?.cursor !== episodeId) {
              yield* engine.record(decodeChange({ _tag: "SetCursor", playlistId, episodeId }))
            }
            yield* follow(yield* SubscriptionRef.get(engine.state))
            if ((yield* SubscriptionRef.get(now)) !== null) yield* start
          })

        /** The Episode is over (its audio ended, or skip outro reached): finish it, then go on
         * to the Playlist's next Entry, unless the sleep timer said to stop here. */
        const endOfEpisode: Effect.Effect<void> = Effect.gen(function* () {
          yield* finish
          loaded = { ...loaded, ended: true }
          const ended = yield* SubscriptionRef.get(now)
          yield* update((n) => ({ ...n, playing: false }))
          yield* follow(yield* SubscriptionRef.get(engine.state))
          const next = yield* SubscriptionRef.get(now)
          if (ended?.sleep?._tag === "EndOfEpisode") return yield* clearSleep
          if (next !== null && next.episodeId !== ended?.episodeId) yield* start
        })

        // Player events drive the status and periodic Position reports.
        yield* player.events.pipe(
          Stream.runForEach((event) =>
            Effect.gen(function* () {
              switch (event._tag) {
                case "Playing":
                  return yield* update((n) => ({ ...n, playing: true, error: null }))
                case "Paused": {
                  yield* update((n) => ({ ...n, playing: false }))
                  const current = yield* SubscriptionRef.get(now)
                  if (current !== null) yield* report(current.position)
                  return
                }
                case "Position": {
                  yield* update((n) => ({
                    ...n,
                    position: event.seconds,
                    duration: event.duration ?? n.duration
                  }))
                  const current = yield* SubscriptionRef.get(now)
                  if (
                    current !== null &&
                    PlayedRules.isFinished(
                      Units.Seconds.make(event.seconds),
                      current.duration === null ? null : Units.Seconds.make(current.duration),
                      loaded.threshold === null ? null : Units.Seconds.make(loaded.threshold)
                    )
                  ) {
                    yield* finish
                  }
                  // Skip outro: the last seconds count as the end of the Episode.
                  if (
                    current?.playing &&
                    loaded.skipOutro > 0 &&
                    current.duration !== null &&
                    !loaded.ended &&
                    event.seconds >= current.duration - loaded.skipOutro
                  ) {
                    yield* player.pause
                    return yield* endOfEpisode
                  }
                  if (
                    current?.sleep?._tag === "EndOfChapter" &&
                    event.seconds >= current.sleep.at
                  ) {
                    yield* clearSleep
                    yield* player.pause
                  }
                  const at = yield* Clock.currentTimeMillis
                  if (
                    current?.playing &&
                    at - lastReport.at >= (options.reportEveryMillis ?? reportEveryMillis)
                  ) {
                    yield* report(event.seconds)
                  }
                  return
                }
                case "Ended":
                  if (loaded.ended) return
                  return yield* endOfEpisode
                case "Failed":
                  return yield* update((n) => ({ ...n, playing: false, error: event.message }))
              }
            })
          ),
          Effect.forkScoped
        )

        // Leaving the page (reload, closing, switching apps, the OS reclaiming it):
        // report where listening got to now rather than at the next 15 s tick.
        const hidden = yield* Queue.unbounded<void>()
        const onHide = () => {
          if (document.visibilityState === "hidden") Queue.offerUnsafe(hidden, undefined)
        }
        const onPageHide = () => Queue.offerUnsafe(hidden, undefined)
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            document.addEventListener("visibilitychange", onHide)
            window.addEventListener("pagehide", onPageHide)
          }),
          () =>
            Effect.sync(() => {
              document.removeEventListener("visibilitychange", onHide)
              window.removeEventListener("pagehide", onPageHide)
            })
        )
        yield* Stream.fromQueue(hidden).pipe(
          Stream.runForEach(() =>
            Effect.gen(function* () {
              const current = yield* SubscriptionRef.get(now)
              if (current !== null) yield* report(current.position)
            })
          ),
          Effect.forkScoped
        )

        // Lock screen, notification and headset buttons.
        yield* player.remote.pipe(
          Stream.runForEach((command) => {
            switch (command) {
              case "play":
                return play
              case "pause":
                return pause
              case "back":
                return skip(-backSeconds)
              case "forward":
                return skip(forwardSeconds)
              case "previous":
                return seek(0)
              case "next":
                return Effect.void
            }
          }),
          Effect.forkScoped
        )

        // Follow the Active Playlist's Cursor (edits here or synced from another Device),
        // except while playing: what this Device is playing wins until it pauses.
        yield* SubscriptionRef.changes(engine.state).pipe(
          Stream.runForEach((state) =>
            Effect.gen(function* () {
              if (holding(yield* SubscriptionRef.get(now))) return
              yield* follow(state)
            })
          ),
          Effect.forkScoped
        )

        // A fresh Device can receive its State before the catalogue: fill in the loaded
        // Entry's details once the Episode arrives.
        yield* reactivity
          .stream(
            [catalogueKey],
            Effect.gen(function* () {
              const current = yield* SubscriptionRef.get(now)
              if (current === null) return
              const { threshold, ...info } = yield* lookup(current.episodeId)
              loaded = { ...loaded, threshold }
              if (
                info.title === current.title &&
                info.artworkUrl === current.artworkUrl &&
                info.chapters.length <= current.chapters.length
              ) {
                return
              }
              yield* update((n) =>
                n.episodeId === current.episodeId
                  ? {
                      ...n,
                      ...info,
                      duration: n.duration ?? info.duration,
                      chapters: info.chapters.length > 0 ? info.chapters : n.chapters
                    }
                  : n
              )
              yield* player.describe({ ...info, artworkUrl: lockScreenArt(info.artworkUrl) })
            })
          )
          .pipe(Stream.runDrain, Effect.forkScoped)

        const retry = Effect.gen(function* () {
          yield* SubscriptionRef.set(now, null)
          yield* follow(yield* SubscriptionRef.get(engine.state))
          if ((yield* SubscriptionRef.get(now)) !== null) yield* start
        })

        const setSpeed = (speed: number) =>
          Effect.gen(function* () {
            const current = yield* SubscriptionRef.get(now)
            if (current === null) return
            yield* player.setRate(speed)
            yield* update((n) => ({ ...n, speed }))
            if (loaded.override.speed !== undefined && loaded.subscriptionId !== null) {
              // This podcast has its own speed: change that one.
              loaded = { ...loaded, override: { ...loaded.override, speed } }
              yield* engine.record(
                decodeChange({
                  _tag: "SetSubscriptionOverrides",
                  subscriptionId: loaded.subscriptionId,
                  playbackSettings: loaded.override,
                  playedThreshold: loaded.threshold
                })
              )
            } else {
              const state = yield* SubscriptionRef.get(engine.state)
              yield* engine.record(
                decodeChange({
                  _tag: "SetPlaybackSettings",
                  settings: {
                    ...Schema.encodeSync(PlaybackSettings.PlaybackSettings)(state.playbackSettings),
                    speed
                  }
                })
              )
            }
          })

        let sleepFiber: Fiber.Fiber<void> | undefined
        const clearSleep = Effect.gen(function* () {
          if (sleepFiber !== undefined) yield* Fiber.interrupt(sleepFiber)
          sleepFiber = undefined
          yield* update((n) => ({ ...n, sleep: null }))
        })
        const setSleep = (request: SleepRequest | null) =>
          Effect.gen(function* () {
            yield* clearSleep
            const current = yield* SubscriptionRef.get(now)
            if (request === null || current === null) return
            switch (request._tag) {
              case "Minutes": {
                const until = (yield* Clock.currentTimeMillis) + request.minutes * 60_000
                yield* update((n) => ({ ...n, sleep: { _tag: "At", until } }))
                sleepFiber = yield* Effect.sleep(Duration.minutes(request.minutes)).pipe(
                  Effect.andThen(player.pause),
                  Effect.andThen(update((n) => ({ ...n, sleep: null }))),
                  Effect.forkIn(scope)
                )
                return
              }
              case "EndOfChapter": {
                const at = nextChapterStart(current.chapters, current.position)
                return yield* update((n) => ({
                  ...n,
                  sleep: at === null ? { _tag: "EndOfEpisode" } : { _tag: "EndOfChapter", at }
                }))
              }
              case "EndOfEpisode":
                return yield* update((n) => ({ ...n, sleep: { _tag: "EndOfEpisode" } }))
            }
          })

        return Playback.of({
          now,
          play,
          pause,
          toggle,
          retry,
          seek,
          skip,
          playEntry,
          setSpeed,
          setSleep
        })
      })
    )
}
