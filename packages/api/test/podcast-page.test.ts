import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { openApiDocument } from "../src/OpenApi.ts"
import {
  BringEpisodeRequest,
  BroughtEpisode,
  PodcastFeed,
  SubscribeRequest
} from "../src/Subscriptions.ts"

describe("Podcast page contract", () => {
  it("documents read-only feed lookup and single-Episode import with ordinary feed failures", () => {
    const paths = openApiDocument().paths
    for (const path of ["/api/podcasts/read", "/api/podcasts/episodes"]) {
      expect(paths[path]?.post?.responses).toHaveProperty("200")
      expect(paths[path]?.post?.responses).toHaveProperty("502")
      expect(paths[path]?.post?.responses["400"]?.description).toContain("empty response body")
    }
  })
  it("requires a feed address and guid, including an empty publisher guid", () => {
    expect(() => Schema.decodeUnknownSync(SubscribeRequest)({ feedUrl: "" })).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(BringEpisodeRequest)({ feedUrl: "https://test/feed" })
    ).toThrow()
    expect(
      Schema.decodeUnknownSync(BringEpisodeRequest)({ feedUrl: "https://test/feed", guid: "" }).guid
    ).toBe("")
    expect(
      Schema.decodeUnknownSync(BroughtEpisode)({ subscriptionId: "s", episodeId: "e" }).episodeId
    ).toBe("e")
  })
  it("returns metadata and available notes without assigning Library identities", () => {
    const value = {
      title: "Deep Field",
      author: null,
      description: null,
      artworkUrl: null,
      episodes: [
        {
          guid: "g",
          title: "Stars",
          description: "Notes",
          published: 0,
          duration: null,
          audioUrl: "https://test/audio",
          artworkUrl: null,
          chaptersUrl: null
        }
      ]
    }
    expect({ ...Schema.decodeUnknownSync(PodcastFeed)(value) }).toEqual(value)
  })
})
