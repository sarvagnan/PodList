import { Duration, Effect, Layer, Stream, SubscriptionRef } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { catalogueKey, SyncEngine } from "../sync/SyncEngine.ts"
import { Downloads } from "./Downloads.ts"
import { type EpisodeFacts, planDownloads, type RuleFacts } from "./plan.ts"

// Carries out this Device's Download Rules (downloads/plan.ts) in the background: after
// each change to the State, the catalogue or the downloads, it works out what the rules
// want and fetches (two at a time) or lets go. Manual Downloads are never touched.

const atOnce = 2

export const DownloadRulesLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const engine = yield* SyncEngine
    const downloads = yield* Downloads
    const sql = yield* SqlClient.SqlClient
    const reactivity = yield* Reactivity.Reactivity

    /** Compatibility for legacy All New rules without a synced activation time. */
    const sinceFor = (subscriptionId: string) =>
      Effect.gen(function* () {
        const key = `ruleSince:${subscriptionId}`
        const [row] = yield* sql<{ value: string }>`SELECT value FROM sync_meta WHERE key = ${key}`
        if (row !== undefined) return Number(row.value)
        const now = Date.now()
        yield* sql`INSERT OR REPLACE INTO sync_meta (key, value) VALUES (${key}, ${String(now)})`
        return now
      })

    const apply = Effect.gen(function* () {
      const state = yield* SubscriptionRef.get(engine.state)
      const mine = state.downloadRules.filter((r) => r.deviceId === engine.deviceId)
      // Retire legacy local dates when the corresponding rule leaves All New.
      const legacy = yield* sql<{
        key: string
      }>`SELECT key FROM sync_meta WHERE key LIKE 'ruleSince:%'`
      const active = new Set(
        mine.filter((r) => r.mode === "allNew").map((r) => `ruleSince:${r.subscriptionId}`)
      )
      for (const row of legacy)
        if (!active.has(row.key)) yield* sql`DELETE FROM sync_meta WHERE key = ${row.key}`
      const rules: Array<RuleFacts> = []
      for (const r of mine) {
        rules.push({
          subscriptionId: r.subscriptionId,
          mode: r.mode,
          keepAtMost: r.keepAtMost,
          since: r.mode === "allNew" ? (r.since ?? (yield* sinceFor(r.subscriptionId))) : 0
        })
      }
      const status = yield* SubscriptionRef.get(downloads.status)
      const stored = [...status].flatMap(([episodeId, s]) =>
        s._tag === "Stored" ? [{ episodeId, manual: s.manual }] : []
      )
      const entries = new Set<string>(
        state.playlists.flatMap((p) => p.entries.map((e) => e.episodeId))
      )
      const subscriptions = rules.filter((r) => r.mode !== "never").map((r) => r.subscriptionId)
      const rows =
        subscriptions.length === 0
          ? []
          : yield* sql<{ id: string; subscription_id: string; published: number }>`
              SELECT id, subscription_id, published FROM episode
              WHERE ${sql.in("subscription_id", subscriptions)}`
      const episodes: Array<EpisodeFacts> = rows.map((r) => ({
        id: r.id,
        subscriptionId: r.subscription_id,
        published: r.published,
        played: state.episodeStates[r.id]?.played != null,
        starred: state.episodeStates[r.id]?.starred === true,
        entry: entries.has(r.id)
      }))
      // Stored downloads of podcasts without a rule still count, so a rule's leftovers go.
      for (const s of stored) {
        if (!episodes.some((e) => e.id === s.episodeId)) {
          episodes.push({
            id: s.episodeId,
            subscriptionId: "",
            published: 0,
            played: state.episodeStates[s.episodeId]?.played != null,
            starred: state.episodeStates[s.episodeId]?.starred === true,
            entry: entries.has(s.episodeId)
          })
        }
      }
      const plan = planDownloads(rules, episodes, stored)
      for (const id of plan.discard) yield* downloads.remove(id)
      const busy = [...status.values()].filter((s) => s._tag === "Downloading").length
      for (const id of plan.fetch.filter((id) => !status.has(id)).slice(0, atOnce - busy)) {
        yield* downloads.download(id, { rule: true })
      }
    }).pipe(
      Effect.orDie,
      Effect.catchCause(() => Effect.void)
    )

    const changes = Stream.mergeAll(
      [
        SubscriptionRef.changes(engine.state).pipe(Stream.map(() => undefined)),
        SubscriptionRef.changes(downloads.status).pipe(Stream.map(() => undefined)),
        reactivity.stream([catalogueKey], Effect.void)
      ],
      { concurrency: "unbounded" }
    )
    yield* changes.pipe(
      Stream.debounce(Duration.seconds(1)),
      Stream.runForEach(() => apply),
      Effect.forkScoped
    )
  })
)
