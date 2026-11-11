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

it("serves the complete committed OpenAPI including raw streams and auth", async () => {
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
  const { handler, dispose } = HttpRouter.toWebHandler(
    ApiRoutes.pipe(Layer.provide(services), Layer.provide(HttpServer.layerServices)),
    { disableLogger: true }
  )
  try {
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
  } finally {
    await dispose()
  }
})
