import { afterAll, describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServer } from "effect/http"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"
import { AudioRoute, Upstream } from "../src/Media.ts"

const seen: Array<Request> = []
const upstream = (request: Request) => {
  seen.push(request)
  return Promise.resolve(
    new Response("ID3audio-bytes", {
      status: request.headers.has("range") ? 206 : 200,
      headers: {
        "content-type": "audio/mpeg",
        "content-range": "bytes 0-4/14",
        "set-cookie": "tracker=1"
      }
    })
  )
}

const seeded = Layer.effectDiscard(
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`INSERT INTO subscription ${sql.insert({ id: "s", feed_url: "f", title: "t", subscribed_at: 0 })}`
    yield* sql`INSERT INTO episode ${sql.insert({
      id: "ep1",
      subscription_id: "s",
      guid: "g",
      title: "t",
      description: "",
      published: 0,
      audio_url: "https://cdn.example.test/ep1.mp3"
    })}`
  })
)

const { handler, dispose } = HttpRouter.toWebHandler(
  Layer.mergeAll(AudioRoute, seeded).pipe(
    Layer.provide(Database.layer(":memory:")),
    Layer.provide(HttpServer.layerServices),
    Layer.provide(Layer.succeed(Upstream, upstream))
  ),
  { disableLogger: true }
)
afterAll(() => dispose())

describe("audio proxy", () => {
  it("streams a catalogue Episode's audio, forwarding Range and dropping cookies", async () => {
    const response = await handler(
      new Request("http://podlist.test/api/episodes/ep1/audio", { headers: { range: "bytes=0-4" } })
    )
    expect(response.status).toBe(206)
    expect(await response.text()).toBe("ID3audio-bytes")
    expect(response.headers.get("content-type")).toBe("audio/mpeg")
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(seen.at(-1)?.url).toBe("https://cdn.example.test/ep1.mp3")
    expect(seen.at(-1)?.headers.get("range")).toBe("bytes=0-4")
  })

  it("refuses Episodes that are not in the catalogue", async () => {
    const response = await handler(new Request("http://podlist.test/api/episodes/nope/audio"))
    expect(response.status).toBe(404)
  })
})
