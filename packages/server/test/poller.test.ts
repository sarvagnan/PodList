import { readFileSync } from "node:fs"
import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { SqlClient } from "effect/sql"
import * as Database from "../src/Database.ts"
import { Library } from "../src/Library.ts"
import { backoffMillis, Poller } from "../src/Poller.ts"

const xml = readFileSync(new URL("fixtures/night-shift.xml", import.meta.url), "utf8")
const minute = 60_000

describe("backoff", () => {
  it("doubles from 30 minutes and caps at a day", () => {
    expect([0, 1, 2, 3].map(backoffMillis)).toEqual([0, 30 * minute, 60 * minute, 120 * minute])
    expect(backoffMillis(20)).toBe(24 * 60 * minute)
  })
})

// "good" serves the fixture; "bad" answers 500.
const network = Layer.succeed(
  HttpClient.HttpClient,
  HttpClient.make((request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        request.url.includes("bad")
          ? new Response("down", { status: 500 })
          : new Response(xml, { status: 200 })
      )
    )
  )
)

describe("refreshAll", () => {
  it.effect("refreshes active feeds, records failures, then backs off from them", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const sub = (id: string, unsubscribed: number | null = null) => ({
        id,
        feed_url: `https://example.test/${id}.xml`,
        title: id,
        subscribed_at: 0,
        unsubscribed_at: unsubscribed
      })
      yield* sql`INSERT INTO subscription ${sql.insert([sub("good"), sub("bad"), sub("old", 1)])}`
      const poller = yield* Poller

      const first = yield* poller.refreshAll({ respectBackoff: true })
      assert.deepStrictEqual(first, { checked: 2, updated: 1, notModified: 0, failed: 1 })
      const [bad] = yield* sql<{ failures: number; last_error: string }>`
        SELECT failures, last_error FROM feed_state WHERE subscription_id = 'bad'`
      assert.strictEqual(bad?.failures, 1)
      assert.include(bad?.last_error ?? "", "500")

      // Straight away, the failing feed is still backing off; a manual refresh ignores that.
      const scheduled = yield* poller.refreshAll({ respectBackoff: true })
      assert.strictEqual(scheduled.failed, 0)
      const manual = yield* poller.refreshAll({ respectBackoff: false })
      assert.strictEqual(manual.failed, 1)
    }).pipe(
      Effect.provide(
        Poller.layer.pipe(
          Layer.provideMerge(Library.layer),
          Layer.provide(network),
          Layer.provideMerge(Database.layer(":memory:"))
        )
      )
    )
  )
})
