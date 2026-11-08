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
  } finally {
    await dispose()
  }
})
