import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { openApiDocument } from "../src/OpenApi.ts"
import { BringOverRequest } from "../src/Subscriptions.ts"

const subscription = {
  feedUrl: "https://test/feed",
  title: "Podcast",
  author: null,
  description: null,
  artwork: null,
  subscribedAt: 10,
  unsubscribedAt: 20,
  playedThreshold: null,
  playbackSettings: {}
}
const episode = {
  feedUrl: subscription.feedUrl,
  guid: "retired",
  title: "Episode",
  description: "Notes",
  published: 10,
  duration: null,
  audioUrl: "https://test/audio",
  artwork: null,
  chapters: [],
  audioUpdatedAt: null
}
const decode = Schema.decodeUnknownSync(BringOverRequest)

describe("bring-over metadata contract", () => {
  it("documents no-content success and the declared missing-parent error alongside malformed input", () => {
    const operation = openApiDocument().paths["/api/subscriptions/bring-over"]?.post
    expect(operation?.responses["204"]).toEqual({ description: "<No Content>" })
    expect(operation?.responses["400"]).toMatchObject({
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/MissingSubscriptionEncoded" } }
      }
    })
    expect(operation?.responses["400"]?.description).toContain("empty response body")
  })
  it("accepts feed/guid identities and preserves explicit removed status and nullable metadata", () => {
    const request = { subscriptions: [subscription], episodes: [episode] }
    expect({ ...decode(request) }).toEqual(request)
    expect({ ...decode({ subscriptions: [], episodes: [] }) }).toEqual({
      subscriptions: [],
      episodes: []
    })
  })

  it("requires removed status and validates metadata without restricting publisher URLs or guids", () => {
    const { unsubscribedAt: _removed, ...missingStatus } = subscription
    expect(() => decode({ subscriptions: [missingStatus], episodes: [] })).toThrow()
    expect(() =>
      decode({ subscriptions: [{ ...subscription, subscribedAt: -1 }], episodes: [] })
    ).toThrow()
    expect(() => decode({ subscriptions: [], episodes: [{ ...episode, duration: -1 }] })).toThrow()
    expect(() =>
      decode({ subscriptions: [{ ...subscription, feedUrl: "" }], episodes: [] })
    ).toThrow()
    expect(
      decode({ subscriptions: [], episodes: [{ ...episode, guid: "", audioUrl: "relative.mp3" }] })
        .episodes
    ).toHaveLength(1)
  })
})
