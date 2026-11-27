import { describe, expect, it } from "@effect/vitest"
import { Library as LibraryApi, Sync } from "@podlist/api"
import { Library, Operation, PlaybackSettings, State } from "@podlist/domain"
import { Effect, Layer, Schema, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { type DownloadStatus, Downloads } from "../downloads/DownloadService.ts"
import { DownloadError } from "../platform/DownloadStore.ts"
import * as LocalDb from "../platform/LocalDb.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { Transport } from "../sync/Transport.ts"
import { type BringOverSource, mapBringOver, previewBringOver } from "./BringOver.ts"
import { makeBringOverClient } from "./BringOverClient.ts"

const subscription = (id: string, feed: string) =>
  Schema.decodeUnknownSync(Library.Subscription)({
    id,
    feedUrl: `https://example.com/${feed}`,
    title: feed,
    subscribedAt: 0,
    author: null,
    description: null,
    artwork: null,
    unsubscribedAt: null,
    playedThreshold: null,
    playbackSettings: {}
  })
const episode = (id: string, subscriptionId: string, guid: string) =>
  Schema.decodeUnknownSync(Library.Episode)({
    id,
    subscriptionId,
    guid,
    title: guid,
    description: "",
    published: 0,
    duration: null,
    audioUrl: "https://example.com/episode.mp3",
    artwork: null,
    chapters: [],
    audioUpdatedAt: null
  })
const operation = Schema.decodeUnknownSync(Operation.Operation)({
  id: "stable-operation",
  deviceId: "local",
  recordedAt: 1,
  sequence: 0,
  change: { _tag: "AddEntry", playlistId: "default", episodeId: "local-episode", placement: "last" }
})
const source: BringOverSource = {
  subscriptions: [subscription("local-sub", "feed")],
  episodes: [episode("local-episode", "local-sub", "same-guid")],
  state: State.initial(
    new PlaybackSettings.PlaybackSettings({
      speed: 1,
      skipIntro: Schema.decodeUnknownSync(PlaybackSettings.PlaybackSettings.fields.skipIntro)(0),
      skipOutro: Schema.decodeUnknownSync(PlaybackSettings.PlaybackSettings.fields.skipOutro)(0),
      volumeBoost: false
    })
  ),
  operations: [operation],
  downloads: []
}
const destination = {
  subscriptions: [subscription("other-sub", "other"), subscription("server-sub", "feed")],
  episodes: [
    episode("other-episode", "other-sub", "same-guid"),
    episode("server-episode", "server-sub", "same-guid")
  ]
}
const options = {
  sourceDevice: operation.deviceId,
  destinationDevice: operation.deviceId,
  serverVersion: 7,
  playlists: new Map(),
  views: new Map()
}

describe("Bring Over", () => {
  it("counts and rewrites only Episodes sharing both the feed address and guid", () => {
    const preview = previewBringOver(source, destination)
    expect(preview).toMatchObject({ mergedSubscriptions: 1, mergedEpisodes: 1, addedEpisodes: 0 })
    const mapped = mapBringOver(source, destination, options)
    expect(mapped.operations).toMatchObject([
      { id: "stable-operation", change: { episodeId: "server-episode", playlistId: "default" } }
    ])
    expect(mapBringOver(source, destination, options)).toEqual(mapped)
  })

  it("reports missing metadata in the preview and refuses an incomplete transfer", () => {
    const incomplete = { ...destination, episodes: destination.episodes.slice(0, 1) }
    expect(previewBringOver(source, incomplete)).toMatchObject({
      addedEpisodes: 1,
      mergedEpisodes: 0
    })
    expect(() => mapBringOver(source, incomplete, options)).toThrow("Unmatched Library reference")
  })

  it.effect("resumes a failed download copy without importing or applying Operations twice", () =>
    Effect.gen(function* () {
      const db = yield* Layer.build(LocalDb.layerMemory.pipe(Layer.provideMerge(Reactivity.layer)))
      const originals = source.episodes.map(({ id }) => ({ episodeId: id, bytes: 512 }))
      let uploads = 0
      let copies = 0
      let failCopy = true
      let serverState = source.state
      const pushed: Operation.Operation[] = []
      const transport = Transport.of({
        serverVersion: Effect.succeed(7),
        registerDevice: () => Effect.void,
        bringOverCatalogue: () =>
          Effect.sync(() => {
            uploads++
          }),
        push: (operations) =>
          Effect.sync(() => {
            pushed.push(...operations)
            serverState = State.applyOperations(serverState, operations).state
            return new Sync.PushResponse({ cursor: pushed.length, accepted: operations.length })
          }),
        pull: () =>
          Effect.sync(
            () =>
              new Sync.PullResponse({
                cursor: pushed.length,
                snapshot: serverState,
                operations: []
              })
          ),
        catalogue: () =>
          Effect.succeed(
            new LibraryApi.CatalogueChanges({
              cursor: 1,
              ...destination,
              more: false
            })
          ),
        chapters: () => Effect.succeed([])
      })
      const downloads = Downloads.of({
        status: yield* SubscriptionRef.make<ReadonlyMap<string, DownloadStatus>>(new Map()),
        download: () => Effect.void,
        remove: () => Effect.void,
        cancel: () => Effect.void,
        playableUrl: () => Effect.succeed(null),
        importStored: (episodeId, _url, bytes) =>
          Effect.gen(function* () {
            copies++
            expect(episodeId).toBe("server-episode")
            expect(bytes).toBe(512)
            if (failCopy) return yield* new DownloadError({ episodeId, message: "Source closed" })
          })
      })
      const layer = SyncEngine.layer({
        defaults: source.state.playbackSettings,
        deviceName: "target"
      }).pipe(
        Layer.provideMerge(Layer.succeedContext(db)),
        Layer.provideMerge(Layer.succeed(Transport, transport)),
        Layer.provideMerge(Layer.succeed(Downloads, downloads))
      )
      const client = makeBringOverClient(() => Effect.die("The feed is already subscribed"))
      yield* Effect.gen(function* () {
        const job = yield* client
        yield* job.accept({ ...source, deviceId: operation.deviceId, downloads: originals })
        expect((yield* job.resume(() => {}).pipe(Effect.flip)).message).toBe("Source closed")
        expect(yield* job.inspect).toEqual({
          kind: "pending",
          progress: { feeds: 1, downloads: 0 }
        })
      }).pipe(Effect.provide(layer))

      failCopy = false
      yield* Effect.gen(function* () {
        const restarted = yield* client
        yield* restarted.resume(() => {})
        expect(yield* restarted.inspect).toEqual({ kind: "complete" })
      }).pipe(Effect.provide(layer))

      expect(uploads).toBe(1)
      expect(copies).toBe(2)
      expect(pushed.map(({ id }) => id)).toEqual([operation.id])
    })
  )
})
