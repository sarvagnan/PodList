import { NodeHttpServer, NodeWS } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Operation } from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import { HttpRouter, HttpServer } from "effect/http"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"
import { LiveRoute, sameOrigin } from "../src/Live.ts"
import { SyncStore } from "../src/SyncStore.ts"

interface Notice {
  state: number
  library: number
  reset: boolean
}
const connect = (url: string, origin: string) => {
  const socket = new NodeWS.WebSocket(url, { headers: { origin } })
  const messages: Notice[] = []
  let receive: ((notice: Notice) => void) | undefined
  socket.on("message", (data) => {
    const notice = JSON.parse(data.toString()) as Notice
    if (receive) {
      const take = receive
      receive = undefined
      take(notice)
    } else messages.push(notice)
  })
  return {
    socket,
    next: () =>
      new Promise<Notice>((resolve, reject) => {
        const notice = messages.shift()
        if (notice) {
          resolve(notice)
          return
        }
        const timeout = setTimeout(() => {
          receive = undefined
          reject(new Error("No notification"))
        }, 3000)
        receive = (notice) => {
          clearTimeout(timeout)
          resolve(notice)
        }
      })
  }
}
const services = SyncStore.layer.pipe(Layer.provideMerge(Database.layer(":memory:")))
const running = HttpRouter.serve(LiveRoute).pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provideMerge(services)
)

describe("WebSocket notifications", () => {
  it("checks exact origins, including scheme and port", () => {
    expect(sameOrigin("https://podlist.test", "podlist.test", "https")).toBe(true)
    expect(sameOrigin("http://podlist.test:3000", "podlist.test:3000", "http")).toBe(true)
    for (const origin of [
      undefined,
      "null",
      "https://evil.test",
      "https://podlist.test.evil",
      "https://podlist.test/",
      "http://podlist.test",
      "https://podlist.test:444"
    ]) {
      expect(sameOrigin(origin, "podlist.test", "https")).toBe(false)
    }
  })

  it.live("pushes both cursors, catches up after disconnect and resets ahead cursors", () =>
    Effect.gen(function* () {
      const server = yield* HttpServer.HttpServer
      const origin = HttpServer.formatAddress(server.address)
      const url = `${origin.replace("http:", "ws:")}/api/live`
      const sql = yield* SqlClient.SqlClient
      const store = yield* SyncStore
      const first = connect(`${url}?state=0&library=0`, origin)
      try {
        expect(yield* Effect.promise(first.next)).toEqual({ state: 0, library: 0, reset: false })
        yield* store.push([
          Schema.decodeUnknownSync(Operation.Operation)({
            id: "change-1",
            deviceId: "native",
            sequence: 1,
            recordedAt: 1,
            change: { _tag: "SetStar", episodeId: "e", starred: true }
          })
        ])
        expect(yield* Effect.promise(first.next)).toEqual({ state: 1, library: 0, reset: false })
        yield* sql`INSERT INTO subscription (id, feed_url, title, subscribed_at) VALUES ('s', 'feed', 'Show', 0)`
        expect(yield* Effect.promise(first.next)).toEqual({ state: 1, library: 1, reset: false })
      } finally {
        first.socket.terminate()
      }
      // A feed refresh or native edit while no tab is connected still advances durable cursors.
      yield* sql`UPDATE subscription SET title = 'Refreshed' WHERE id = 's'`
      const resumed = connect(`${url}?state=1&library=1`, origin)
      try {
        expect(yield* Effect.promise(resumed.next)).toEqual({ state: 1, library: 2, reset: false })
      } finally {
        resumed.socket.terminate()
      }
      const reset = connect(`${url}?state=900&library=900`, origin)
      try {
        expect(yield* Effect.promise(reset.next)).toEqual({ state: 1, library: 2, reset: true })
      } finally {
        reset.socket.terminate()
      }
    }).pipe(Effect.provide(running))
  )

  it.live("rejects cross-origin and missing Origin upgrades and malformed cursors", () =>
    Effect.gen(function* () {
      const server = yield* HttpServer.HttpServer
      const origin = HttpServer.formatAddress(server.address)
      for (const [header, query, expected] of [
        ["https://evil.test", "", 403],
        [undefined, "", 403],
        [origin, "?state=-1", 400],
        [origin, "?library=9007199254740992", 400]
      ] as const) {
        const status = yield* Effect.promise(
          () =>
            new Promise<number>((resolve, reject) => {
              const socket = new NodeWS.WebSocket(
                `${origin.replace("http:", "ws:")}/api/live${query}`,
                { headers: header ? { origin: header } : {} }
              )
              socket.once("unexpected-response", (_request, response) => {
                response.resume()
                socket.terminate()
                resolve(response.statusCode ?? 0)
              })
              socket.once("open", () => {
                socket.terminate()
                reject(new Error("Unexpected upgrade"))
              })
              socket.on("error", () => {})
            })
        )
        expect(status).toBe(expected)
      }
    }).pipe(Effect.provide(running))
  )
})
