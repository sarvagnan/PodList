import { Reads } from "@podlist/api"
import { Effect } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { SqlClient } from "effect/sql"
import { cursors } from "./Reads.ts"

/** The proxy preserves Host and supplies X-Forwarded-Proto for HTTPS termination. */
export const sameOrigin = (
  origin: string | undefined,
  host: string | undefined,
  protocol: string
) => {
  if (!origin || !host || (protocol !== "http" && protocol !== "https")) return false
  try {
    const parsed = new URL(origin)
    return parsed.origin === origin && parsed.origin === `${protocol}://${host}`
  } catch {
    return false
  }
}

/** Notifications coalesce changes. Durable database cursors make reconnects lossless. */
export const LiveRoute = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const current = cursors.pipe(Effect.provideService(SqlClient.SqlClient, sql))
    yield* router.add(
      "GET",
      Reads.livePath,
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        // No credentials or forwarded host are trusted. Browser upgrades must be same-origin.
        const protocol =
          request.protocol ??
          request.headers["x-forwarded-proto"] ??
          (request.originalUrl.startsWith("https:") ? "https" : "http")
        if (!sameOrigin(request.headers.origin, request.headers.host, protocol)) {
          return HttpServerResponse.empty({ status: 403 })
        }
        const url = new URL(request.url, "http://localhost")
        const parse = (name: string) => {
          const value = url.searchParams.get(name)
          return value === null
            ? 0
            : /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
              ? Number(value)
              : null
        }
        const state = parse("state")
        const library = parse("library")
        if (state === null || library === null) return HttpServerResponse.empty({ status: 400 })
        if (request.headers.upgrade?.toLowerCase() !== "websocket") {
          return HttpServerResponse.empty({ status: 426 })
        }
        const socket = yield* request.upgrade
        yield* Effect.scoped(
          Effect.gen(function* () {
            const reader = yield* socket.reader
            const writer = yield* socket.writer
            const send = Effect.gen(function* () {
              let last = { state, library }
              let ticks = 0
              let initial = true
              while (true) {
                const next = yield* current
                if (
                  initial ||
                  next.state !== last.state ||
                  next.library !== last.library ||
                  ticks >= 30
                ) {
                  yield* writer.write(
                    JSON.stringify({
                      ...next,
                      reset: next.state < last.state || next.library < last.library
                    })
                  )
                  last = next
                  ticks = 0
                  initial = false
                }
                ticks++
                yield* Effect.sleep("500 millis")
              }
            })
            // Reading notices peer close immediately and cancels the notification loop.
            yield* Effect.raceFirst(send, Effect.forever(reader.pull))
          })
        ).pipe(Effect.catch(() => Effect.void))
        return HttpServerResponse.empty()
      })
    )
  })
)
