import { PodListApi, Reads } from "@podlist/api"
import { Device, Operation, type PlaybackSettings, State, Units } from "@podlist/domain"
import { Effect, Layer, Queue, Schema, Semaphore, SubscriptionRef } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { HttpApiClient } from "effect/http-api"
import * as Reactivity from "effect/reactivity/Reactivity"
import { toPlayerChapter } from "../lib/chapters.ts"
import { Offline, Transport } from "../sync/Transport.ts"
import { BrowserDevice } from "./BrowserDevice.ts"
import { catalogueKey, DataLayer, type DataStatus } from "./DataLayer.ts"
import { LiveConnection } from "./LiveConnection.ts"
import { PagedRead } from "./PagedRead.ts"

export const serverDataLayer = (options: {
  readonly defaults: PlaybackSettings.PlaybackSettings
  readonly deviceName: string
  readonly origin: string
}) =>
  Layer.effect(
    DataLayer,
    Effect.gen(function* () {
      const transport = yield* Transport
      const reactivity = yield* Reactivity.Reactivity
      const client = yield* HttpApiClient.make(PodListApi, {
        transformClient: HttpClient.mapRequest(HttpClientRequest.prependUrl(options.origin))
      })
      const profile = yield* Effect.acquireRelease(
        Effect.promise(() => BrowserDevice.open()),
        (profile) => Effect.sync(() => profile.close())
      )
      const identity = yield* Effect.promise(() => profile.allocate(false))
      let confirmed = State.initial(options.defaults)
      let cursor = 0
      let libraryCursor = 0
      let reset = false
      let refresh = true
      let registered = false
      let knownOffline = !navigator.onLine
      type Pending = {
        readonly id: string
        readonly recordedAt: number
        readonly change: Operation.Change
        operation?: Operation.Operation
      }
      let pending: Array<Pending> = []
      const state = yield* SubscriptionRef.make(confirmed)
      const status = yield* SubscriptionRef.make<DataStatus>({
        pending: 0,
        lastSyncedAt: null,
        error: null,
        ready: false,
        writable: !knownOffline
      })
      const triggers = yield* Queue.sliding<void>(1)
      const lock = yield* Semaphore.make(1)
      const edits = yield* Semaphore.make(1)
      const updateState = () =>
        SubscriptionRef.set(
          state,
          pending.reduce(
            (current, edit) =>
              State.apply(current, edit.change, { at: Units.EpochMillis.make(edit.recordedAt) }),
            confirmed
          )
        )
      const failure = (error: unknown) => {
        knownOffline = true
        return SubscriptionRef.update(status, (s) => ({
          ...s,
          error: error instanceof Error ? error.message : String(error),
          writable: false
        }))
      }
      const sync = Effect.gen(function* () {
        if (!registered) {
          yield* transport.registerDevice(
            Schema.decodeUnknownSync(Device.Device)({
              id: identity.id,
              name: options.deviceName,
              kind: "web",
              registeredAt: identity.registeredAt
            })
          )
          registered = true
        }
        const sent = [...pending]
        for (const edit of sent) {
          if (edit.operation) continue
          const allocation = yield* Effect.tryPromise({
            try: () => profile.allocate(true),
            catch: (e) => new Offline(String(e))
          })
          edit.operation = Schema.decodeUnknownSync(Operation.Operation)({
            id: edit.id,
            deviceId: identity.id,
            sequence: allocation.nextSequence,
            recordedAt: edit.recordedAt,
            change: Schema.encodeSync(Operation.Change)(edit.change)
          })
        }
        const pushed = sent.length
          ? yield* transport.push(sent.map((edit) => edit.operation as Operation.Operation))
          : null
        const full = reset
        reset = false
        const pulled = yield* transport.pull(full ? 0 : cursor).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              reset ||= full
            })
          )
        )
        yield* Effect.gen(function* () {
          confirmed = pulled.snapshot ?? State.applyOperations(confirmed, pulled.operations).state
          cursor = pulled.cursor
          const acknowledged = new Set(pushed?.acknowledged ?? sent.map((edit) => edit.id))
          pending = pending.filter(
            (edit) => !acknowledged.has(edit.id as Operation.Operation["id"])
          )
          yield* updateState()
          knownOffline = !navigator.onLine
          yield* SubscriptionRef.update(status, (s) => ({
            ...s,
            ready: true,
            pending: pending.length,
            lastSyncedAt: Date.now(),
            error: null,
            writable: !knownOffline
          }))
        }).pipe(edits.withPermits(1))
        if (refresh) {
          refresh = false
          yield* reactivity.invalidate([catalogueKey])
        }
      }).pipe(lock.withPermits(1), Effect.tapError(failure))

      const record = (change: Operation.Change) =>
        Effect.gen(function* () {
          // Playback reports keep the measured tail in tab memory while disconnected.
          // User edits are blocked in both the UI and this boundary.
          const report =
            change._tag === "ReportPosition" ||
            change._tag === "RecordListening" ||
            (change._tag === "MarkPlayed" && change.source._tag === "Playback")
          if ((knownOffline || !navigator.onLine) && !report)
            return yield* Effect.die(new Error("New edits need a connection to your server."))
          pending.push({ id: crypto.randomUUID(), recordedAt: Date.now(), change })
          yield* updateState()
          yield* SubscriptionRef.update(status, (s) => ({ ...s, pending: pending.length }))
          yield* Queue.offer(triggers, undefined)
        }).pipe(edits.withPermits(1))
      const runInBackground = Effect.gen(function* () {
        const run = Effect.runFork
        const notify = (
          next: { state: number; library: number },
          restart: boolean,
          connected: boolean
        ) => {
          reset ||= restart || next.state < cursor
          const libraryChanged = next.library !== libraryCursor
          if (libraryChanged || connected) refresh = true
          libraryCursor = next.library
          if (next.state !== cursor || libraryChanged || connected || reset)
            Queue.offerUnsafe(triggers, undefined)
        }
        const live = new LiveConnection(
          options.origin,
          () => ({ state: cursor, library: libraryCursor }),
          notify,
          () => Effect.runPromise(client.reads.cursors()),
          (error) => {
            run(failure(error))
          }
        )
        const online = () => {
          refresh = true
          Queue.offerUnsafe(triggers, undefined)
        }
        const offline = () => {
          run(failure(new Offline("Offline")))
        }
        const visible = () => {
          if (document.visibilityState === "visible") online()
        }
        const beforeUnload = (event: BeforeUnloadEvent) => {
          if (!pending.length) return
          event.preventDefault()
          event.returnValue = ""
        }
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            window.addEventListener("online", online)
            window.addEventListener("offline", offline)
            window.addEventListener("beforeunload", beforeUnload)
            document.addEventListener("visibilitychange", visible)
            live.start()
          }),
          () =>
            Effect.sync(() => {
              live.stop()
              window.removeEventListener("online", online)
              window.removeEventListener("offline", offline)
              window.removeEventListener("beforeunload", beforeUnload)
              document.removeEventListener("visibilitychange", visible)
            })
        )
        yield* Effect.ignore(sync)
        for (;;) {
          yield* Queue.take(triggers)
          yield* Effect.ignore(sync)
        }
      }).pipe(Effect.scoped) as Effect.Effect<never>
      const reads = new Map<string, PagedRead<Reads.ViewEpisode>>()
      const paged = (
        key: string,
        fetchPage: (continuation?: string) => Effect.Effect<Reads.EpisodePage, unknown>
      ) => {
        let read = reads.get(key)
        if (!read) {
          read = new PagedRead((continuation) => Effect.runPromise(fetchPage(continuation)))
          reads.set(key, read)
        }
        return Effect.tryPromise(() => read.read())
      }
      const subscriptions = new PagedRead((continuation) =>
        Effect.runPromise(
          client.reads.subscriptions({
            query: { pageSize: 100, ...(continuation ? { continuation } : {}) }
          })
        )
      )
      const stats = (kind: "podcasts" | "episodes") =>
        Effect.tryPromise(async () => {
          const read = new PagedRead((continuation) =>
            Effect.runPromise(
              client.reads.stats({
                params: { kind },
                query: { pageSize: 200, ...(continuation ? { continuation } : {}) }
              })
            )
          )
          let items = await read.read()
          const { pageControls } = await import("./PagedRead.ts")
          for (;;) {
            const more = pageControls(items)?.more
            if (!more) return items
            items = await more()
          }
        })
      const episode = (id: string) => client.reads.episode({ params: { id } })
      return DataLayer.of({
        state,
        status,
        deviceId: identity.id,
        record,
        sync,
        runInBackground,
        entryEpisodes: (ids) =>
          Effect.gen(function* () {
            const rows: Array<Reads.EpisodeSummary> = []
            for (let i = 0; i < ids.length; i += 200)
              rows.push(
                ...(yield* client.reads.summaries({
                  payload: new Reads.SummaryRequest({ ids: ids.slice(i, i + 200) })
                }))
              )
            return new Map(rows.map((row) => [row.id, row]))
          }),
        subscriptions: Effect.tryPromise(() => subscriptions.read()),
        subscription: (id) =>
          client.reads
            .subscription({ params: { id } })
            .pipe(Effect.catchTag("ReadNotFound", () => Effect.succeed(null))),
        viewEpisodes: (id) =>
          paged(`view:${id}`, (continuation) =>
            client.reads.view({
              params: { id },
              query: { pageSize: 100, ...(continuation ? { continuation } : {}) }
            })
          ),
        filterEpisodes: (input) =>
          paged(`filter:${JSON.stringify(input)}`, (continuation) =>
            client.reads.filter({
              payload: new Reads.FilterRequest({
                ...input,
                pageSize: 100,
                ...(continuation ? { continuation } : {})
              })
            })
          ),
        viewCounts: client.reads
          .counts()
          .pipe(Effect.map((result) => new Map(result.counts.map((row) => [row.id, row.count])))),
        episodeDetail: (id) =>
          Effect.gen(function* () {
            const detail = yield* episode(id).pipe(
              Effect.catchTag("ReadNotFound", () => Effect.succeed(null))
            )
            if (!detail) return null
            const chapters = yield* transport
              .chapters(id)
              .pipe(Effect.orElseSucceed(() => detail.chapters))
            return {
              ...detail,
              chapters: (chapters.length ? chapters : detail.chapters).map(toPlayerChapter)
            }
          }),
        statsCatalogue: Effect.gen(function* () {
          const podcasts = yield* stats("podcasts")
          const episodes = yield* stats("episodes")
          return {
            podcasts: new Map(podcasts.map((p) => [p.id, p.title ?? ""])),
            episodes: new Set(episodes.map((e) => e.id))
          }
        }),
        episodeTitle: (id) =>
          episode(id).pipe(
            Effect.map((e) => e.title),
            Effect.catchTag("ReadNotFound", () => Effect.succeed(undefined))
          ),
        playbackEpisode: (id) =>
          episode(id).pipe(
            Effect.map((e) => ({ ...e, chapters: e.chapters.map(toPlayerChapter) })),
            Effect.orElseSucceed(() => ({
              title: "",
              audioUrl: null,
              podcast: "",
              artworkUrl: null,
              duration: null,
              threshold: null,
              subscriptionId: null,
              override: {},
              chapters: []
            }))
          ),
        chapters: transport.chapters
      })
    })
  ).pipe(Layer.provide(FetchHttpClient.layer))
