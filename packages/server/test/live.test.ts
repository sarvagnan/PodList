import { createServer, request } from "node:http"
import { NodeHttpServer, NodeWS } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Operation } from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import { HttpClient, HttpClientResponse, HttpRouter, HttpServer } from "effect/http"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"
import { Library } from "../src/Library.ts"
import { LiveRoute, makeLiveRoute, sameOrigin } from "../src/Live.ts"
import { liveLimits, liveWebSocketOptions } from "../src/LiveSocket.ts"
import { make } from "../src/Reads.ts"
import { Subscriptions } from "../src/Subscriptions.ts"
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
  socket.on("error", () => {})
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
const transport = (heartbeatMs: number = liveLimits.heartbeatMs) =>
  NodeHttpServer.layer(createServer, {
    port: 0,
    host: "127.0.0.1",
    websocket: liveWebSocketOptions({ ...liveLimits, heartbeatMs })
  })
const running = HttpRouter.serve(LiveRoute).pipe(
  Layer.provideMerge(transport()),
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

const closed = (socket: NodeWS.WebSocket) =>
  new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket did not close")), 3000)
    socket.once("close", (code) => {
      clearTimeout(timeout)
      resolve(code)
    })
  })
const rejected = (url: string, origin: string) =>
  new Promise<number>((resolve, reject) => {
    const socket = new NodeWS.WebSocket(url, { headers: { origin } })
    socket.on("error", () => {})
    socket.once("unexpected-response", (_request, response) => {
      response.resume()
      socket.terminate()
      resolve(response.statusCode ?? 0)
    })
    socket.once("open", () => {
      socket.terminate()
      reject(new Error("Unexpected admission"))
    })
  })

it.live(
  "failed Subscribe invalidates provisional paging and notifies live readers of cleanup",
  () => {
    let duringFetch: Effect.Effect<void, unknown> = Effect.void
    const network = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        duringFetch.pipe(
          Effect.orDie,
          Effect.as(HttpClientResponse.fromWeb(request, new Response("failed", { status: 500 })))
        )
      )
    )
    const testServices = Subscriptions.layer.pipe(
      Layer.provideMerge(Library.layer),
      Layer.provide(network),
      Layer.provideMerge(services)
    )
    const testServer = HttpRouter.serve(LiveRoute).pipe(
      Layer.provideMerge(transport()),
      Layer.provideMerge(testServices)
    )
    return Effect.gen(function* () {
      const server = yield* HttpServer.HttpServer
      const origin = HttpServer.formatAddress(server.address)
      const sql = yield* SqlClient.SqlClient
      const reads = yield* make
      const subs = yield* Subscriptions
      for (const title of ["zz B", "zz C"])
        yield* sql`INSERT INTO subscription (id, feed_url, title, subscribed_at) VALUES (${title}, ${title}, ${title}, 0)`
      const live = connect(`${origin.replace("http:", "ws:")}/api/live`, origin)
      let continuation = ""
      try {
        expect((yield* Effect.promise(live.next)).library).toBe(2)
        duringFetch = Effect.gen(function* () {
          const page = yield* reads.subscriptions({ pageSize: 1 })
          expect(page.items[0]?.feedUrl).toBe("https://a.test/feed")
          expect(page.total).toBe(3)
          continuation = page.continuation as string
          expect((yield* Effect.promise(live.next)).library).toBe(3)
        })
        expect((yield* Effect.flip(subs.subscribe("https://a.test/feed")))._tag).toBe("FeedError")
        expect((yield* Effect.promise(live.next)).library).toBe(4)
        expect((yield* Effect.flip(reads.subscriptions({ pageSize: 1, continuation })))._tag).toBe(
          "ReadChanged"
        )
        const fresh = yield* reads.subscriptions({ pageSize: 1 })
        expect(fresh.items.map((s) => s.title)).toEqual(["zz B"])
        const second = yield* reads.subscriptions({
          pageSize: 1,
          continuation: fresh.continuation as string
        })
        expect(second.items.map((s) => s.title)).toEqual(["zz C"])
        // Episode deletions guard the same read revision, even when no Subscription disappears.
        yield* sql`INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url)
        VALUES ('ep', 'zz B', 'g', 'Episode', '', 0, 'audio')`
        const before = yield* reads.cursors
        yield* sql`DELETE FROM episode WHERE id = 'ep'`
        expect((yield* reads.cursors).library).toBeGreaterThan(before.library)
      } finally {
        live.socket.terminate()
      }
    }).pipe(Effect.provide(testServer))
  }
)

for (const limit of ["total", "profile", "peer"] as const) {
  it.live(`enforces ${limit} admission and releases capacity after disconnect`, () =>
    Effect.gen(function* () {
      const server = yield* HttpServer.HttpServer
      const origin = HttpServer.formatAddress(server.address)
      const url = `${origin.replace("http:", "ws:")}/api/live`
      const first = connect(`${url}?deviceId=profile-a`, origin)
      try {
        yield* Effect.promise(first.next)
        const nextId = limit === "profile" ? "profile-a" : "profile-b"
        expect(yield* Effect.promise(() => rejected(`${url}?deviceId=${nextId}`, origin))).toBe(429)
        if (limit === "profile") {
          const other = connect(`${url}?deviceId=another-profile`, origin)
          try {
            yield* Effect.promise(other.next)
          } finally {
            other.socket.terminate()
          }
        }
        // Wait for the actual close and allow the route's scope to release admission.
        const ended = closed(first.socket)
        first.socket.close()
        yield* Effect.promise(() => ended)
        yield* Effect.sleep("50 millis")
        const replacement = connect(`${url}?deviceId=${nextId}`, origin)
        try {
          expect((yield* Effect.promise(replacement.next)).library).toBe(0)
        } finally {
          replacement.socket.terminate()
        }
      } finally {
        first.socket.terminate()
      }
    }).pipe(
      Effect.provide(
        HttpRouter.serve(
          makeLiveRoute({
            total: limit === "total" ? 1 : 10,
            profile: limit === "profile" ? 1 : 10,
            peer: limit === "peer" ? 1 : 10
          })
        ).pipe(Layer.provideMerge(transport()), Layer.provideMerge(services))
      )
    )
  )
}

it.live("bounds anonymous sockets by peer and validates profile identity", () =>
  Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer
    const origin = HttpServer.formatAddress(server.address)
    const url = `${origin.replace("http:", "ws:")}/api/live`
    const first = connect(url, origin)
    try {
      yield* Effect.promise(first.next)
      expect(yield* Effect.promise(() => rejected(url, origin))).toBe(429)
      for (const id of ["", "a".repeat(129)])
        expect(yield* Effect.promise(() => rejected(`${url}?deviceId=${id}`, origin))).toBe(400)
    } finally {
      first.socket.terminate()
    }
  }).pipe(
    Effect.provide(
      HttpRouter.serve(makeLiveRoute({ total: 10, profile: 1, peer: 10 })).pipe(
        Layer.provideMerge(transport()),
        Layer.provideMerge(services)
      )
    )
  )
)

it.live("rejects unsolicited messages and oversized or fragmented inbound payloads", () =>
  Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer
    const origin = HttpServer.formatAddress(server.address)
    const url = `${origin.replace("http:", "ws:")}/api/live`
    for (const mode of ["message", "oversized", "fragmented"] as const) {
      const client = connect(url, origin)
      try {
        yield* Effect.promise(client.next)
        const ended = closed(client.socket)
        if (mode === "fragmented") {
          client.socket.send("a".repeat(600), { fin: false })
          client.socket.send("a".repeat(600), { fin: true })
        } else client.socket.send(mode === "message" ? "hello" : "a".repeat(1025))
        expect(yield* Effect.promise(() => ended)).toBe(mode === "message" ? 1008 : 1009)
      } finally {
        client.socket.terminate()
      }
    }
  }).pipe(Effect.provide(running))
)

it.live("keeps responsive idle clients alive and terminates clients missing pong", () =>
  Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer
    const origin = HttpServer.formatAddress(server.address)
    const url = `${origin.replace("http:", "ws:")}/api/live`
    const healthy = connect(url, origin)
    const idle = new NodeWS.WebSocket(url, { headers: { origin }, autoPong: false })
    idle.on("error", () => {})
    try {
      const ended = closed(idle)
      yield* Effect.promise(healthy.next)
      expect(yield* Effect.promise(() => ended)).toBe(1006)
      expect(healthy.socket.readyState).toBe(NodeWS.WebSocket.OPEN)
    } finally {
      healthy.socket.terminate()
      idle.terminate()
    }
  }).pipe(
    Effect.provide(
      HttpRouter.serve(LiveRoute).pipe(
        Layer.provideMerge(transport(50)),
        Layer.provideMerge(services)
      )
    )
  )
)

it.live("enforces the outbound byte limit on the actual server transport", () =>
  Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer
    const origin = HttpServer.formatAddress(server.address)
    const client = connect(`${origin.replace("http:", "ws:")}/api/live`, origin)
    try {
      const ended = closed(client.socket)
      expect(yield* Effect.promise(() => ended)).toBe(1006)
    } finally {
      client.socket.terminate()
    }
  }).pipe(
    Effect.provide(
      HttpRouter.serve(LiveRoute).pipe(
        Layer.provideMerge(
          NodeHttpServer.layer(createServer, {
            port: 0,
            host: "127.0.0.1",
            websocket: liveWebSocketOptions({ ...liveLimits, bufferedBytes: 1 })
          })
        ),
        Layer.provideMerge(services)
      )
    )
  )
)

it.live("releases admission on a refused transport handshake", () =>
  Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer
    const origin = HttpServer.formatAddress(server.address)
    const status = yield* Effect.promise(
      () =>
        new Promise<number>((resolve, reject) => {
          const req = request(
            `${origin}/api/live`,
            {
              headers: {
                origin,
                connection: "Upgrade",
                upgrade: "websocket",
                "sec-websocket-version": "13",
                "sec-websocket-key": "invalid-key"
              }
            },
            (response) => {
              response.resume()
              resolve(response.statusCode ?? 0)
            }
          )
          req.on("error", reject)
          req.end()
        })
    )
    expect(status).toBe(400)
    yield* Effect.sleep("50 millis")
    const client = connect(`${origin.replace("http:", "ws:")}/api/live`, origin)
    try {
      expect((yield* Effect.promise(client.next)).library).toBe(0)
    } finally {
      client.socket.terminate()
    }
  }).pipe(
    Effect.provide(
      HttpRouter.serve(makeLiveRoute({ total: 1, profile: 1, peer: 1 })).pipe(
        Layer.provideMerge(transport()),
        Layer.provideMerge(services)
      )
    )
  )
)
