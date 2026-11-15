import { readFileSync } from "node:fs"
import { expect, it } from "@effect/vitest"
import { Layer } from "effect"
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http"
import { Catalogue } from "../src/Catalogue.ts"
import { Chapters } from "../src/Chapters.ts"
import * as Database from "../src/Database.ts"
import { Directory } from "../src/Directory.ts"
import { ApiRoutes } from "../src/Http.ts"
import { Library } from "../src/Library.ts"
import { Poller } from "../src/Poller.ts"
import { Subscriptions } from "../src/Subscriptions.ts"
import { SyncStore } from "../src/SyncStore.ts"

const createAPI = () => {
  const services = Layer.mergeAll(
    SyncStore.layer,
    Poller.layer,
    Subscriptions.layer,
    Catalogue.layer,
    Directory.layer,
    Chapters.layer
  ).pipe(
    Layer.provideMerge(Library.layer),
    Layer.provide(FetchHttpClient.layer),
    Layer.provideMerge(Database.layer(":memory:"))
  )
  return HttpRouter.toWebHandler(
    ApiRoutes.pipe(Layer.provide(services), Layer.provide(HttpServer.layerServices)),
    { disableLogger: true }
  )
}

it("serves the complete committed OpenAPI including raw streams and auth", async () => {
  const { handler, dispose } = createAPI()
  try {
    const health = await handler(new Request("http://podlist.test/api/health"))
    expect(health.status).toBe(200)
    expect(await health.json()).toMatchObject({ protocolVersion: 5 })
    const response = await handler(new Request("http://podlist.test/api/openapi.json"))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(
      JSON.parse(
        readFileSync(new URL("../../domain/protocol/openapi.json", import.meta.url), "utf8")
      )
    )
    // The runtime's malformed-request response is empty, not a tagged JSON error.
    const malformed = await handler(
      new Request("http://podlist.test/api/sync/pull?since=not-a-number")
    )
    expect(malformed.status).toBe(400)
    expect(await malformed.text()).toBe("")
    for (const query of ["pageSize=0", "pageSize=201", "pageSize=1.5"]) {
      const invalid = await handler(
        new Request(`http://podlist.test/api/reads/subscriptions?${query}`)
      )
      expect(invalid.status).toBe(400)
      expect(await invalid.text()).toBe("")
    }
    const tooMany = await handler(
      new Request("http://podlist.test/api/reads/episodes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: Array.from({ length: 201 }, (_, i) => `e${i}`) })
      })
    )
    expect(tooMany.status).toBe(400)
    // Both schema length and word budgets reject before any SQL is prepared.
    for (const q of [
      "a".repeat(1025),
      Array(33).fill("a").join(" "),
      Array(1000).fill("a").join(" ")
    ]) {
      for (const [path, payload] of [
        ["search", { q }],
        ["filter", { filter: { text: q }, sort: "publishedDesc", limit: null }]
      ] as const) {
        const response = await handler(
          new Request(`http://podlist.test/api/reads/${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          })
        )
        expect(response.status).toBe(400)
      }
    }
    for (const subscriptionIds of [Array(201).fill("s"), ["s".repeat(257)]]) {
      const response = await handler(
        new Request("http://podlist.test/api/reads/filter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            filter: { podcasts: { mode: "include", subscriptionIds } },
            sort: "publishedDesc",
            limit: null
          })
        })
      )
      expect(response.status).toBe(400)
    }
    for (const q of ["a".repeat(1024), Array(32).fill("a").join(" "), "   "]) {
      const response = await handler(
        new Request("http://podlist.test/api/reads/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q })
        })
      )
      expect(response.status).toBe(200)
    }
    // Extra keys and escaped JSON cannot bypass the total byte budget.
    const hugeBody = JSON.stringify({ q: "ok", extra: "a".repeat(65536) })
    for (const withLength of [true, false]) {
      const response = await handler(
        new Request("http://podlist.test/api/reads/search", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(withLength ? { "content-length": String(Buffer.byteLength(hugeBody)) } : {})
          },
          body: hugeBody
        })
      )
      expect(response.status).toBe(413)
    }
    const token = await handler(
      new Request("http://podlist.test/api/reads/subscriptions?continuation=invalid")
    )
    expect(token.status).toBe(400)
    expect(await token.json()).toEqual({ _tag: "InvalidContinuation" })
    const counts = await handler(new Request("http://podlist.test/api/reads/views/counts"))
    expect(counts.status).toBe(200)
    expect(await counts.json()).toEqual({ counts: [], cursors: { state: 0, library: 0 } })
    const cursors = await handler(new Request("http://podlist.test/api/live/cursors"))
    expect(cursors.status).toBe(200)
    expect(await cursors.json()).toEqual({ state: 0, library: 0 })
    const missing = await handler(new Request("http://podlist.test/api/reads/views/missing"))
    expect(missing.status).toBe(404)

    // The advertised capability must work through HTTP validation, SQLite and replay.
    const post = (path: string, payload: unknown) =>
      handler(
        new Request(`http://podlist.test/api/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        })
      )
    expect(
      (await post("devices", { id: "mac", name: "Test Mac", kind: "desktop", registeredAt: 0 }))
        .status
    ).toBe(200)
    const operations = [
      { _tag: "CreatePlaylist", playlistId: "trash", name: "Trash", clearOnPlayed: false },
      { _tag: "DeletePlaylist", playlistId: "trash" },
      { _tag: "PurgePlaylist", playlistId: "trash" }
    ].map((change, index) => ({
      id: `purge-${index}`,
      deviceId: "mac",
      sequence: index,
      recordedAt: index,
      change
    }))
    const pushed = await post("sync/push", { operations })
    expect(pushed.status).toBe(200)
    expect(await pushed.json()).toMatchObject({ accepted: 3, cursor: 3 })
    const pulled = await handler(
      new Request("http://podlist.test/api/sync/pull?since=1", {
        headers: { "x-podlist-protocol-version": "5" }
      })
    )
    expect(pulled.status).toBe(200)
    expect(await pulled.json()).toMatchObject({ cursor: 3, operations: operations.slice(1) })
    const snapshot = await handler(
      new Request("http://podlist.test/api/sync/pull?since=0", {
        headers: { "x-podlist-protocol-version": "5" }
      })
    )
    expect(await snapshot.json()).toMatchObject({ snapshot: { trash: [] } })
    // Unknown variants reject the whole batch, including preceding valid changes.
    const invalid = await post("sync/push", {
      operations: [
        { ...operations[0], id: "uncommitted" },
        { ...operations[2], id: "unknown", change: { _tag: "UnknownChange" } }
      ]
    })
    expect(invalid.status).toBe(422)
    expect(await invalid.json()).toEqual({
      _tag: "UnsupportedOperation",
      serverProtocolVersion: 5,
      unsupportedOperations: ["UnknownChange"]
    })
    const unchanged = await handler(new Request("http://podlist.test/api/sync/pull?since=3"))
    expect(await unchanged.json()).toMatchObject({ cursor: 3, operations: [] })
  } finally {
    await dispose()
  }
})

it("refuses unreadable pulls and unknown pushes without partial progress", async () => {
  const { handler, dispose } = createAPI()
  try {
    // Unknown discriminators reject the entire push before any State/log mutation.
    const operation = (id: string, tag: string) => ({
      id,
      deviceId: "phone",
      sequence: 0,
      recordedAt: 1,
      change:
        tag === "SetStar"
          ? { _tag: tag, episodeId: "a", starred: true }
          : { _tag: tag, playlistId: "p" }
    })
    const push = (operations: unknown[]) =>
      handler(
        new Request("http://podlist.test/api/sync/push", {
          method: "POST",
          headers: { "content-type": "application/json", "x-podlist-protocol-version": "5" },
          body: JSON.stringify({ operations })
        })
      )
    const refusedPush = await push([
      operation("safe", "SetStar"),
      operation("future", "FutureOperation")
    ])
    expect(refusedPush.status).toBe(422)
    expect(await refusedPush.json()).toEqual({
      _tag: "UnsupportedOperation",
      serverProtocolVersion: 5,
      unsupportedOperations: ["FutureOperation"]
    })
    const empty = await handler(new Request("http://podlist.test/api/sync/pull?since=0"))
    expect(((await empty.json()) as { cursor: number }).cursor).toBe(0)
    expect(
      (await push([operation("safe", "SetStar"), operation("purge", "PurgePlaylist")])).status
    ).toBe(200)
    for (const since of [0, 1]) {
      for (const version of [undefined, "4"]) {
        const refused = await handler(
          new Request(`http://podlist.test/api/sync/pull?since=${since}`, {
            headers: version ? { "x-podlist-protocol-version": version } : {}
          })
        )
        expect(refused.status).toBe(426)
        expect(await refused.json()).toEqual({
          _tag: "UpdateRequired",
          minimumProtocolVersion: 5,
          unsupportedOperations: ["PurgePlaylist"]
        })
      }
    }
    const current = await handler(
      new Request("http://podlist.test/api/sync/pull?since=1", {
        headers: { "x-podlist-protocol-version": "5" }
      })
    )
    expect(current.status).toBe(200)
    expect(await current.json()).toMatchObject({ cursor: 2, operations: [{ id: "purge" }] })
  } finally {
    await dispose()
  }
})
