import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { ArtworkRules, Library, Units } from "../src/index.ts"

const subscription = Schema.decodeUnknownSync(Library.Subscription)({
  id: "sub",
  feedUrl: "https://example.test/feed",
  title: "Night Shift Histories",
  author: null,
  description: null,
  artwork: { url: "podcast.jpg" },
  subscribedAt: 0,
  unsubscribedAt: null,
  playedThreshold: null,
  playbackSettings: {}
})
const episode = (artwork: string | null) =>
  Schema.decodeUnknownSync(Library.Episode)({
    id: "ep",
    subscriptionId: "sub",
    guid: "g",
    title: "t",
    description: "d",
    published: 0,
    duration: 4324,
    audioUrl: "a.mp3",
    artwork: artwork === null ? null : { url: artwork },
    chapters: [
      { start: 0, title: "Cold open", artwork: null, url: null },
      { start: 1085, title: "Blackout", artwork: { url: "chapter3.jpg" }, url: null }
    ],
    audioUpdatedAt: null
  })
const at = (s: number) => Units.Seconds.make(s)

describe("Artwork", () => {
  it("prefers the current Chapter, then the Episode, then the podcast", () => {
    expect(ArtworkRules.resolve(subscription, episode("ep.jpg"), at(1200))).toEqual({
      artwork: expect.objectContaining({ url: "chapter3.jpg" }),
      level: "chapter"
    })
    expect(ArtworkRules.resolve(subscription, episode("ep.jpg"), at(10)).level).toBe("episode")
    expect(ArtworkRules.resolve(subscription, episode(null), at(10)).level).toBe("podcast")
    expect(ArtworkRules.resolve(subscription, episode("ep.jpg")).level).toBe("episode")
  })
})
