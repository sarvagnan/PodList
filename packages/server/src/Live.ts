import { NodeHttpServerRequest } from "@effect/platform-node"
import { Reads } from "@podlist/api"
import { Effect } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { SqlClient } from "effect/sql"
import { liveLimits } from "./LiveSocket.ts"
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
export const makeLiveRoute = (
  limits: { total: number; profile: number; peer: number } = liveLimits
) =>
  HttpRouter.use((router) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const current = cursors.pipe(Effect.provideService(SqlClient.SqlClient, sql))
      let total = 0
      const profiles = new Map<string, number>()
      const peers = new Map<string, number>()
      const adjust = (counts: Map<string, number>, key: string, delta: number) => {
        const count = (counts.get(key) ?? 0) + delta
        if (count === 0) counts.delete(key)
        else counts.set(key, count)
      }
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
          const deviceId = url.searchParams.get("deviceId")
          if (deviceId !== null && (deviceId.length === 0 || deviceId.length > 128))
            return HttpServerResponse.empty({ status: 400 })
          // The peer cap also bounds clients rotating their self-reported Device id.
          // Never use forwarded IP headers for admission.
          const connection = NodeHttpServerRequest.toIncomingMessage(request).socket
          const peer = connection.remoteAddress ?? "unknown"
          const profile = deviceId === null ? `peer:${peer}` : `device:${deviceId}`
          // Check and reserve atomically, and release on every exit (including failed upgrades).
          const admitted = yield* Effect.acquireUseRelease(
            Effect.sync(() => {
              if (
                total >= limits.total ||
                (profiles.get(profile) ?? 0) >= limits.profile ||
                (peers.get(peer) ?? 0) >= limits.peer
              )
                return false
              total++
              adjust(profiles, profile, 1)
              adjust(peers, peer, 1)
              return true
            }),
            (admitted) =>
              admitted
                ? Effect.scoped(
                    Effect.gen(function* () {
                      const socket = yield* request.upgrade
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
                  ).pipe(
                    Effect.catch(() => Effect.void),
                    Effect.as(true)
                  )
                : Effect.succeed(false),
            (admitted) =>
              Effect.sync(() => {
                if (!admitted) return
                const release = () => {
                  total--
                  adjust(profiles, profile, -1)
                  adjust(peers, peer, -1)
                }
                // Closing handshakes still consume a physical socket. Keep the slot
                // until TCP closes, so protocol failures cannot bypass admission.
                if (connection.destroyed) release()
                else connection.once("close", release)
              })
          )
          return HttpServerResponse.empty({ status: admitted ? 200 : 429 })
        })
      )
    })
  )

export const LiveRoute = makeLiveRoute()
