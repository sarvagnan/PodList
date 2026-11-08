import { describe, expect, it } from "@effect/vitest"
import { Library, Operation, PlaybackSettings, type State, Units } from "@podlist/domain"
import { Effect, Layer, Queue, Schema, Stream, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import * as LocalDb from "../platform/LocalDb.ts"
import {
  Player,
  PlayerEvent,
  type RemoteCommand,
  type Track,
  type TrackInfo
} from "../platform/Player.ts"
import { upsertEpisodes, upsertSubscriptions } from "../sync/Catalogue.ts"
import { catalogueKey, SyncEngine } from "../sync/SyncEngine.ts"
import { Offline, Transport } from "../sync/Transport.ts"
import { Playback } from "./Playback.ts"

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1.5,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})

const offline = Transport.of({
  registerDevice: () => Effect.fail(new Offline("offline")),
  push: () => Effect.fail(new Offline("offline")),
  pull: () => Effect.fail(new Offline("offline")),
  catalogue: () => Effect.fail(new Offline("offline")),
  chapters: () => Effect.fail(new Offline("offline"))
})

/** A Player that records what it is asked to do; the test plays the audio element's part. */
const makeFakePlayer = Effect.gen(function* () {
  const events = yield* Queue.unbounded<PlayerEvent>()
  const remote = yield* Queue.unbounded<RemoteCommand>()
  const loads: Array<Track> = []
  const seeks: Array<number> = []
  const rates: Array<number> = []
  const described: Array<TrackInfo> = []
  const boosts: Array<boolean> = []
  const emit = (event: PlayerEvent) => Queue.offerUnsafe(events, event)
  const player = Player.of({
    load: (track) => Effect.sync(() => void loads.push(track)),
    describe: (info) => Effect.sync(() => void described.push(info)),
    play: Effect.sync(() => void emit(PlayerEvent.Playing())),
    pause: Effect.sync(() => void emit(PlayerEvent.Paused())),
    seek: (seconds) => Effect.sync(() => void seeks.push(seconds)),
    setRate: (rate) => Effect.sync(() => void rates.push(rate)),
    setVolumeBoost: (on) => Effect.sync(() => void boosts.push(on)),
    events: Stream.fromQueue(events),
    remote: Stream.fromQueue(remote)
  })
  return {
    player,
    loads,
    seeks,
    rates,
    described,
    boosts,
    emit,
    press: (c: RemoteCommand) => Queue.offerUnsafe(remote, c)
  }
})

const episodes = ["e1", "e2", "e3"].map((id, i) =>
  Schema.decodeUnknownSync(Library.Episode)({
    id,
    subscriptionId: "s",
    guid: id,
    title: `Episode ${id}`,
    description: "",
    published: i,
    duration: 60,
    audioUrl: `https://cdn.test/${id}.mp3`,
    artwork: null,
    chapters: [],
    audioUpdatedAt: null
  })
)
const subscription = Schema.decodeUnknownSync(Library.Subscription)({
  id: "s",
  feedUrl: "https://feed.test",
  title: "Deep Field",
  author: null,
  description: null,
  artwork: { url: "https://img.test/s.jpg" },
  subscribedAt: 0,
  unsubscribedAt: null,
  playedThreshold: null,
  playbackSettings: {}
})

const change = (c: unknown) => Schema.decodeUnknownSync(Operation.Change)(c)
const add = (playlistId: string, episodeId: string) =>
  change({ _tag: "AddEntry", playlistId, episodeId, placement: "last" })
const entry = (state: State.State, playlistId: string, episodeId: string) =>
  state.playlists.find((p) => p.id === playlistId)?.entries.find((e) => e.episodeId === episodeId)

/** Waits for background fibers (Player events, State changes) to catch up. */
const eventually = <A, E, R>(read: Effect.Effect<A, E, R>, check: (a: A) => boolean) =>
  Effect.gen(function* () {
    for (let i = 0; i < 200; i++) {
      const value = yield* read
      if (check(value)) return value
      yield* Effect.sleep("5 millis")
    }
    return yield* Effect.die(new Error("condition not reached"))
  })

/** A Device with a catalogue and Default Playlist [e1, e2] whose Cursor is on e2 at 20 s. */
const withDevice = <A, E>(
  test: (
    fake: Effect.Success<typeof makeFakePlayer>
  ) => Effect.Effect<A, E, Playback | SyncEngine | SqlClient.SqlClient | Reactivity.Reactivity>,
  options: {
    readonly catalogue?: boolean
    readonly reportEveryMillis?: number
    readonly transport?: typeof offline
  } = {}
) =>
  Effect.gen(function* () {
    const fake = yield* makeFakePlayer
    const layer = Playback.layer({
      audioUrl: (id) => `/audio/${id}`,
      reportEveryMillis: options.reportEveryMillis ?? 0
    }).pipe(
      Layer.provideMerge(SyncEngine.layer({ defaults, deviceName: "test" })),
      Layer.provideMerge(LocalDb.layerMemory),
      Layer.provideMerge(Reactivity.layer),
      Layer.provide(Layer.succeed(Player, fake.player)),
      Layer.provide(Layer.succeed(Transport, options.transport ?? offline))
    )
    return yield* Effect.gen(function* () {
      if (options.catalogue ?? true) {
        yield* upsertSubscriptions([subscription])
        yield* upsertEpisodes(episodes)
      }
      const engine = yield* SyncEngine
      yield* engine.record(add("default", "e1"))
      yield* engine.record(add("default", "e2"))
      yield* engine.record(change({ _tag: "SetCursor", playlistId: "default", episodeId: "e2" }))
      yield* engine.record(
        change({
          _tag: "ReportPosition",
          playlistId: "default",
          episodeId: "e2",
          position: 20,
          listenedAt: Date.now()
        })
      )
      return yield* test(fake)
    }).pipe(Effect.provide(layer))
  })

const now = Effect.gen(function* () {
  return yield* SubscriptionRef.get((yield* Playback).now)
})
const state = Effect.gen(function* () {
  return yield* SubscriptionRef.get((yield* SyncEngine).state)
})

describe("Playback", () => {
  it.live("loads the Active Playlist's Cursor Entry at its Position", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const loaded = yield* eventually(now, (n) => n?.episodeId === "e2" && n.position === 20)
        expect(loaded).toMatchObject({ title: "Episode e2", podcast: "Deep Field", playing: false })
        expect(fake.loads.at(-1)).toMatchObject({ url: "https://cdn.test/e2.mp3", startAt: 20 })
        expect(fake.loads.at(-1)?.artworkUrl).toBe("https://img.test/s.jpg")
        expect(fake.rates.at(-1)).toBe(1.5)
      })
    )
  )

  it.live("fills in the Entry's details when the catalogue arrives after the State", () =>
    withDevice(
      (fake) =>
        Effect.gen(function* () {
          yield* eventually(now, (n) => n?.title === "")
          yield* upsertSubscriptions([subscription])
          yield* upsertEpisodes(episodes)
          yield* Reactivity.invalidate([catalogueKey])
          const filled = yield* eventually(now, (n) => n?.title === "Episode e2")
          expect(filled).toMatchObject({ podcast: "Deep Field", duration: 60 })
          expect(fake.described.at(-1)?.title).toBe("Episode e2")
          expect(fake.loads).toHaveLength(2)
          expect(fake.loads.at(-1)).toMatchObject({ url: "https://cdn.test/e2.mp3", startAt: 20 })
        }),
      { catalogue: false }
    )
  )

  it.live("reports the Position while playing and when paused", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const playback = yield* Playback
        yield* eventually(now, (n) => n?.episodeId === "e2")
        yield* playback.play
        yield* eventually(now, (n) => n?.playing === true)
        fake.emit(PlayerEvent.Position({ seconds: 31, duration: 600 }))
        yield* eventually(state, (s) => entry(s, "default", "e2")?.position === 31)
        fake.emit(PlayerEvent.Position({ seconds: 37.5, duration: 600 }))
        yield* playback.pause
        const paused = yield* eventually(now, (n) => n?.playing === false)
        expect(paused?.position).toBe(37.5)
        yield* eventually(state, (s) => entry(s, "default", "e2")?.position === 37.5)
      })
    )
  )

  it.live("Play from here makes the Playlist active, moves its Cursor and plays", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        const playback = yield* Playback
        yield* eventually(now, (n) => n?.episodeId === "e2")
        yield* engine.record(
          change({ _tag: "CreatePlaylist", playlistId: "p2", name: "Commute", clearOnPlayed: true })
        )
        yield* engine.record(add("p2", "e3"))
        yield* playback.playEntry("p2", "e3")
        const playing = yield* eventually(now, (n) => n?.episodeId === "e3" && n.playing)
        expect(playing?.playlistId).toBe("p2")
        const s = yield* state
        expect(s.activePlaylistId).toBe("p2")
        expect(s.playlists.find((p) => p.id === "p2")?.cursor).toBe("e3")
        // Loaded once: a second load would interrupt the play that just started.
        expect(fake.loads.map((t) => t.url)).toEqual([
          "https://cdn.test/e2.mp3",
          "https://cdn.test/e3.mp3"
        ])
      })
    )
  )

  it.live("Try again after a playback error loads the Entry again and plays", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const playback = yield* Playback
        yield* eventually(now, (n) => n?.episodeId === "e2")
        fake.emit(PlayerEvent.Failed({ message: "MEDIA_ELEMENT_ERROR: Format error" }))
        yield* eventually(now, (n) => n?.error !== null)
        yield* playback.retry
        const again = yield* eventually(now, (n) => n?.playing === true)
        expect(again?.error).toBeNull()
        expect(fake.loads.map((t) => [t.url, t.startAt])).toEqual([
          ["https://cdn.test/e2.mp3", 20],
          ["https://cdn.test/e2.mp3", 20]
        ])
      })
    )
  )

  it.live("reports the Position when the page goes away", () =>
    withDevice(
      (fake) =>
        Effect.gen(function* () {
          const playback = yield* Playback
          yield* eventually(now, (n) => n?.episodeId === "e2")
          yield* playback.play
          yield* eventually(now, (n) => n?.playing === true)
          // Not yet time for a periodic report.
          fake.emit(PlayerEvent.Position({ seconds: 24.5, duration: 600 }))
          yield* eventually(now, (n) => n?.position === 24.5)
          window.dispatchEvent(new PageTransitionEvent("pagehide"))
          yield* eventually(state, (s) => entry(s, "default", "e2")?.position === 24.5)
        }),
      { reportEveryMillis: 60_000 }
    )
  )

  it.live("fetches the loaded Episode's Chapters from the server", () =>
    withDevice(
      () =>
        Effect.gen(function* () {
          const loaded = yield* eventually(now, (n) => (n?.chapters.length ?? 0) > 0)
          expect(loaded?.chapters.map((c) => [c.start, c.title])).toEqual([
            [0, "Cold open"],
            [95, "The interview"]
          ])
        }),
      {
        transport: Transport.of({
          ...offline,
          chapters: (id) =>
            Effect.succeed(
              id === "e2"
                ? [0, 95].map((start, i) =>
                    Schema.decodeUnknownSync(Library.Chapter)({
                      start,
                      title: ["Cold open", "The interview"][i],
                      artwork: null,
                      url: null
                    })
                  )
                : []
            )
        })
      }
    )
  )

  it.live("moves a paused player to a later listen from another Device", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        yield* eventually(now, (n) => n?.episodeId === "e2" && n.position === 20)
        // As a sync would bring it: another Device listened on to 5:00 just now.
        yield* engine.record(
          change({
            _tag: "ReportPosition",
            playlistId: "default",
            episodeId: "e2",
            position: 300,
            listenedAt: Date.now() + 1000
          })
        )
        yield* eventually(now, (n) => n?.position === 300)
        expect(fake.seeks.at(-1)).toBe(300)
        expect(fake.loads).toHaveLength(1)
      })
    )
  )

  it.live("headset back and forward skip within the Episode", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        yield* eventually(now, (n) => n?.episodeId === "e2")
        fake.press("back")
        yield* eventually(now, (n) => n?.position === 5)
        fake.press("forward")
        fake.press("forward")
        yield* eventually(now, (n) => n?.position === 60)
        expect(fake.seeks).toEqual([5, 35, 60])
        yield* eventually(state, (s) => entry(s, "default", "e2")?.position === 60)
      })
    )
  )

  it.live("follows a Cursor moved elsewhere while paused, but not while playing", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        const playback = yield* Playback
        yield* eventually(now, (n) => n?.episodeId === "e2")
        yield* engine.record(change({ _tag: "SetCursor", playlistId: "default", episodeId: "e1" }))
        yield* eventually(now, (n) => n?.episodeId === "e1")
        yield* playback.play
        yield* eventually(now, (n) => n?.playing === true)
        yield* engine.record(change({ _tag: "SetCursor", playlistId: "default", episodeId: "e2" }))
        yield* Effect.sleep("50 millis")
        expect((yield* now)?.episodeId).toBe("e1")
        expect(fake.loads.map((t) => t.url)).toEqual([
          "https://cdn.test/e2.mp3",
          "https://cdn.test/e1.mp3"
        ])
      })
    )
  )

  it.live("finishing an Entry marks it Played from its Playlist and plays the next one", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        const playback = yield* Playback
        yield* engine.record(change({ _tag: "SetCursor", playlistId: "default", episodeId: "e1" }))
        yield* eventually(now, (n) => n?.episodeId === "e1")
        yield* playback.play
        yield* eventually(now, (n) => n?.playing === true)
        // Within 30 s of the end counts as finishing: Played, and Clear on Played removes it.
        fake.emit(PlayerEvent.Position({ seconds: 45, duration: 60 }))
        const s = yield* eventually(state, (s) => s.episodeStates.e1?.played != null)
        expect(s.episodeStates.e1?.played?.source).toEqual({
          _tag: "Playback",
          playlistId: "default"
        })
        expect(s.playlists[0]?.entries.map((e) => e.episodeId)).toEqual(["e2"])
        expect(s.playlists[0]?.history.map((h) => h.episodeId)).toEqual(["e1"])
        // The rest of the Episode still plays, then the next Entry starts at its Position.
        expect((yield* now)?.episodeId).toBe("e1")
        fake.emit(PlayerEvent.Position({ seconds: 55, duration: 60 }))
        fake.emit(PlayerEvent.Ended())
        yield* eventually(now, (n) => n?.episodeId === "e2" && n.playing)
        expect(fake.loads.at(-1)).toMatchObject({ url: "https://cdn.test/e2.mp3", startAt: 20 })
      })
    )
  )

  it.live("stops after the last Entry", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const playback = yield* Playback
        yield* eventually(now, (n) => n?.episodeId === "e2")
        yield* playback.play
        yield* eventually(now, (n) => n?.playing === true)
        // No known duration: only the end of the audio finishes it.
        fake.emit(PlayerEvent.Ended())
        yield* eventually(now, (n) => n === null)
        const s = yield* state
        expect(s.episodeStates.e2?.played?.source._tag).toBe("Playback")
        expect(s.playlists[0]?.entries.map((e) => e.episodeId)).toEqual(["e1"])
        expect(s.playlists[0]?.cursor).toBeNull()
      })
    )
  )

  it.live("a Playlist that keeps Entries resets the finished one to the start", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        const playback = yield* Playback
        yield* engine.record(
          change({ _tag: "CreatePlaylist", playlistId: "keep", name: "Keep", clearOnPlayed: false })
        )
        yield* engine.record(add("keep", "e1"))
        yield* engine.record(add("keep", "e3"))
        yield* playback.playEntry("keep", "e1")
        yield* eventually(now, (n) => n?.episodeId === "e1" && n.playing)
        fake.emit(PlayerEvent.Position({ seconds: 50, duration: 60 }))
        fake.emit(PlayerEvent.Position({ seconds: 58, duration: 60 }))
        yield* playback.pause
        yield* eventually(now, (n) => n?.playing === false)
        // Paused just short of the end: playing again finishes this Episode first.
        yield* playback.play
        yield* eventually(now, (n) => n?.playing === true)
        expect((yield* now)?.episodeId).toBe("e1")
        fake.emit(PlayerEvent.Ended())
        yield* eventually(now, (n) => n?.episodeId === "e3" && n.playing)
        const keep = (yield* state).playlists.find((p) => p.id === "keep")
        expect(keep?.entries.map((e) => [e.episodeId, e.position])).toEqual([
          ["e1", 0],
          ["e3", 0]
        ])
        expect(keep?.cursor).toBe("e3")
      })
    )
  )

  it.live("skips the intro and plays at the podcast's own speed", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        const playback = yield* Playback
        const sql = yield* SqlClient.SqlClient
        yield* eventually(now, (n) => n?.episodeId === "e2")
        yield* engine.record(
          change({
            _tag: "SetPlaybackSettings",
            settings: { speed: 1.5, skipIntro: 30, skipOutro: 0, volumeBoost: false }
          })
        )
        yield* sql`UPDATE subscription SET playback_settings = '{"speed":2}' WHERE id = 's'`
        yield* engine.record(change({ _tag: "SetCursor", playlistId: "default", episodeId: "e1" }))
        const loaded = yield* eventually(now, (n) => n?.episodeId === "e1")
        expect(fake.loads.at(-1)?.startAt).toBe(30)
        expect(loaded?.speed).toBe(2)
        expect(fake.rates.at(-1)).toBe(2)
        // Changing speed while it plays leaves the podcast's own speed as it was.
        yield* playback.setSpeed(1.25)
        expect(fake.rates.at(-1)).toBe(1.25)
        const [row] = yield* sql<{ playback_settings: string }>`
          SELECT playback_settings FROM subscription WHERE id = 's'`
        expect(JSON.parse(row?.playback_settings ?? "{}")).toEqual({ speed: 2 })
        expect((yield* state).playbackSettings.speed).toBe(1.5)
      })
    )
  )

  it.live("a speed change lasts for this Episode only; the defaults stay", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        const playback = yield* Playback
        yield* eventually(now, (n) => n?.episodeId === "e2")
        yield* playback.setSpeed(1.75)
        expect(fake.rates.at(-1)).toBe(1.75)
        expect((yield* now)?.speed).toBe(1.75)
        expect((yield* state).playbackSettings.speed).toBe(1.5)
        // The next Episode plays at the default again.
        yield* engine.record(change({ _tag: "SetCursor", playlistId: "default", episodeId: "e1" }))
        const next = yield* eventually(now, (n) => n?.episodeId === "e1")
        expect(next?.speed).toBe(1.5)
        expect(fake.rates.at(-1)).toBe(1.5)
      })
    )
  )

  it.live("skips the outro: the last seconds end the Episode and the next one plays", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        const playback = yield* Playback
        yield* engine.record(
          change({
            _tag: "SetPlaybackSettings",
            settings: { speed: 1, skipIntro: 0, skipOutro: 20, volumeBoost: false }
          })
        )
        yield* engine.record(change({ _tag: "SetCursor", playlistId: "default", episodeId: "e1" }))
        yield* eventually(now, (n) => n?.episodeId === "e1")
        yield* playback.play
        yield* eventually(now, (n) => n?.playing === true)
        fake.emit(PlayerEvent.Position({ seconds: 41, duration: 60 }))
        yield* eventually(now, (n) => n?.episodeId === "e2" && n.playing)
        expect((yield* state).episodeStates.e1?.played).not.toBeNull()
      })
    )
  )

  it.live("a sleep timer for the end of the Episode stops before the next one", () =>
    withDevice((fake) =>
      Effect.gen(function* () {
        const engine = yield* SyncEngine
        const playback = yield* Playback
        yield* engine.record(change({ _tag: "SetCursor", playlistId: "default", episodeId: "e1" }))
        yield* eventually(now, (n) => n?.episodeId === "e1")
        yield* playback.play
        yield* eventually(now, (n) => n?.playing === true)
        yield* playback.setSleep({ _tag: "EndOfEpisode" })
        fake.emit(PlayerEvent.Ended())
        const next = yield* eventually(now, (n) => n?.episodeId === "e2")
        yield* Effect.sleep("50 millis")
        expect((yield* now)?.playing).toBe(false)
        expect(next?.sleep).toBeNull()
      })
    )
  )

  it.live("a sleep timer in minutes pauses when it runs out", () =>
    withDevice(() =>
      Effect.gen(function* () {
        const playback = yield* Playback
        yield* eventually(now, (n) => n?.episodeId === "e2")
        yield* playback.play
        yield* eventually(now, (n) => n?.playing === true)
        yield* playback.setSleep({ _tag: "Minutes", minutes: 0.002 })
        expect((yield* now)?.sleep?._tag).toBe("At")
        const paused = yield* eventually(now, (n) => n?.playing === false)
        expect(paused?.sleep).toBeNull()
      })
    )
  )
})
