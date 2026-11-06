import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Ref } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { SqlClient } from "effect/sql"
import { Chapters, fromId3, fromJsonChapters } from "../src/Chapters.ts"
import * as Database from "../src/Database.ts"

/** An ID3v2.4 tag with one CHAP frame (start ms, TIT2 title) per chapter. */
const id3 = (chapters: ReadonlyArray<readonly [number, string]>) => {
  const syncsafe = (n: number) => [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127]
  const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
  const frame = (id: string, body: Array<number>) => [
    ...Buffer.from(id),
    ...syncsafe(body.length),
    0,
    0,
    ...body
  ]
  const frames = chapters.flatMap(([ms, title], i) => {
    const tit2 = frame("TIT2", [3, ...Buffer.from(title, "utf8")])
    return frame("CHAP", [
      ...Buffer.from(`ch${i}`),
      0,
      ...u32(ms),
      ...u32(ms + 1000),
      ...u32(0xffffffff),
      ...u32(0xffffffff),
      ...tit2
    ])
  })
  return new Uint8Array([
    ...Buffer.from("ID3"),
    4,
    0,
    0,
    ...syncsafe(frames.length),
    ...frames,
    ...Buffer.from("audio")
  ])
}

describe("chapter parsing", () => {
  it("reads Podcasting 2.0 JSON chapters, sorted, without hidden ones", () => {
    expect(
      fromJsonChapters({
        chapters: [
          { startTime: 400, title: "The city in 1977", img: "https://c.test/2.jpg" },
          { startTime: 0, title: "Cold open" },
          { startTime: 200, title: "Ad", toc: false }
        ]
      })
    ).toEqual([
      { start: 0, title: "Cold open", artworkUrl: null, url: null },
      { start: 400, title: "The city in 1977", artworkUrl: "https://c.test/2.jpg", url: null }
    ])
  })

  it("reads ID3 CHAP frames", () => {
    expect(
      fromId3(
        id3([
          [0, "Cold open"],
          [1_085_000, "Blackout at the switch house"]
        ])
      )
    ).toEqual([
      { start: 0, title: "Cold open", artworkUrl: null, url: null },
      { start: 1085, title: "Blackout at the switch house", artworkUrl: null, url: null }
    ])
    expect(fromId3(new Uint8Array([1, 2, 3]))).toEqual([])
  })
})

const network = (calls: Ref.Ref<Array<string>>) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.gen(function* () {
        yield* Ref.update(calls, (all) => [...all, request.url])
        if (request.url.endsWith(".json")) {
          return HttpClientResponse.fromWeb(
            request,
            Response.json({ chapters: [{ startTime: 0, title: "From JSON" }] })
          )
        }
        return HttpClientResponse.fromWeb(
          request,
          new Response(id3([[0, "From ID3"]]), { status: 206 })
        )
      })
    )
  )

describe("Chapters.forEpisode", () => {
  it.effect("prefers JSON chapters, falls back to ID3, and stores the result once", () =>
    Effect.gen(function* () {
      const calls = yield* Ref.make<Array<string>>([])
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO subscription ${sql.insert({ id: "s", feed_url: "f", title: "t", subscribed_at: 0 })}`
        const episode = (id: string, chapters_url: string | null) => ({
          id,
          subscription_id: "s",
          guid: id,
          title: id,
          description: "",
          published: 0,
          audio_url: `https://cdn.test/${id}.mp3`,
          chapters_url
        })
        yield* sql`INSERT INTO episode ${sql.insert([episode("json", "https://c.test/ch.json"), episode("id3", null)])}`
        const chapters = yield* Chapters

        assert.deepStrictEqual(
          (yield* chapters.forEpisode("json")).map((c) => c.title),
          ["From JSON"]
        )
        assert.deepStrictEqual(
          (yield* chapters.forEpisode("id3")).map((c) => c.title),
          ["From ID3"]
        )
        yield* chapters.forEpisode("json")
        assert.strictEqual((yield* Ref.get(calls)).length, 2)
        const [stored] = yield* sql<{
          chapters: string
        }>`SELECT chapters FROM episode WHERE id = 'id3'`
        assert.include(stored?.chapters ?? "", "From ID3")
        const missing = yield* chapters.forEpisode("nope").pipe(Effect.flip)
        assert.strictEqual(missing._tag, "EpisodeNotFound")
      }).pipe(
        Effect.provide(
          Chapters.layer.pipe(
            Layer.provide(network(calls)),
            Layer.provideMerge(Database.layer(":memory:"))
          )
        )
      )
    })
  )
})
