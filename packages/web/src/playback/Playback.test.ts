import { describe, expect, it } from "@effect/vitest"
import { Library, Operation, PlaybackSettings, type State, Units } from "@podlist/domain"
import { Effect, Layer, Queue, Schema, Stream, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import type { SqlClient } from "effect/sql"
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
  catalogue: () => Effect.fail(new Offline("offline"))
})

/** A Player that records what it is asked to do; the test plays the audio element's part. */
const makeFakePlayer = Effect.gen(function* () {
  const events = yield* Queue.unbounded<PlayerEvent>()
  const remote = yield* Queue.unbounded<RemoteCommand>()
  const loads: Array<Track> = []
  const seeks: Array<number> = []
  const rates: Array<number> = []
  const described: Array<TrackInfo> = []
  const emit = (event: PlayerEvent) => Queue.offerUnsafe(events, event)
  const player = Player.of({
    load: (track) => Effect.sync(() => void loads.push(track)),
    describe: (info) => Effect.sync(() => void described.push(info)),
    play: Effect.sync(() => void emit(PlayerEvent.Playing())),
    pause: Effect.sync(() => void emit(PlayerEvent.Paused())),
    seek: (seconds) => Effect.sync(() => void seeks.push(seconds)),
    setRate: (rate) => Effect.sync(() => void rates.push(rate)),
    events: Stream.fromQueue(events),
    remote: Stream.fromQueue(remote)
  })
  return {
    player,
    loads,
    seeks,
    rates,
    described,
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
  options: { readonly catalogue: boolean } = { catalogue: true }
) =>
  Effect.gen(function* () {
    const fake = yield* makeFakePlayer
    const layer = Playback.layer({ audioUrl: (id) => `/audio/${id}`, reportEveryMillis: 0 }).pipe(
      Layer.provideMerge(SyncEngine.layer({ defaults, deviceName: "test" })),
      Layer.provideMerge(LocalDb.layerMemory),
      Layer.provideMerge(Reactivity.layer),
      Layer.provide(Layer.succeed(Player, fake.player)),
      Layer.provide(Layer.succeed(Transport, offline))
    )
    return yield* Effect.gen(function* () {
      if (options.catalogue) {
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
        expect(fake.loads.at(-1)).toMatchObject({ url: "/audio/e2", startAt: 20 })
        expect(fake.loads.at(-1)?.artworkUrl).toBe("https://img.test/s.jpg")
        expect(fake.rates.at(-1)).toBe(1.5)
      })
    )
  )

  it.live("fills in the Entry's details when the catalogue arrives after the State", () =>
    withDevice(
      (fake) =>
        Effect.gen(function* () {
          yield* eventually(now, (n) => n?.title === "Episode unavailable")
          yield* upsertSubscriptions([subscription])
          yield* upsertEpisodes(episodes)
          yield* Reactivity.invalidate([catalogueKey])
          const filled = yield* eventually(now, (n) => n?.title === "Episode e2")
          expect(filled).toMatchObject({ podcast: "Deep Field", duration: 60 })
          expect(fake.described.at(-1)?.title).toBe("Episode e2")
          expect(fake.loads).toHaveLength(1)
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
        expect(fake.loads.map((t) => t.url)).toEqual(["/audio/e2", "/audio/e3"])
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
        expect(fake.loads.map((t) => t.url)).toEqual(["/audio/e2", "/audio/e1"])
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
        expect(fake.loads.at(-1)).toMatchObject({ url: "/audio/e2", startAt: 20 })
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
})
