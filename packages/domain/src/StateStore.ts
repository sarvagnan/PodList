import { Effect } from "effect"
import { SqlClient } from "effect/sql"
import type { Change } from "./Operation.ts"
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
type DecodeRows = (rows: Sql.StoredStateRows) => Effect.Effect<State.State>
const decodeRowsSync: DecodeRows = (rows) => Effect.sync(() => Sql.rowsToState(rows))

export const load = (defaults: PlaybackSettings, decodeRows = decodeRowsSync) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const setting = yield* sql<Rows["setting"][number]>`SELECT key, value FROM setting`
    if (!setting.some((s) => s.key === "activePlaylistId")) return State.initial(defaults)
    return yield* decodeRows({
      setting,
      playlist: yield* sql<Rows["playlist"][number]>`SELECT id, ordinal, doc FROM playlist`,
      view: yield* sql<Rows["view"][number]>`SELECT id, ordinal, doc FROM view`,
      episode_state: yield* sql<Rows["episode_state"][number]>`
        SELECT episode_id, played_at, played_source, starred FROM episode_state`,
      download_rule: yield* sql<Rows["download_rule"][number]>`
        SELECT subscription_id, device_id, mode, keep_at_most, since FROM download_rule`
    })
  })

/** Like `load`, but writes the initial State first when nothing is stored yet. */
export const ensure = (defaults: PlaybackSettings, decodeRows = decodeRowsSync) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const stored = yield* sql<{
      key: string
    }>`SELECT key FROM setting WHERE key = 'activePlaylistId'`
    if (stored.length > 0) return yield* load(defaults, decodeRows)
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

/** Query dependencies of the rows changed by an optimistic write or sync. */
export interface QueryChanges {
  readonly played: boolean
  readonly episodeFacts: boolean
  readonly entries: boolean
  readonly progress: boolean
}

function* rowBatches<A>(rows: ReadonlyArray<A>): Generator<readonly [A, ...A[]]> {
  for (let offset = 0; offset < rows.length; offset += 128) {
    const [first, ...rest] = rows.slice(offset, offset + 128)
    if (first !== undefined) yield [first, ...rest]
  }
}

/** Writes the changed documents and index rows. A known operation list narrows episode
 * facts to just the affected IDs. Snapshots and Rewind can affect any Episode. */
export const saveChanges = (
  before: State.State,
  after: State.State,
  changes?: ReadonlyArray<Change>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const upsert = (table: keyof Rows, rows: ReadonlyArray<Record<string, unknown>>) =>
      Effect.gen(function* () {
        for (const batch of rowBatches(rows)) {
          yield* sql`INSERT OR REPLACE INTO ${sql(table)} ${sql.insert(batch)}`
        }
      })

    let entries = false
    let progress = false
    if (before.playlists !== after.playlists) {
      const old = new Map(before.playlists.map((p, index) => [p.id, { p, index }]))
      const playlists: Rows["playlist"][number][] = []
      const indexRows: Rows["entry_index"][number][] = []
      for (const [ordinal, p] of after.playlists.entries()) {
        const prior = old.get(p.id)
        old.delete(p.id)
        if (p === prior?.p && ordinal === prior.index) continue
        playlists.push(Sql.playlistRow(p, ordinal))
        const previous = prior?.p.entries ?? []
        if (p.entries === previous) continue
        // Unchanged slots do not enter the map. A position tick usually changes one.
        const shifted = new Map(
          previous.flatMap((e, i) => (e === p.entries[i] ? [] : [[e.episodeId, { e, i }]]))
        )
        for (const [i, e] of p.entries.entries()) {
          if (e === previous[i]) continue
          const from = shifted.get(e.episodeId)
          shifted.delete(e.episodeId)
          if (from === undefined) entries = true
          const wasInProgress = (from?.e.position ?? 0) > 0
          if (wasInProgress !== e.position > 0) progress = true
          if (from?.i !== i || from.e.position !== e.position) {
            indexRows.push(Sql.entryRow(p.id, e, i))
          }
        }
        if (shifted.size > 0) {
          entries = true
          for (const batch of rowBatches([...shifted.keys()])) {
            yield* sql`DELETE FROM entry_index WHERE playlist_id = ${p.id}
              AND episode_id IN ${sql.in(batch)}`
          }
        }
      }
      for (const [id, { p }] of old) {
        entries ||= p.entries.length > 0
        yield* sql`DELETE FROM entry_index WHERE playlist_id = ${id}`
        yield* sql`DELETE FROM playlist WHERE id = ${id}`
      }
      yield* upsert("playlist", playlists)
      yield* upsert("entry_index", indexRows)
    }

    if (before.views !== after.views) {
      const old = new Map(before.views.map((v, index) => [v.id, { v, index }]))
      const views: Rows["view"][number][] = []
      for (const [index, v] of after.views.entries()) {
        const prior = old.get(v.id)
        old.delete(v.id)
        if (prior?.v !== v || prior.index !== index) views.push(Sql.viewRow(v, index))
      }
      for (const batch of rowBatches([...old.keys()])) {
        yield* sql`DELETE FROM view WHERE id IN ${sql.in(batch)}`
      }
      yield* upsert("view", views)
    }

    let played = false
    let episodeFacts = false
    if (before.episodeStates !== after.episodeStates) {
      const ids = new Set<string>()
      if (changes === undefined || changes.some((c) => c._tag === "Rewind")) {
        for (const id of Object.keys(before.episodeStates)) ids.add(id)
        for (const id of Object.keys(after.episodeStates)) ids.add(id)
      } else {
        for (const c of changes) {
          if (c._tag === "SetStar" || c._tag === "MarkPlayed" || c._tag === "MarkUnplayed")
            ids.add(c.episodeId)
        }
      }
      const rows: Rows["episode_state"][number][] = []
      const removed: string[] = []
      for (const id of ids) {
        const old = before.episodeStates[id]
        const next = after.episodeStates[id]
        if (old === next) continue
        played ||= (old?.played != null) !== (next?.played != null)
        episodeFacts ||= (old?.starred === true) !== (next?.starred === true)
        if (next) rows.push(Sql.episodeStateRow(next))
        else removed.push(id)
      }
      for (const batch of rowBatches(removed)) {
        yield* sql`DELETE FROM episode_state WHERE episode_id IN ${sql.in(batch)}`
      }
      yield* upsert("episode_state", rows)
    }

    if (before.downloadRules !== after.downloadRules) {
      const old = new Map(
        before.downloadRules.map((r) => [keys.download_rule(Sql.downloadRuleRow(r)), r])
      )
      const rows: Rows["download_rule"][number][] = []
      for (const rule of after.downloadRules) {
        const row = Sql.downloadRuleRow(rule)
        const key = keys.download_rule(row)
        if (old.get(key) !== rule) rows.push(row)
        old.delete(key)
      }
      for (const rule of old.values()) {
        yield* sql`DELETE FROM download_rule WHERE subscription_id = ${rule.subscriptionId}
          AND device_id = ${rule.deviceId}`
      }
      yield* upsert("download_rule", rows)
    }

    for (const key of Sql.settingKeys) {
      if (before[key] === after[key]) continue
      const row = Sql.settingRow(after, key)
      if (row === undefined) yield* sql`DELETE FROM setting WHERE key = ${key}`
      else yield* sql`INSERT OR REPLACE INTO setting ${sql.insert(row)}`
    }

    return {
      played,
      episodeFacts: played || episodeFacts,
      entries,
      progress
    } satisfies QueryChanges
  })
