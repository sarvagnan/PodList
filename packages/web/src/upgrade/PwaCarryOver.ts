import { Device, Operation } from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { Transport } from "../sync/Transport.ts"

const operationJson = Schema.fromJsonString(Operation.Operation)
const journalKey = "podlist:journal"
const completedKey = "webCarryOverDone"
const cursorKey = "webCarryOverCursor"
const batchSize = 100
const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)))
const attempt = <A>(run: () => Promise<A>) => Effect.tryPromise({ try: run, catch: asError })

// Match the header digest in pinned @effect/wa-sqlite 0.1.2 AccessHandlePoolVFS.
// Its normal startup repairs bad headers by discarding the associated file. For
// carry-over, fail BEFORE opening that VFS instead of letting it discard data.
const validPoolHeader = (header: Uint8Array) => {
  if (header.length !== 524) return false
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (const value of header.subarray(0, 516)) {
    h1 = Math.imul(h1 ^ value, 2654435761)
    h2 = Math.imul(h2 ^ value, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const view = new DataView(header.buffer, header.byteOffset)
  return view.getUint32(516, true) === h1 >>> 0 && view.getUint32(520, true) === h2 >>> 0
}

/** AccessHandlePoolVFS stores random filenames under /opfs. The first 512 bytes
 * contain the logical SQLite path, NOT SQLite data. Do not probe by opening a DB:
 * that would create an empty one and could conceal a failed detection. */
export async function legacyFiles(databaseName = "podlist.db") {
  if (!navigator.storage?.getDirectory) return null
  const root = await navigator.storage.getDirectory()
  let directory: FileSystemDirectoryHandle
  try {
    directory = await root.getDirectoryHandle("opfs")
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return null
    throw error
  }
  const path = `/${databaseName}`
  const files: Array<string> = []
  let mainFile: string | undefined
  for await (const [name, handle] of directory.entries()) {
    if (handle.kind !== "file") continue
    const file = await (handle as FileSystemFileHandle).getFile()
    const header = new Uint8Array(await file.slice(0, 524).arrayBuffer())
    const end = header.subarray(0, 512).indexOf(0)
    if (end < 0 || !validPoolHeader(header)) {
      throw new Error("Could not read the previous version's database header; local data was kept")
    }
    const logicalPath = new TextDecoder().decode(header.subarray(0, end))
    if (logicalPath === path) mainFile = name
    else if ([`${path}-journal`, `${path}-wal`, `${path}-shm`].includes(logicalPath)) {
      files.push(name)
    }
  }
  // Delete the main file last. If sidecar deletion is interrupted, its durable
  // cursor/marker remains discoverable for the next cleanup attempt.
  return mainFile ? { directory, files: [...files, mainFile] } : null
}

/** No worker/cache cleanup is allowed before carry-over succeeds. Also run this
 * for a fresh profile: a returning installation may have a worker but no DB. */
export async function retirePwa() {
  if ("serviceWorker" in navigator) {
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
      // Leave other applications hosted on this origin alone.
      if (registration.scope === new URL(import.meta.env.BASE_URL, location.origin).href) {
        await registration.unregister()
      }
    }
  }
  if ("caches" in globalThis) {
    for (const name of await caches.keys()) {
      if (name === "artwork" || name.startsWith("workbox-")) await caches.delete(name)
    }
  }
}

/** Called while holding the OLD database Web Lock. A live PWA must finish/close
 * first; stealing its lock would lose the playback tail held in its JS memory. */
export const carryOverPwa = (report: (pending: number) => void, databaseName = "podlist.db") =>
  Effect.gen(function* () {
    const found = yield* attempt(() => legacyFiles(databaseName))
    if (found) {
      const transport = yield* Transport
      // Lazy-load SQLite only for returning PWA profiles, without migrations or
      // the old app/SyncEngine. In particular, never synthesize listening from State.
      const { clientWithRetry } = yield* Effect.promise(() => import("../platform/LocalDb.ts"))
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const getMeta = (key: string) =>
          sql<{ value: string }>`SELECT value FROM sync_meta WHERE key = ${key}`.pipe(
            Effect.map((rows) => rows[0]?.value)
          )
        const setMeta = (key: string, value: string) =>
          sql`INSERT OR REPLACE INTO sync_meta (key, value) VALUES (${key}, ${value})`

        // Always inspect the outbox, even after a completion marker: if cleanup
        // failed, a still-installed old PWA could have recorded more operations.
        // The acknowledged sequence cursor skips only the already committed rows.
        const deviceId = yield* getMeta("deviceId")

        // Typed edits can survive in the old synchronous journal just before
        // SyncEngine.record commits. Stage them transactionally with stable ids
        // and the old Device's next sequence before making any network call.
        const journal = yield* Effect.try(
          () =>
            JSON.parse(localStorage.getItem(journalKey) ?? "[]") as Array<{
              id: string
              change: unknown
            }>
        )
        yield* Effect.gen(function* () {
          for (const entry of journal) {
            if ((yield* sql`SELECT 1 FROM outbox WHERE id = ${entry.id}`).length) continue
            const sequence = Number((yield* getMeta("sequence")) ?? "0")
            const operation = Schema.decodeUnknownSync(Operation.Operation)({
              id: entry.id,
              deviceId,
              sequence,
              recordedAt: Date.now(),
              change: entry.change
            })
            yield* sql`INSERT INTO outbox ${sql.insert({
              id: operation.id,
              operation: Schema.encodeSync(operationJson)(operation)
            })}`
            yield* setMeta("sequence", String(sequence + 1))
          }
        }).pipe(sql.withTransaction)

        const cursor = Number((yield* getMeta(cursorKey)) ?? "0")
        if (!Number.isSafeInteger(cursor) || cursor < 0)
          throw new Error("Invalid carry-over cursor")
        const rows = yield* sql<{ seq: number; operation: string }>`
          SELECT seq, operation FROM outbox WHERE seq > ${cursor} ORDER BY seq`
        // Decode the entire snapshot first: a malformed row must block cleanup.
        const pending = rows.map((row) => ({
          seq: row.seq,
          operation: Schema.decodeSync(operationJson)(row.operation)
        }))
        report(pending.length)
        if (pending.length && !deviceId) throw new Error("Previous Device identity is missing")
        if (pending.some((row) => row.operation.deviceId !== deviceId)) {
          throw new Error("Previous outbox contains an unexpected Device")
        }
        if (pending.length && (yield* getMeta("registered")) === undefined) {
          yield* transport.registerDevice(
            Schema.decodeUnknownSync(Device.Device)({
              id: deviceId,
              name: "Previous browser installation",
              kind: "pwa",
              registeredAt: Date.now()
            })
          )
          yield* setMeta("registered", "1")
        }
        for (let offset = 0; offset < pending.length; offset += batchSize) {
          const batch = pending.slice(offset, offset + batchSize)
          const operations = batch.map((row) => row.operation)
          const response = yield* transport.push(operations)
          // accepted=0 can mean a lost response was retried. Only explicit
          // committed-id acknowledgements permit destructive retirement.
          const acknowledged = new Set(response.acknowledged)
          if (operations.some((operation) => !acknowledged.has(operation.id))) {
            throw new Error("Server did not acknowledge all changes; update the server and retry")
          }
          yield* setMeta(cursorKey, String(batch.at(-1)?.seq))
          report(pending.length - offset - batch.length)
        }
        // Keep the outbox itself intact. A crash after the last ack but before
        // cleanup resumes here, without sending again. Every failure keeps the DB.
        yield* setMeta(completedKey, "1")
      }).pipe(Effect.provide(clientWithRetry(databaseName).pipe(Layer.provide(Reactivity.layer))))
      // Remove the journal after the durable completion marker but before file
      // deletion, so an interrupted deletion cannot leave an orphaned journal.
      yield* Effect.try(() => localStorage.removeItem(journalKey))
      // The worker's scope has closed before removing its files. Re-enumerate to
      // include any journal made during SQLite recovery/checkpointing.
      const remaining = yield* attempt(() => legacyFiles(databaseName))
      if (remaining) {
        yield* attempt(async () => {
          for (const name of remaining.files) await remaining.directory.removeEntry(name)
        })
      }
    } else if (localStorage.getItem(journalKey)) {
      // A missing DB plus a surviving typed-edit journal needs recovery, not
      // silent deletion. Never let the new app discard it.
      throw new Error("Saved edits remain but the previous database could not be found")
    }
    yield* attempt(retirePwa)
  })

/** Serialize new tabs with each other AND with any still-running old PWA. */
export async function runPwaCarryOver(report: (pending: number) => void) {
  if (!navigator.locks) throw new Error("This browser cannot safely open the previous database")
  // Queue new tabs behind one another so simultaneous fresh loads do not show a
  // false "old tab open" failure. Only an actual old PWA uses the inner lock.
  await navigator.locks.request("podlist-pwa-carry-over", () =>
    navigator.locks.request("podlist-local-database", { ifAvailable: true }, async (lock) => {
      if (!lock) throw new Error("Close PodList in the previous version's other tabs, then retry")
      await Effect.runPromise(
        carryOverPwa(report).pipe(Effect.provide(Transport.layerHttp(location.origin)))
      )
    })
  )
}
