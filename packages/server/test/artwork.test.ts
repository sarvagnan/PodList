import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServer } from "effect/http"
import { SqlClient } from "effect/sql"
import sharp from "sharp"
import { ArtworkRoute } from "../src/Artwork.ts"
import * as Database from "../src/Database.ts"
import { Upstream } from "../src/Media.ts"

const podcastArt = "http://art.example.test/podcast.svg"
const chapterArt = "https://art.example.test/chapter-2.png"
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="2000"><rect width="3000" height="2000" fill="#2b50c8"/></svg>`

const fetched: Array<string> = []
const upstream = (request: Request) => {
  fetched.push(request.url)
  if (request.url.endsWith("broken.png"))
    return Promise.resolve(new Response("nope", { status: 500 }))
  return Promise.resolve(new Response(svg, { headers: { "content-type": "image/svg+xml" } }))
}

const seeded = Layer.effectDiscard(
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`INSERT INTO subscription ${sql.insert({
      id: "s",
      feed_url: "f",
      title: "t",
      subscribed_at: 0,
      artwork_url: podcastArt
    })}`
    yield* sql`INSERT INTO episode ${sql.insert({
      id: "ep1",
      subscription_id: "s",
      guid: "g",
      title: "t",
      description: "",
      published: 0,
      audio_url: "https://cdn.example.test/ep1.mp3",
      artwork_url: "https://art.example.test/broken.png",
      chapters: JSON.stringify([{ start: 0, title: "Two", artwork: { url: chapterArt } }])
    })}`
  })
)

const { handler, dispose } = HttpRouter.toWebHandler(
  Layer.mergeAll(ArtworkRoute(mkdtempSync(join(tmpdir(), "podlist-artwork-"))), seeded).pipe(
    Layer.provide(Database.layer(":memory:")),
    Layer.provide(HttpServer.layerServices),
    Layer.provide(Layer.succeed(Upstream, upstream))
  ),
  { disableLogger: true }
)
afterAll(() => dispose())

const get = (url: string, size: number) =>
  handler(
    new Request(`http://podlist.test/api/artwork?url=${encodeURIComponent(url)}&size=${size}`)
  )

describe("artwork", () => {
  it("serves catalogue artwork as a square WebP at the next size up, from cache after the first time", async () => {
    const response = await get(podcastArt, 96)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/webp")
    const image = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
    expect([image.format, image.width, image.height]).toEqual(["webp", 128, 128])

    const again = await get(podcastArt, 100)
    expect(again.status).toBe(200)
    expect(fetched.filter((u) => u === podcastArt)).toHaveLength(1)
  })

  it("serves Chapter images named in an Episode's Chapters", async () => {
    expect((await get(chapterArt, 512)).status).toBe(200)
  })

  it("refuses images that aren't in the catalogue, so it isn't an open proxy", async () => {
    const response = await get("http://169.254.169.254/latest/meta-data", 64)
    expect(response.status).toBe(404)
    expect(fetched).not.toContain("http://169.254.169.254/latest/meta-data")
  })

  it("answers 502 when the image host fails", async () => {
    expect((await get("https://art.example.test/broken.png", 64)).status).toBe(502)
  })
})
