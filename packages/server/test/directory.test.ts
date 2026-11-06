import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect, Layer, Ref } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { Directory } from "../src/Directory.ts"

const podcastIndexBody = {
  feeds: [
    {
      title: "Deep Field",
      author: "Ana",
      url: "https://pi.test/deep.xml",
      artwork: "https://pi.test/a.jpg"
    }
  ]
}
const itunesBody = {
  results: [
    {
      collectionName: "Deep Field",
      artistName: "Ana",
      feedUrl: "https://it.test/deep.xml",
      artworkUrl600: "https://it.test/a.jpg"
    },
    { collectionName: "No feed URL" }
  ]
}

const fakeNetwork = (
  calls: Ref.Ref<Array<{ url: string; headers: Record<string, string> }>>,
  podcastIndexDown = false
) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) =>
      Effect.gen(function* () {
        yield* Ref.update(calls, (all) => [
          ...all,
          { url: url.toString(), headers: { ...request.headers } }
        ])
        const isPodcastIndex = request.url.includes("podcastindex")
        const response =
          isPodcastIndex && podcastIndexDown
            ? new Response("no", { status: 401 })
            : Response.json(isPodcastIndex ? podcastIndexBody : itunesBody)
        return HttpClientResponse.fromWeb(request, response)
      })
    )
  )

const withEnv = (env: Record<string, string>) =>
  ConfigProvider.layer(ConfigProvider.fromEnv({ env }))

describe("directory search", () => {
  it.effect("uses Podcast Index with signed headers when a key is configured", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make<Array<{ url: string; headers: Record<string, string> }>>([])
      const results = yield* Effect.gen(function* () {
        return yield* (yield* Directory).search("deep field")
      }).pipe(
        Effect.provide(
          Directory.layer.pipe(
            Layer.provide(fakeNetwork(calls)),
            Layer.provide(withEnv({ PODCASTINDEX_KEY: "k", PODCASTINDEX_SECRET: "s" }))
          )
        )
      )
      assert.deepStrictEqual(
        results.map((r) => [r.feedUrl, r.source]),
        [["https://pi.test/deep.xml", "podcastindex"]]
      )
      const [call] = yield* Ref.get(calls)
      assert.include(call?.url ?? "", "q=deep+field")
      assert.strictEqual(call?.headers["x-auth-key"], "k")
      assert.match(call?.headers.authorization ?? "", /^[0-9a-f]{40}$/)
      assert.include(call?.headers["user-agent"] ?? "", "PodList")
    })
  )

  it.effect("uses iTunes Search without a key, skipping results that have no feed", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make<Array<{ url: string; headers: Record<string, string> }>>([])
      const results = yield* Effect.gen(function* () {
        return yield* (yield* Directory).search("deep")
      }).pipe(
        Effect.provide(
          Directory.layer.pipe(Layer.provide(fakeNetwork(calls)), Layer.provide(withEnv({})))
        )
      )
      assert.deepStrictEqual(
        results.map((r) => [r.feedUrl, r.source]),
        [["https://it.test/deep.xml", "itunes"]]
      )
    })
  )

  it.effect("falls back to iTunes when Podcast Index fails", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make<Array<{ url: string; headers: Record<string, string> }>>([])
      const results = yield* Effect.gen(function* () {
        return yield* (yield* Directory).search("deep")
      }).pipe(
        Effect.provide(
          Directory.layer.pipe(
            Layer.provide(fakeNetwork(calls, true)),
            Layer.provide(withEnv({ PODCASTINDEX_KEY: "k", PODCASTINDEX_SECRET: "s" }))
          )
        )
      )
      assert.strictEqual(results[0]?.source, "itunes")
    })
  )
})
