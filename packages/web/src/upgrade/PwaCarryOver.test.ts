import { Sync } from "@podlist/api"
import { Operation, PlaybackSettings, State, Units } from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { createElement, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as LocalDb from "../platform/LocalDb.ts"
import { Offline, Transport } from "../sync/Transport.ts"
import { carryOverPwa, legacyFiles, runPwaCarryOver } from "./PwaCarryOver.ts"
import { PwaUpgradeGate } from "./PwaUpgradeGate.tsx"

const defaults = new PlaybackSettings.PlaybackSettings({
  speed: 1,
  skipIntro: Units.Seconds.make(0),
  skipOutro: Units.Seconds.make(0),
  volumeBoost: false
})
const operationJson = Schema.fromJsonString(Operation.Operation)
const operation = (sequence: number, change: unknown) =>
  Schema.decodeUnknownSync(Operation.Operation)({
    id: `legacy-${sequence}`,
    deviceId: "old-pwa-device",
    sequence: sequence + 40,
    recordedAt: sequence + 1000,
    change
  })
const changes = [
  operation(0, {
    _tag: "AddEntry",
    playlistId: "default",
    episodeId: "episode",
    placement: "last"
  }),
  operation(1, {
    _tag: "ReportPosition",
    playlistId: "default",
    episodeId: "episode",
    position: 42,
    listenedAt: 1001,
    listening: [{ day: "2026-11-11", subscriptionId: "podcast", seconds: 12 }]
  }),
  operation(2, {
    _tag: "RecordListening",
    amounts: [{ day: "2026-11-11", subscriptionId: "podcast", seconds: 8 }]
  })
]

const seed = async (operations = changes) => {
  const name = `upgrade-${crypto.randomUUID()}.db`
  await Effect.runPromise(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      yield* sql`INSERT INTO sync_meta (key, value) VALUES ('deviceId', 'old-pwa-device'), ('sequence', '300')`
      for (const op of operations) {
        yield* sql`INSERT INTO outbox ${sql.insert({
          id: op.id,
          operation: Schema.encodeSync(operationJson)(op)
        })}`
      }
    }).pipe(Effect.provide(LocalDb.layerWeb(name).pipe(Layer.provide(Reactivity.layer))))
  )
  return name
}

const server = () => {
  let state = State.initial(defaults)
  const committed = new Set<string>()
  const submitted: Array<ReadonlyArray<Operation.Operation>> = []
  let failAt = -1
  let lostResponseAt = -1
  let acknowledge = true
  const register = vi.fn(() => Effect.void)
  const transport = Transport.of({
    registerDevice: register,
    push: (operations) =>
      Effect.gen(function* () {
        submitted.push(operations)
        if (submitted.length === failAt) return yield* Effect.fail(new Offline("offline"))
        const fresh = operations.filter((op) => !committed.has(op.id))
        state = State.applyOperations(state, fresh).state
        for (const op of fresh) committed.add(op.id)
        if (submitted.length === lostResponseAt) {
          return yield* Effect.fail(new Offline("response lost after commit"))
        }
        return new Sync.PushResponse({
          cursor: committed.size,
          accepted: fresh.length,
          ...(acknowledge ? { acknowledged: operations.map((op) => op.id) } : {})
        })
      }),
    pull: () => Effect.die("Carry-over must not pull or rebuild State"),
    catalogue: () => Effect.die("Carry-over must not load the Library"),
    chapters: () => Effect.succeed([])
  })
  return {
    submitted,
    committed,
    register,
    state: () => state,
    fail: (call: number) => {
      failAt = call
    },
    loseResponse: (call: number) => {
      lostResponseAt = call
    },
    acknowledge: (value: boolean) => {
      acknowledge = value
    },
    run: (name: string, report = vi.fn()) =>
      Effect.runPromise(
        carryOverPwa(report, name).pipe(Effect.provideService(Transport, transport))
      )
  }
}

afterEach(async () => {
  vi.restoreAllMocks()
  localStorage.removeItem("podlist:journal")
  // Each test owns its browser fixture storage. Physical deletion shrinks this
  // VFS's fixed six-file pool; reset it between independent legacy installations.
  const root = await navigator.storage.getDirectory()
  await root.removeEntry("opfs", { recursive: true }).catch((error: DOMException) => {
    if (error.name !== "NotFoundError") throw error
  })
})

describe("one-time PWA carry-over using the actual OPFS database", () => {
  it("flushes Operations, Position and Listening once, retaining old identity/order, then deletes only that DB", async () => {
    const name = await seed()
    const unrelated = await seed([])
    const backend = server()
    const progress = vi.fn()
    await backend.run(name, progress)
    expect(backend.submitted).toEqual([changes])
    expect(backend.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: "old-pwa-device", kind: "pwa" })
    )
    expect(progress.mock.calls.map(([n]) => n)).toEqual([3, 0])
    expect(backend.state()).toEqual(State.applyOperations(State.initial(defaults), changes).state)
    expect(await legacyFiles(name)).toBeNull()
    expect(await legacyFiles(unrelated)).not.toBeNull()
    await backend.run(name)
    expect(backend.submitted).toHaveLength(1)
  })

  it("resumes after an acknowledged batch and a lost response without applying Listening twice", async () => {
    const operations = Array.from({ length: 205 }, (_, index) =>
      operation(index, {
        _tag: "RecordListening",
        amounts: [{ day: "2026-11-11", subscriptionId: "podcast", seconds: 1 }]
      })
    )
    const name = await seed(operations)
    const backend = server()
    backend.loseResponse(2)
    await expect(backend.run(name)).rejects.toThrow("response lost")
    expect(await legacyFiles(name)).not.toBeNull()
    await backend.run(name)
    expect(backend.submitted.map((batch) => batch.length)).toEqual([100, 100, 100, 5])
    expect(backend.submitted[1]).toEqual(backend.submitted[2])
    expect(backend.committed.size).toBe(205)
    expect(backend.state()).toEqual(
      State.applyOperations(State.initial(defaults), operations).state
    )
    expect(await legacyFiles(name)).toBeNull()
  })

  it("retains the entire outbox, worker and caches on failure, then retries the same ids", async () => {
    const name = await seed()
    const backend = server()
    backend.fail(1)
    await caches.open("workbox-upgrade-failure")
    const registrations = vi.spyOn(navigator.serviceWorker, "getRegistrations")
    await expect(backend.run(name)).rejects.toThrow("offline")
    expect(registrations).not.toHaveBeenCalled()
    expect(await caches.keys()).toContain("workbox-upgrade-failure")
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<{ operation: string }>`SELECT operation FROM outbox ORDER BY seq`
        expect(rows.map((row) => Schema.decodeSync(operationJson)(row.operation))).toEqual(changes)
        expect(yield* sql`SELECT 1 FROM sync_meta WHERE key = 'webCarryOverDone'`).toHaveLength(0)
      }).pipe(Effect.provide(LocalDb.clientWithRetry(name).pipe(Layer.provide(Reactivity.layer))))
    )
    await backend.run(name)
    expect(backend.submitted[0]).toEqual(backend.submitted[1])
    expect(await caches.keys()).not.toContain("workbox-upgrade-failure")
  })

  it("refuses cleanup without explicit acknowledgement, including a legacy server response", async () => {
    const name = await seed()
    const backend = server()
    backend.acknowledge(false)
    await expect(backend.run(name)).rejects.toThrow("did not acknowledge")
    expect(await legacyFiles(name)).not.toBeNull()
    backend.acknowledge(true)
    await backend.run(name)
    expect(backend.committed.size).toBe(3)
  })

  it("stages the old typed-edit journal durably and retries with its stable id and sequence", async () => {
    const name = await seed()
    localStorage.setItem(
      "podlist:journal",
      JSON.stringify([
        {
          id: "journal-change",
          change: { _tag: "RenamePlaylist", playlistId: "default", name: "Recovered" }
        }
      ])
    )
    const backend = server()
    backend.loseResponse(1)
    await expect(backend.run(name)).rejects.toThrow("response lost")
    expect(localStorage.getItem("podlist:journal")).not.toBeNull()
    await backend.run(name)
    expect(backend.submitted[0]).toEqual(backend.submitted[1])
    expect(backend.submitted[0]?.at(-1)).toMatchObject({
      id: "journal-change",
      deviceId: "old-pwa-device",
      sequence: 300
    })
    expect(localStorage.getItem("podlist:journal")).toBeNull()
  })

  it("does not create a missing database and unregisters the worker even with nothing to send", async () => {
    const backend = server()
    const unregister = vi.fn(async () => true)
    vi.spyOn(navigator.serviceWorker, "getRegistrations").mockResolvedValue([
      { scope: `${location.origin}/`, unregister } as unknown as ServiceWorkerRegistration
    ])
    const name = `missing-${crypto.randomUUID()}.db`
    await backend.run(name)
    expect(unregister).toHaveBeenCalledOnce()
    expect(backend.submitted).toHaveLength(0)
    expect(backend.register).not.toHaveBeenCalled()
    expect(await legacyFiles(name)).toBeNull()
  })

  it("unregisters after an empty legacy DB and retries cleanup without repushing acknowledged changes", async () => {
    const name = await seed()
    const backend = server()
    const remove = vi
      .spyOn(FileSystemDirectoryHandle.prototype, "removeEntry")
      .mockRejectedValueOnce(new Error("cleanup interrupted"))
    await expect(backend.run(name)).rejects.toThrow("cleanup interrupted")
    expect(await legacyFiles(name)).not.toBeNull()
    remove.mockRestore()
    await backend.run(name)
    expect(backend.submitted).toHaveLength(1)
    const empty = await seed([])
    await backend.run(empty)
    expect(await legacyFiles(empty)).toBeNull()
  })

  it("waits for the old PWA to close without stealing its lock", async () => {
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let acquired: () => void = () => {}
    const ready = new Promise<void>((resolve) => {
      acquired = resolve
    })
    const old = navigator.locks.request("podlist-local-database", () => {
      acquired()
      return held
    })
    await ready
    try {
      await expect(runPwaCarryOver(vi.fn())).rejects.toThrow("Close PodList")
    } finally {
      release()
      await old
    }
    // Simultaneous new loads queue, rather than mistaking each other for a PWA.
    await Promise.all(Array.from({ length: 4 }, () => runPwaCarryOver(vi.fn())))
  })

  it("keeps corrupt VFS headers untouched instead of allowing VFS startup to discard them", async () => {
    const name = await seed()
    const found = await legacyFiles(name)
    if (!found?.files[0]) throw new Error("Missing seeded OPFS database")
    const handle = await found.directory.getFileHandle(found.files[0])
    const original = new Uint8Array(await (await handle.getFile()).arrayBuffer())
    // Damage only the header digest, leaving SQLite and the logical path intact.
    original[516] = (original[516] ?? 0) ^ 1
    const writer = await handle.createWritable()
    await writer.write(original)
    await writer.close()
    const backend = server()
    await expect(backend.run(name)).rejects.toThrow("database header")
    expect(backend.submitted).toHaveLength(0)
    expect(new Uint8Array(await (await handle.getFile()).arrayBuffer())).toEqual(original)
  })

  it("recovers new old-PWA edits recorded after a completion marker when cleanup failed", async () => {
    const name = await seed()
    const backend = server()
    const remove = vi
      .spyOn(FileSystemDirectoryHandle.prototype, "removeEntry")
      .mockRejectedValueOnce(new Error("cleanup interrupted"))
    await expect(backend.run(name)).rejects.toThrow("cleanup interrupted")
    remove.mockRestore()
    const added = operation(3, {
      _tag: "RecordListening",
      amounts: [
        {
          day: "2026-11-11",
          subscriptionId: "podcast",
          seconds: 5
        }
      ]
    })
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO outbox ${sql.insert({
          id: added.id,
          operation: Schema.encodeSync(operationJson)(added)
        })}`
      }).pipe(Effect.provide(LocalDb.clientWithRetry(name).pipe(Layer.provide(Reactivity.layer))))
    )
    await backend.run(name)
    expect(backend.submitted).toEqual([changes, [added]])
    expect(backend.committed.size).toBe(4)
    expect(await legacyFiles(name)).toBeNull()
  })

  it("blocks the app with visible sending/retry status and opens only after acknowledgement", async () => {
    const name = "podlist.db"
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO sync_meta (key, value) VALUES ('deviceId', 'old-pwa-device'), ('registered', '1')`
        for (const op of changes) {
          yield* sql`INSERT INTO outbox ${sql.insert({
            id: op.id,
            operation: Schema.encodeSync(operationJson)(op)
          })}`
        }
      }).pipe(Effect.provide(LocalDb.layerWeb(name).pipe(Layer.provide(Reactivity.layer))))
    )
    let release: () => void = () => {}
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    const submitted: unknown[] = []
    const nativeFetch = globalThis.fetch.bind(globalThis)
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = new Request(input, init)
      if (!request.url.endsWith("/api/sync/push")) return nativeFetch(input, init)
      submitted.push(await request.json())
      if (submitted.length === 1) {
        await waiting
        return new Response("offline", { status: 503 })
      }
      return Response.json({ cursor: 3, accepted: 3, acknowledged: changes.map((op) => op.id) })
    })
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)
    try {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(PwaUpgradeGate, null, createElement("p", null, "Online app is ready"))
        )
      )
      await vi.waitFor(() =>
        expect(container.textContent).toContain("Sending 3 changes saved by the previous version…")
      )
      expect(container.textContent).not.toContain("Online app is ready")
      release()
      await vi.waitFor(() => expect(container.querySelector("button")?.textContent).toBe("Retry"))
      expect(await legacyFiles(name)).not.toBeNull()
      container.querySelector("button")?.click()
      await vi.waitFor(() => expect(container.textContent).toBe("Online app is ready"))
      expect(submitted).toHaveLength(2)
      expect(submitted[0]).toEqual(submitted[1])
      expect(await legacyFiles(name)).toBeNull()
    } finally {
      release()
      root.unmount()
      container.remove()
    }
  })
})
