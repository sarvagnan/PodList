import { Effect } from "effect"
import { SqlClient } from "effect/sql"
import type { PlaybackSettings } from "./PlaybackSettings.ts"
import * as Sql from "./Sql.ts"
import * as State from "./State.ts"

// Reading and writing user State through any `effect/sql` SQLite client, so the server
// and every client persist it identically (ADR 0008). Platform-free: no driver here.

type Rows = Sql.StateRows

const keys: { readonly [K in keyof Rows]: (row: Rows[K][number]) => string } = {
  playlist: (r) => r.id,
  view: (r) => r.id,
  episode_state: (r) => r.episode_id,
  entry_index: (r) => `${r.playlist_id}\u0000${r.episode_id}`,
  download_rule: (r) => `${r.subscription_id}\u0000${r.device_id}`,
  setting: (r) => r.key
}
const keyColumns: { readonly [K in keyof Rows]: ReadonlyArray<string> } = {
  playlist: ["id"],
  view: ["id"],
  episode_state: ["episode_id"],
  entry_index: ["playlist_id", "episode_id"],
  download_rule: ["subscription_id", "device_id"],
  setting: ["key"]
}

/** The stored State, or the initial State when nothing has been stored yet. */
export const load = (defaults: PlaybackSettings) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const setting = yield* sql<Rows["setting"][number]>`SELECT key, value FROM setting`
    if (!setting.some((s) => s.key === "activePlaylistId")) return State.initial(defaults)
    return Sql.rowsToState({
      setting,
      playlist: yield* sql<Rows["playlist"][number]>`SELECT id, doc FROM playlist`,
      view: yield* sql<Rows["view"][number]>`SELECT id, doc FROM view`,
      episode_state: yield* sql<Rows["episode_state"][number]>`
        SELECT episode_id, played_at, played_source, starred FROM episode_state`,
      download_rule: yield* sql<Rows["download_rule"][number]>`
        SELECT subscription_id, device_id, mode, keep_at_most FROM download_rule`
    })
  })

/** Like `load`, but writes the initial State first when nothing is stored yet. */
export const ensure = (defaults: PlaybackSettings) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const stored = yield* sql<{
      key: string
    }>`SELECT key FROM setting WHERE key = 'activePlaylistId'`
    if (stored.length > 0) return yield* load(defaults)
    const initial = State.initial(defaults)
    yield* save(null, initial)
    return initial
  })

/**
 * Writes `after`, touching only rows that differ from `before`. Pass `before: null`
 * when nothing is stored yet, or to rewrite every table from scratch.
 */
export const save = (before: State.State | null, after: State.State) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const old = before === null ? null : Sql.stateToRows(before)
    const next = Sql.stateToRows(after)
    for (const table of Object.keys(keys) as Array<keyof Rows>) {
      const keyOf = keys[table] as (row: object) => string
      if (old === null) yield* sql`DELETE FROM ${sql(table)}`
      const oldRows = new Map((old?.[table] ?? []).map((r) => [keyOf(r), r]))
      const newRows = new Map(next[table].map((r) => [keyOf(r), r]))
      for (const [key, row] of oldRows) {
        if (newRows.has(key)) continue
        const where = keyColumns[table]
          .map((c) => sql`${sql(c)} = ${(row as Record<string, string>)[c] ?? null}`)
          .reduce((a, b) => sql`${a} AND ${b}`)
        yield* sql`DELETE FROM ${sql(table)} WHERE ${where}`
      }
      for (const [key, row] of newRows) {
        const prior = oldRows.get(key)
        if (prior !== undefined && JSON.stringify(prior) === JSON.stringify(row)) continue
        yield* sql`INSERT OR REPLACE INTO ${sql(table)} ${sql.insert(row as Record<string, unknown>)}`
      }
    }
  })
