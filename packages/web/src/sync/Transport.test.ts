import { expect, it } from "@effect/vitest"
import { Operation, Protocol } from "@podlist/domain"
import { Effect, Schema } from "effect"
import { vi } from "vitest"
import { Offline, SyncBlocked, Transport } from "./Transport.ts"

const operation = Schema.decodeUnknownSync(Operation.Operation)({
  id: "pending",
  deviceId: "web",
  sequence: 1,
  recordedAt: 1,
  change: { _tag: "SetStar", episodeId: "e", starred: true }
})

for (const scenario of [
  {
    status: 426,
    body: { _tag: "UpdateRequired", minimumProtocolVersion: 6, unsupportedOperations: ["Future"] },
    reason: "UpdateRequired",
    version: 6
  },
  {
    status: 422,
    body: {
      _tag: "UnsupportedOperation",
      serverProtocolVersion: 4,
      unsupportedOperations: ["Future"]
    },
    reason: "UnsupportedOperation",
    version: 4
  },
  {
    status: 200,
    body: { cursor: 9, snapshot: null, operations: [{ ...operation, change: { _tag: "Future" } }] },
    reason: "UpdateRequired",
    version: 6
  }
] as const) {
  it.effect(
    `declares v5 and preserves ${scenario.status} ${scenario.reason} at the HTTP boundary`,
    () => {
      const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
        expect(new Headers(init?.headers).get(Protocol.versionHeader)).toBe("5")
        return Response.json(scenario.body, { status: scenario.status })
      })
      return Effect.gen(function* () {
        const transport = yield* Transport
        const error = yield* (
          scenario.status === 422
            ? transport.push([operation]).pipe(Effect.asVoid)
            : transport.pull(8).pipe(Effect.asVoid)
        ).pipe(Effect.flip)
        expect(error).toBeInstanceOf(SyncBlocked)
        expect(error).toMatchObject({ reason: scenario.reason, protocolVersion: scenario.version })
      }).pipe(
        Effect.provide(Transport.layerHttp(location.origin)),
        Effect.ensuring(Effect.sync(() => fetch.mockRestore()))
      )
    }
  )
}

it.effect("malformed known operations remain ordinary response failures", () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      cursor: 9,
      snapshot: null,
      operations: [{ ...operation, change: { _tag: "SetStar" } }]
    })
  )
  return Effect.gen(function* () {
    const transport = yield* Transport
    const error = yield* transport.pull(8).pipe(Effect.flip)
    expect(error).toBeInstanceOf(Offline)
    expect(error).not.toBeInstanceOf(SyncBlocked)
  }).pipe(
    Effect.provide(Transport.layerHttp(location.origin)),
    Effect.ensuring(Effect.sync(() => fetch.mockRestore()))
  )
})

it.effect("blocks a v5 emission before contacting an older server's push endpoint", () => {
  const requests: string[] = []
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    requests.push(String(input))
    return Response.json({
      status: "ok",
      protocolVersion: 4,
      supportedOperations: ["PurgePlaylist"]
    })
  })
  return Effect.gen(function* () {
    const transport = yield* Transport
    const purge = Schema.decodeUnknownSync(Operation.Operation)({
      ...operation,
      change: { _tag: "PurgePlaylist", playlistId: "p" }
    })
    const error = yield* transport.push([purge]).pipe(Effect.flip)
    expect(error).toMatchObject({ reason: "UnsupportedOperation", protocolVersion: 4 })
    expect(requests).toHaveLength(1)
    expect(requests[0]).toContain("/api/health")
  }).pipe(
    Effect.provide(Transport.layerHttp(location.origin)),
    Effect.ensuring(Effect.sync(() => fetch.mockRestore()))
  )
})
