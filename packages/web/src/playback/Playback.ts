import { Operation, PlayedRules, type State, Units } from "@podlist/domain"
import { Clock, Context, Effect, Layer, Schema, Semaphore, Stream, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { Player } from "../platform/Player.ts"
import { catalogueKey, SyncEngine } from "../sync/SyncEngine.ts"

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
}

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
    readonly seek: (seconds: number) => Effect.Effect<void>
    /** Moves by a number of seconds: negative goes back. */
    readonly skip: (seconds: number) => Effect.Effect<void>
    /** Makes the Playlist active, puts its Cursor on the Entry and plays it. */
    readonly playEntry: (playlistId: string, episodeId: string) => Effect.Effect<void>
  }
>()("@podlist/web/Playback") {
  static readonly layer = (options: {
    readonly audioUrl: (episodeId: string) => string
    readonly reportEveryMillis?: number
  }) =>
    Layer.effect(
      Playback,
      Effect.gen(function* () {
        const player = yield* Player
        const engine = yield* SyncEngine
        const sql = yield* SqlClient.SqlClient
        const reactivity = yield* Reactivity.Reactivity
        const now = yield* SubscriptionRef.make<NowPlaying | null>(null)
        let lastReport = { at: 0, position: -1 }
        // The loaded Entry's Played threshold, and whether it has been finished (marked
        // Played) and has reached the end of its audio.
        let loaded = { threshold: null as number | null, finished: false, ended: false }

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
            }>`SELECT e.title, s.title AS podcast, e.duration, e.artwork_url,
                 s.artwork_url AS podcast_artwork_url, s.played_threshold
               FROM episode e JOIN subscription s ON s.id = e.subscription_id
               WHERE e.id = ${episodeId}`.pipe(Effect.orDie)
            return {
              title: row?.title ?? "Episode unavailable",
              podcast: row?.podcast ?? "",
              artworkUrl: row?.artwork_url ?? row?.podcast_artwork_url ?? null,
              duration: row?.duration ?? null,
              threshold: row?.played_threshold ?? null
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
              return
            }
            // Leaving an Entry: keep where it got to.
            if (current !== null) yield* report(current.position)
            const { threshold, ...info } = yield* lookup(next.entry.episodeId)
            loaded = { threshold, finished: false, ended: false }
            const track: NowPlaying = {
              playlistId: next.playlist.id,
              episodeId: next.entry.episodeId,
              ...info,
              playing: false,
              position: next.entry.position,
              error: null
            }
            lastReport = { at: yield* Clock.currentTimeMillis, position: next.entry.position }
            yield* player.load({
              url: options.audioUrl(track.episodeId),
              title: track.title,
              podcast: track.podcast,
              artworkUrl: track.artworkUrl,
              startAt: track.position
            })
            yield* player.setRate(state.playbackSettings.speed)
            yield* SubscriptionRef.set(now, track)
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
                  const at = yield* Clock.currentTimeMillis
                  if (
                    current?.playing &&
                    at - lastReport.at >= (options.reportEveryMillis ?? reportEveryMillis)
                  ) {
                    yield* report(event.seconds)
                  }
                  return
                }
                case "Ended": {
                  // The end of the audio always finishes it, even without a known duration.
                  yield* finish
                  loaded = { ...loaded, ended: true }
                  const ended = yield* SubscriptionRef.get(now)
                  yield* update((n) => ({ ...n, playing: false }))
                  // Move on to the Playlist's next Entry, or stop after the last one.
                  yield* follow(yield* SubscriptionRef.get(engine.state))
                  const next = yield* SubscriptionRef.get(now)
                  if (next !== null && next.episodeId !== ended?.episodeId) yield* start
                  return
                }
                case "Failed":
                  return yield* update((n) => ({ ...n, playing: false, error: event.message }))
              }
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
              if (info.title === current.title && info.artworkUrl === current.artworkUrl) return
              yield* update((n) =>
                n.episodeId === current.episodeId
                  ? { ...n, ...info, duration: n.duration ?? info.duration }
                  : n
              )
              yield* player.describe(info)
            })
          )
          .pipe(Stream.runDrain, Effect.forkScoped)

        return Playback.of({ now, play, pause, toggle, seek, skip, playEntry })
      })
    )
}
