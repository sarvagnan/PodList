import { Library, Operation, PlaybackSettings, State } from "@podlist/domain"
import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { type BringOverSource, mapBringOver, previewBringOver } from "./BringOver.ts"

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
})
