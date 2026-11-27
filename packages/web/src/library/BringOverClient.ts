import { Subscriptions } from "@podlist/api"
import { Device, Ids, Operation, Protocol, State, Units, View } from "@podlist/domain"
import { Effect, Schema, Semaphore, SubscriptionRef } from "effect"
import { SqlClient } from "effect/sql"
import { Downloads } from "../downloads/DownloadService.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { Transport } from "../sync/Transport.ts"
import { mapBringOver, previewBringOver } from "./BringOver.ts"
import { readBringOverCatalogue, SourceSnapshot } from "./BringOverSnapshot.ts"
import { LibraryError } from "./LibraryClient.ts"

const sourceKey = "bringOverSource"
const jobKey = "bringOverJob"
const Checkpoint = Schema.Struct({
  imported: Schema.Array(Schema.String),
  subscribed: Schema.Array(Schema.String),
  copied: Schema.Array(Schema.String),
  downloads: Schema.Array(
    Schema.Struct({
      source: Ids.EpisodeId,
      target: Ids.EpisodeId,
      bytes: Schema.Int
    })
  ),
  queued: Schema.Boolean,
  complete: Schema.Boolean
})
const JobJson = Schema.fromJsonString(Checkpoint)
const SnapshotJson = Schema.fromJsonString(SourceSnapshot)
const encodeJob = Schema.encodeSync(JobJson)
type Checkpoint = typeof Checkpoint.Type

const libraryError = (cause: unknown) =>
  cause instanceof LibraryError
    ? cause
    : new LibraryError(
        cause instanceof Error ? cause.message : "Could not bring over the Library. Try again."
      )

export type BringOverPresentation =
  | { readonly kind: "unavailable" }
  | {
      readonly kind: "offer"
      readonly preview: ReturnType<typeof previewBringOver>
      readonly snapshot: SourceSnapshot
    }
  | { readonly kind: "pending"; readonly progress: BringOverProgress }
  | { readonly kind: "complete" }

export interface BringOverProgress {
  readonly feeds: number
  readonly downloads: number
}

export interface BringOverClient {
  readonly inspect: Effect.Effect<BringOverPresentation, LibraryError>
  readonly accept: (snapshot: SourceSnapshot) => Effect.Effect<void, LibraryError>
  readonly resume: (
    progress: (value: BringOverProgress) => void
  ) => Effect.Effect<void, LibraryError>
}

const counts = (job: Checkpoint): BringOverProgress => ({
  feeds: job.imported.length,
  downloads: job.copied.length
})

const uniqueName = (name: string, taken: Iterable<string>) => {
  const names = new Set(Array.from(taken, (value) => value.trim().toLowerCase()))
  let candidate = name
  for (let suffix = 2; names.has(candidate.trim().toLowerCase()); suffix++)
    candidate = `${name} ${suffix}`
  return candidate
}

/** Replay every name against the target's existing lists, without merging unrelated lists. */
const nameImported = (initial: State.State, operations: ReadonlyArray<Operation.Operation>) => {
  let state = initial
  const result: Operation.Operation[] = []
  for (const operation of operations) {
    let change = operation.change
    if (change._tag === "CreatePlaylist" || change._tag === "RenamePlaylist") {
      const { playlistId } = change
      change = {
        ...change,
        name: uniqueName(
          change.name,
          state.playlists
            .filter((playlist) => playlist.id !== playlistId)
            .map((playlist) => playlist.name)
        )
      }
    } else if (change._tag === "SaveView") {
      const { view } = change
      change = {
        ...change,
        view: new View.View({
          ...view,
          name: uniqueName(
            view.name,
            state.views.filter((other) => other.id !== view.id).map((other) => other.name)
          )
        })
      }
    }
    state = State.apply(state, change, { at: operation.recordedAt })
    result.push(new Operation.Operation({ ...operation, change }))
    if (change._tag === "RestorePlaylist") {
      const { playlistId } = change
      const restored = state.playlists.find((playlist) => playlist.id === playlistId)
      if (!restored) continue
      const name = uniqueName(
        restored.name,
        state.playlists
          .filter((playlist) => playlist.id !== playlistId)
          .map((playlist) => playlist.name)
      )
      if (name === restored.name) continue
      const renamed = new Operation.Operation({
        ...operation,
        id: Ids.OperationId.make(`${operation.id}:bring-over-name`),
        change: { _tag: "RenamePlaylist", playlistId, name }
      })
      state = State.apply(state, renamed.change, { at: renamed.recordedAt })
      result.push(renamed)
    }
  }
  return result
}

const targetIds = (snapshot: SourceSnapshot, state: State.State) => {
  const occupied = new Set(
    [...state.playlists, ...State.trashOf(state).map((item) => item.playlist)].map(
      (item) => item.id
    )
  )
  const viewIds = new Set(state.views.map((view) => view.id))
  const playlists = new Map<Ids.PlaylistId, Ids.PlaylistId>()
  const views = new Map<Ids.ViewId, Ids.ViewId>()
  for (const { change } of snapshot.operations) {
    if (change._tag === "CreatePlaylist" && occupied.has(change.playlistId))
      playlists.set(
        change.playlistId,
        Ids.PlaylistId.make(`bring-over:${snapshot.deviceId}:${change.playlistId}`)
      )
    const viewId =
      change._tag === "SaveView"
        ? change.view.id
        : change._tag === "DeleteView"
          ? change.viewId
          : undefined
    if (viewId && viewIds.has(viewId))
      views.set(viewId, Ids.ViewId.make(`bring-over:${snapshot.deviceId}:${viewId}`))
  }
  return { playlists, views }
}

export const makeBringOverClient = (
  subscribe: (feed: string) => Effect.Effect<unknown, LibraryError>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const engine = yield* SyncEngine
    const transport = yield* Transport
    const downloads = yield* Downloads
    const lock = yield* Semaphore.make(1)
    const bridge = window.podlistApp?.bringOver
    const meta = (key: string) =>
      sql<{ value: string }>`SELECT value FROM sync_meta WHERE key = ${key}`.pipe(
        Effect.map(([row]) => row?.value)
      )
    const save = (key: string, value: string) =>
      sql`INSERT OR REPLACE INTO sync_meta (key, value) VALUES (${key}, ${value})`.pipe(
        Effect.asVoid
      )
    const checkpoint = meta(jobKey).pipe(
      Effect.map((value) => (value ? Schema.decodeSync(JobJson)(value) : null))
    )
    const saveJob = (job: Checkpoint) => save(jobKey, encodeJob(job))
    const withSql = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) =>
      Effect.provideService(effect, SqlClient.SqlClient, sql)
    const closeSource = Effect.promise(
      () => bridge?.closeSource().catch(() => undefined) ?? Promise.resolve()
    )

    const inspect = Effect.gen(function* () {
      const job = yield* checkpoint
      if (job)
        return job.complete
          ? { kind: "complete" as const }
          : { kind: "pending" as const, progress: counts(job) }
      if (!bridge) return { kind: "unavailable" as const }
      const encoded = yield* Effect.tryPromise(() => bridge.snapshot()).pipe(
        Effect.ensuring(closeSource)
      )
      if (encoded === null) return { kind: "unavailable" as const }
      const snapshot = yield* Schema.decodeUnknownEffect(SourceSnapshot)(encoded)
      const destination = yield* withSql(readBringOverCatalogue)
      return { kind: "offer" as const, preview: previewBringOver(snapshot, destination), snapshot }
    }).pipe(lock.withPermits(1), Effect.mapError(libraryError))

    const accept = (snapshot: SourceSnapshot) =>
      Effect.gen(function* () {
        if (yield* checkpoint) return
        yield* save(sourceKey, Schema.encodeSync(SnapshotJson)(snapshot))
        yield* saveJob({
          imported: [],
          subscribed: [],
          copied: [],
          downloads: [],
          queued: false,
          complete: false
        })
      }).pipe(sql.withTransaction, lock.withPermits(1), Effect.mapError(libraryError))

    const resume = (progress: (value: BringOverProgress) => void) =>
      Effect.gen(function* () {
        const saved = yield* meta(sourceKey)
        let job = yield* checkpoint
        if (!saved || !job || job.complete) return
        const snapshot = Schema.decodeSync(SnapshotJson)(saved)
        const bringOverCatalogue = transport.bringOverCatalogue
        const queueBringOver = engine.queueBringOver
        const importStored = downloads.importStored
        if (!bringOverCatalogue || !queueBringOver || !importStored)
          return yield* Effect.fail(new LibraryError("Bring Over is unavailable for this Library."))

        progress(counts(job))
        if (!job.queued) {
          const serverVersion = yield* transport.serverVersion ??
            Effect.succeed(Protocol.legacyVersion)
          if (
            Protocol.requiredVersion(snapshot.operations.map(({ change }) => change._tag)) >
            serverVersion
          )
            return yield* Effect.fail(
              new LibraryError("Update the PodList server to bring over this Library.")
            )
          const bySubscription = Map.groupBy(snapshot.episodes, (episode) => episode.subscriptionId)
          for (const sub of snapshot.subscriptions) {
            if (job.imported.includes(sub.id)) continue
            const { id: _id, websiteUrl: _website, ...metadata } = sub
            const episodes = (bySubscription.get(sub.id) ?? []).map(
              ({ id: _id, subscriptionId: _sub, websiteUrl: _website, ...episode }) => ({
                ...episode,
                feedUrl: sub.feedUrl
              })
            )
            for (let start = 0; start < Math.max(episodes.length, 1); start += 100) {
              yield* bringOverCatalogue(
                new Subscriptions.BringOverRequest({
                  subscriptions: start === 0 ? [metadata] : [],
                  episodes: episodes.slice(start, start + 100)
                })
              )
            }
            job = { ...job, imported: [...job.imported, sub.id] }
            yield* saveJob(job)
            progress(counts(job))
          }
          yield* engine.sync
          const current = yield* withSql(readBringOverCatalogue)
          const byFeed = new Map(current.subscriptions.map((sub) => [sub.feedUrl, sub]))
          for (const sub of snapshot.subscriptions) {
            if (sub.unsubscribedAt !== null || job.subscribed.includes(sub.id)) continue
            if (byFeed.get(sub.feedUrl)?.unsubscribedAt !== null) yield* subscribe(sub.feedUrl)
            job = { ...job, subscribed: [...job.subscribed, sub.id] }
            yield* saveJob(job)
          }
          yield* engine.sync
          const destination = yield* withSql(readBringOverCatalogue)
          const state = yield* SubscriptionRef.get(engine.state)
          const mapped = yield* Effect.try({
            try: () =>
              mapBringOver(snapshot, destination, {
                sourceDevice: snapshot.deviceId,
                destinationDevice: Ids.DeviceId.make(engine.deviceId),
                serverVersion,
                ...targetIds(snapshot, state)
              }),
            catch: libraryError
          })
          const mappedDownloads = snapshot.downloads.map((item, index) => {
            const target = mapped.downloads[index]
            if (!target) throw new Error("A download has no Episode mapping.")
            return { source: item.episodeId, target: target.episodeId, bytes: item.bytes }
          })
          yield* transport.registerDevice(
            new Device.Device({
              id: snapshot.deviceId,
              name: "PodList Standalone",
              kind: "desktop",
              registeredAt: snapshot.operations[0]?.recordedAt ?? Units.EpochMillis.make(Date.now())
            })
          )
          job = { ...job, queued: true, downloads: mappedDownloads }
          yield* queueBringOver(nameImported(state, mapped.operations), {
            key: jobKey,
            value: encodeJob(job)
          })
        }
        yield* engine.sync
        for (const item of job.downloads) {
          if (job.copied.includes(item.source)) continue
          yield* importStored(
            item.target,
            `/bring-over/audio?id=${encodeURIComponent(item.source)}`,
            item.bytes
          )
          job = { ...job, copied: [...job.copied, item.source] }
          yield* saveJob(job)
          progress(counts(job))
        }
        yield* Effect.gen(function* () {
          if (job) yield* saveJob({ ...job, complete: true })
          yield* sql`DELETE FROM sync_meta WHERE key = ${sourceKey}`
        }).pipe(sql.withTransaction)
      }).pipe(Effect.ensuring(closeSource), lock.withPermits(1), Effect.mapError(libraryError))

    return { inspect, accept, resume } satisfies BringOverClient
  })
