import { describe, expect, it } from "@effect/vitest"
import { Library, Operation, PlaybackSettings, Units } from "@podlist/domain"
import { Effect, Layer, Schema, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { DataLayer } from "../data/DataLayer.ts"
import { LocalDataLayer } from "../data/LocalDataLayer.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { type NowPlaying, Playback } from "../playback/Playback.ts"
import { upsertEpisodes, upsertSubscriptions } from "../sync/Catalogue.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { Offline, Transport } from "../sync/Transport.ts"
import { perform } from "./actions.ts"

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})
const offline = () => Effect.fail(new Offline("offline"))
const local = LocalDataLayer.pipe(
  Layer.provideMerge(SyncEngine.layer({ defaults, deviceName: "test" })),
  Layer.provideMerge(LocalDb.layerMemory),
  Layer.provide(Reactivity.layer),
  Layer.provide(
    Layer.succeed(
      Transport,
      Transport.of({
        registerDevice: offline,
        push: offline,
        pull: offline,
        catalogue: offline,
        chapters: offline
      })
    )
  )
)
const playback = Layer.effect(
  Playback,
  Effect.gen(function* () {
    return Playback.of({
      now: yield* SubscriptionRef.make<NowPlaying | null>(null),
      play: Effect.void,
      pause: Effect.void,
      toggle: Effect.void,
      retry: Effect.void,
      seek: () => Effect.void,
      skip: () => Effect.void,
      playEntry: () => Effect.void,
      setSpeed: () => Effect.void,
      setSleep: () => Effect.void
    })
  })
)
const layer = Layer.merge(local, playback)
const change = Schema.decodeUnknownSync(Operation.Change)
const seed = Effect.gen(function* () {
  yield* upsertSubscriptions([
    Schema.decodeUnknownSync(Library.Subscription)({
      id: "s",
      feedUrl: "https://feed.test/rss",
      title: "Podcast",
      author: null,
      description: "Notes",
      artwork: null,
      subscribedAt: 0,
      unsubscribedAt: null,
      playedThreshold: null,
      playbackSettings: {}
    })
  ])
  yield* upsertEpisodes(
    ["a", "b", "c"].map((id, published) =>
      Schema.decodeUnknownSync(Library.Episode)({
        id,
        subscriptionId: "s",
        guid: id,
        title: `Episode ${id}`,
        description: "Needle in notes",
        published,
        duration: 60,
        audioUrl: `https://audio.test/${id}`,
        artwork: null,
        chapters: [],
        audioUpdatedAt: null
      })
    )
  )
  const data = yield* DataLayer
  yield* SubscriptionRef.update(data.status, (s) => ({ ...s, ready: true }))
  for (const id of ["a", "b"])
    yield* data.record(
      change({ _tag: "AddEntry", playlistId: "default", episodeId: id, placement: "last" })
    )
  return data
})

describe("automation uses the local edit layer and named Undo", () => {
  it.effect("records Star as one named step whose inverse restores persisted State", () =>
    Effect.gen(function* () {
      const data = yield* seed
      const result = yield* perform("set_starred", { episode_ids: ["a", "b"], starred: true })
      expect(result.value).toEqual({ episode_ids: ["a", "b"], undo: "Undo Star" })
      expect(result.outcome?.message).toBe("Star")
      expect((yield* SubscriptionRef.get(data.state)).episodeStates.a?.starred).toBe(true)
      for (const c of result.outcome?.undo ?? []) yield* data.record(c)
      expect((yield* SubscriptionRef.get(data.state)).episodeStates.a?.starred ?? false).toBe(false)
      expect((yield* SubscriptionRef.get(data.state)).episodeStates.b?.starred ?? false).toBe(false)
    }).pipe(Effect.provide(layer))
  )
  it.effect("Play Now has named Undo that restores the old Cursor and Entry order", () =>
    Effect.gen(function* () {
      const data = yield* seed
      const before = (yield* SubscriptionRef.get(data.state)).playlists[0]
      const result = yield* perform("play_episode", { episode_id: "c" })
      expect(result.value).toEqual({
        playlist_id: "default",
        episode_ids: ["c"],
        undo: "Undo Play Now"
      })
      expect(result.outcome?.message).toBe("Play Now")
      for (const c of result.outcome?.undo ?? []) yield* data.record(c)
      const after = (yield* SubscriptionRef.get(data.state)).playlists[0]
      expect(after?.entries).toEqual(before?.entries)
      expect(after?.cursor).toEqual(before?.cursor)
    }).pipe(Effect.provide(layer))
  )
  it.effect("keeps supplied Next order and returns Mac list, Position and pagination shapes", () =>
    Effect.gen(function* () {
      const data = yield* seed
      yield* perform("add_episodes", { episode_ids: ["c", "b"], placement: "next" })
      expect(
        (yield* SubscriptionRef.get(data.state)).playlists[0]?.entries.map((e) => e.episodeId)
      ).toEqual(["a", "c", "b"])
      const list = yield* perform("list_episodes", { playlist_id: "default", offset: 1, limit: 1 })
      expect(list.value).toEqual({
        episodes: [
          {
            id: "c",
            title: "Episode c",
            podcast: "Podcast",
            position: 0,
            starred: false,
            played: false
          }
        ],
        total: 3,
        offset: 1,
        has_more: true
      })
      const search = yield* perform("search_episodes", { text: "needle" })
      expect(search.value.total).toBe(3)
      expect((yield* perform("now_playing", {})).value).toEqual({
        episode_id: null,
        title: null,
        podcast: null,
        position: null,
        playing: false,
        active_playlist: { id: "default", name: "Default" }
      })
    }).pipe(Effect.provide(layer))
  )
  it.effect("keeps batch order when adding to an empty Playlist or moving its Cursor", () =>
    Effect.gen(function* () {
      const data = yield* seed
      yield* data.record(
        change({ _tag: "CreatePlaylist", playlistId: "empty", name: "Empty", clearOnPlayed: false })
      )
      const first = yield* perform("add_episodes", {
        episode_ids: ["a", "b", "c"],
        playlist_id: "empty",
        placement: "next"
      })
      let target = (yield* SubscriptionRef.get(data.state)).playlists.find((p) => p.id === "empty")
      expect(target?.entries.map((e) => e.episodeId)).toEqual(["a", "b", "c"])
      expect(target?.cursor).toBe("a")
      const moved = yield* perform("add_episodes", {
        episode_ids: ["c", "a"],
        playlist_id: "empty",
        placement: "next"
      })
      target = (yield* SubscriptionRef.get(data.state)).playlists.find((p) => p.id === "empty")
      expect(
        target?.entries.filter((e) => ["c", "a"].includes(e.episodeId)).map((e) => e.episodeId)
      ).toEqual(["c", "a"])
      for (const c of moved.outcome?.undo ?? []) yield* data.record(c)
      target = (yield* SubscriptionRef.get(data.state)).playlists.find((p) => p.id === "empty")
      expect(target?.entries.map((e) => e.episodeId)).toEqual(["a", "b", "c"])
      expect(target?.cursor).toBe("a")
      for (const c of first.outcome?.undo ?? []) yield* data.record(c)
      target = (yield* SubscriptionRef.get(data.state)).playlists.find((p) => p.id === "empty")
      expect(target?.entries).toEqual([])
      expect(target?.cursor).toBeNull()
    }).pipe(Effect.provide(layer))
  )
  it.effect("rejects unknown Episodes and disallowed actions before editing", () =>
    Effect.gen(function* () {
      const data = yield* seed
      const before = yield* SubscriptionRef.get(data.state)
      expect(
        (yield* Effect.exit(perform("set_starred", { episode_ids: ["missing"], starred: true })))
          ._tag
      ).toBe("Failure")
      expect(
        (yield* Effect.exit(perform("delete_playlist", { playlist_id: "default" })))._tag
      ).toBe("Failure")
      expect(yield* SubscriptionRef.get(data.state)).toEqual(before)
    }).pipe(Effect.provide(layer))
  )
})
