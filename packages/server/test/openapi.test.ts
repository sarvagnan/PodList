import { readFileSync } from "node:fs"
import { expect, it } from "@effect/vitest"
import { Protocol } from "@podlist/domain"
import { Effect, Layer } from "effect"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
  HttpRouter,
  HttpServer
} from "effect/http"
import { Catalogue } from "../src/Catalogue.ts"
import { Chapters } from "../src/Chapters.ts"
import * as Database from "../src/Database.ts"
import { Directory } from "../src/Directory.ts"
import { ApiRoutes } from "../src/Http.ts"
import { Library } from "../src/Library.ts"
import { Poller } from "../src/Poller.ts"
import { Subscriptions } from "../src/Subscriptions.ts"
import { SyncStore } from "../src/SyncStore.ts"

const createAPI = (network: Layer.Layer<HttpClient.HttpClient> = FetchHttpClient.layer) => {
  const services = Layer.mergeAll(
    SyncStore.layer,
    Poller.layer,
    Subscriptions.layer,
    Catalogue.layer,
    Directory.layer,
    Chapters.layer
  ).pipe(
    Layer.provideMerge(Library.layer),
    Layer.provide(network),
    Layer.provideMerge(Database.layer(":memory:"))
  )
  return HttpRouter.toWebHandler(
    ApiRoutes.pipe(Layer.provide(services), Layer.provide(HttpServer.layerServices)),
    { disableLogger: true }
  )
}

it("serves Library and preview links only to readers declaring protocol v6 or later", async () => {
  const xml = readFileSync(new URL("fixtures/night-shift.xml", import.meta.url), "utf8")
  const network = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, new Response(xml)))
    )
  )
  const { handler, dispose } = createAPI(network)
  const feed = { feedUrl: "https://example.test/night.xml" }
  const request = (path: string, version?: string, payload?: unknown) =>
    handler(
      new Request(`http://podlist.test/api/${path}`, {
        method: payload === undefined ? "GET" : "POST",
        headers: {
          "content-type": "application/json",
          ...(version === undefined ? {} : { [Protocol.versionHeader]: version })
        },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
      })
    )
  try {
    const podcast = "https://example.test/night-shift"
    const episode = "https://example.test/episodes/0212?from=rss&lang=en"
    const followed = await request("subscriptions", "6", feed)
    expect(followed.status).toBe(200)
    expect(await followed.json()).toMatchObject({ websiteUrl: podcast })
    type WireRow = Record<string, unknown>
    const linked = (await request("library/changes?since=0", "6").then((r) => r.json())) as {
      subscriptions: WireRow[]
      episodes: WireRow[]
    }
    expect(linked).toMatchObject({
      subscriptions: [{ websiteUrl: podcast }]
    })
    expect(linked.episodes).toHaveLength(2)
    expect(linked.episodes.map((row) => row.websiteUrl)).toEqual(
      expect.arrayContaining([episode, null])
    )
    expect(await request("podcasts/read", "7", feed).then((r) => r.json())).toMatchObject({
      link: podcast,
      episodes: [{ link: episode }, { link: null }]
    })
    for (const version of [undefined, "4", "5", "invalid"]) {
      const page = await request("library/changes?since=0", version).then((r) => r.json())
      expect(page).toEqual({
        ...linked,
        subscriptions: linked.subscriptions.map(({ websiteUrl: _, ...row }) => row),
        episodes: linked.episodes.map(({ websiteUrl: _, ...row }) => row)
      })
      const [subscription] = (await request("subscriptions", version).then((r) =>
        r.json()
      )) as WireRow[]
      expect(subscription).not.toHaveProperty("websiteUrl")
      const preview = (await request("podcasts/read", version, feed).then((r) => r.json())) as {
        episodes: WireRow[]
      }
      expect(preview).not.toHaveProperty("link")
      for (const item of preview.episodes) expect(item).not.toHaveProperty("link")
    }
  } finally {
    await dispose()
  }
})

it("gives v7 Library pages the Subscriptions needed to apply 500 Episodes before their Unsubscribe", async () => {
  const items = Array.from(
    { length: 500 },
    (_, i) => `<item><title>Episode ${i}</title><guid>${i}</guid>
      <enclosure url="https://example.test/audio/${i}.mp3" type="audio/mpeg"/></item>`
  ).join("")
  const websiteUrl = "https://example.test/podcast"
  const xml = `<rss version="2.0"><channel><title>Podcast</title><link>${websiteUrl}</link>${items}</channel></rss>`
  const network = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, new Response(xml)))
    )
  )
  const { handler, dispose } = createAPI(network)
  const request = async (path: string, version: string, init?: RequestInit) => {
    const response = await handler(
      new Request(`http://podlist.test/api/${path}`, {
        ...init,
        headers: { "content-type": "application/json", [Protocol.versionHeader]: version }
      })
    )
    expect(response.status).toBe(200)
    return response.json()
  }
  const changes = (since: number, version = "7") =>
    request(`library/changes?since=${since}`, version) as Promise<{
      cursor: number
      subscriptions: Array<{ id: string }>
      episodes: Array<{ subscriptionId: string }>
      referencedSubscriptions?: Array<{ id: string }>
      more: boolean
    }>
  try {
    const followed = (await request("subscriptions", "7", {
      method: "POST",
      body: JSON.stringify({ feedUrl: "https://example.test/feed" })
    })) as { id: string }
    const firstWhileFollowed = await changes(0)
    expect(firstWhileFollowed).toMatchObject({
      subscriptions: [followed],
      referencedSubscriptions: [],
      more: true
    })
    expect(firstWhileFollowed.episodes).toHaveLength(499)
    const lastWhileFollowed = await changes(firstWhileFollowed.cursor)
    expect(lastWhileFollowed).toMatchObject({
      subscriptions: [],
      referencedSubscriptions: [followed],
      more: false
    })
    expect(lastWhileFollowed.episodes).toHaveLength(1)

    const removed = await request(`subscriptions/${followed.id}`, "7", { method: "DELETE" })
    expect(removed).toMatchObject({
      id: followed.id,
      websiteUrl,
      unsubscribedAt: expect.any(Number)
    })
    const first = await changes(0)
    expect(first).toMatchObject({
      subscriptions: [],
      referencedSubscriptions: [removed],
      more: true
    })
    expect(first.cursor).toBe(lastWhileFollowed.cursor)
    expect(first.episodes).toHaveLength(500)
    expect(new Set(first.episodes.map((episode) => episode.subscriptionId))).toEqual(
      new Set([followed.id])
    )

    const second = await changes(first.cursor)
    expect(second.cursor).toBeGreaterThan(first.cursor)
    expect(second).toMatchObject({
      subscriptions: [removed],
      referencedSubscriptions: [],
      episodes: [],
      more: false
    })
    const empty = await changes(second.cursor)
    expect(empty).toEqual({
      cursor: second.cursor,
      subscriptions: [],
      referencedSubscriptions: [],
      episodes: [],
      more: false
    })
    const { referencedSubscriptions: _, ...v6First } = first
    const { referencedSubscriptions: __, ...v6Second } = second
    expect(await changes(0, "6")).toEqual(v6First)
    expect(await changes(first.cursor, "6")).toEqual(v6Second)
    expect(await changes(0, "8")).toEqual(first)
  } finally {
    await dispose()
  }
})

it("serves the complete committed OpenAPI including raw streams and auth", async () => {
  const { handler, dispose } = createAPI()
  try {
    const health = await handler(new Request("http://podlist.test/api/health"))
    expect(health.status).toBe(200)
    expect(await health.json()).toMatchObject({ protocolVersion: 7 })
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
      serverProtocolVersion: 7,
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
      serverProtocolVersion: 7,
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
