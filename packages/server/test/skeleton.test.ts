import { assert, describe, it, layer } from "@effect/vitest"
import { PodListApi } from "@podlist/api"
import { Protocol } from "@podlist/domain"
import { Effect, Layer } from "effect"
import { HttpServer } from "effect/http"
import { HttpApiTest } from "effect/http-api"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"
import { SystemHandlers } from "../src/Http.ts"

layer(Layer.mergeAll(SystemHandlers, HttpServer.layerServices))("HTTP API", (it) => {
  it.effect("reports health and the protocol version", () =>
    Effect.gen(function* () {
      const client = yield* HttpApiTest.groups(PodListApi, ["system"])
      const health = yield* client.system.health()
      assert.deepStrictEqual({ ...health }, { status: "ok", protocolVersion: Protocol.version })
    })
  )
})

describe("Database", () => {
  it.effect("migrates a fresh database to the shared schema", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const tables = yield* sql<{ name: string }>`
        SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      assert.includeMembers(
        tables.map((t) => t.name),
        ["episode", "episode_state", "entry_index", "playlist", "subscription", "view"]
      )
    }).pipe(Effect.provide(Database.layer(":memory:")))
  )
})
