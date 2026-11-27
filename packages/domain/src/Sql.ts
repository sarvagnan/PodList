import { Effect, Schema } from "effect"
import { Migrator, SqlClient } from "effect/sql"
import { DownloadRule } from "./Device.ts"
import { EpisodeState } from "./Library.ts"
import * as Listening from "./Listening.ts"
import * as Mentions from "./Mentions.ts"
import { PlaybackSettings } from "./PlaybackSettings.ts"
import { Playlist } from "./Playlist.ts"
import { State, TrashedPlaylist } from "./State.ts"
import { View } from "./View.ts"

// The SQLite schema shared by the server and every client (ADR 0005, ADR 0008).
// The Library catalogue is relational so Views can query it; each Playlist and View
// is stored whole as JSON, and small index tables mirror what Views filter on.

export interface Migration {
  readonly id: number
  readonly name: string
  /** One SQL statement per item, run in order inside a transaction. */
  readonly statements: ReadonlyArray<string>
}

export const migrations: ReadonlyArray<Migration> = [
  {
    id: 1,
    name: "library_and_state",
    statements: [
      `CREATE TABLE subscription (
        id TEXT PRIMARY KEY,
        feed_url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        author TEXT,
        description TEXT,
        artwork_url TEXT,
        subscribed_at INTEGER NOT NULL,
        unsubscribed_at INTEGER,
        played_threshold REAL,
        playback_settings TEXT NOT NULL DEFAULT '{}'
      )`,
      `CREATE TABLE episode (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL REFERENCES subscription (id),
        guid TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        published INTEGER NOT NULL,
        duration REAL,
        audio_url TEXT NOT NULL,
        artwork_url TEXT,
        chapters TEXT NOT NULL DEFAULT '[]',
        audio_updated_at INTEGER,
        UNIQUE (subscription_id, guid)
      )`,
      "CREATE INDEX episode_published ON episode (published DESC)",
      "CREATE INDEX episode_subscription_published ON episode (subscription_id, published DESC)",
      // Index tables mirrored from State after every applied operation.
      `CREATE TABLE episode_state (
        episode_id TEXT PRIMARY KEY,
        played_at INTEGER,
        played_source TEXT,
        starred INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE entry_index (
        playlist_id TEXT NOT NULL,
        episode_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        position REAL NOT NULL,
        PRIMARY KEY (playlist_id, episode_id)
      )`,
      "CREATE INDEX entry_index_episode ON entry_index (episode_id)",
      // Whole documents.
      "CREATE TABLE playlist (id TEXT PRIMARY KEY, doc TEXT NOT NULL)",
      "CREATE TABLE view (id TEXT PRIMARY KEY, doc TEXT NOT NULL)",
      `CREATE TABLE download_rule (
        subscription_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        keep_at_most INTEGER,
        PRIMARY KEY (subscription_id, device_id)
      )`,
      "CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
    ]
  },
  {
    id: 2,
    name: "episode_chapters_source",
    statements: [
      // Where the feed says Chapters live, and when they were resolved (pod-rxi.4).
      "ALTER TABLE episode ADD COLUMN chapters_url TEXT",
      "ALTER TABLE episode ADD COLUMN chapters_fetched_at INTEGER"
    ]
  },
  {
    id: 3,
    name: "list_order",
    statements: [
      // Playlists and Views keep the order the user sees, on every Device. Existing rows
      // take their current order, with the Default Playlist first.
      "ALTER TABLE playlist ADD COLUMN ordinal INTEGER NOT NULL DEFAULT 0",
      "ALTER TABLE view ADD COLUMN ordinal INTEGER NOT NULL DEFAULT 0",
      `UPDATE playlist SET ordinal = CASE WHEN id = 'default' THEN 0
         ELSE 1 + (SELECT count(*) FROM playlist p WHERE p.id <> 'default' AND p.rowid < playlist.rowid) END`,
      "UPDATE view SET ordinal = (SELECT count(*) FROM view v WHERE v.rowid < view.rowid)"
    ]
  },
  {
    id: 4,
    name: "mentions_and_rule_since",
    statements: [
      "ALTER TABLE subscription ADD COLUMN title_folded TEXT NOT NULL DEFAULT ''",
      "ALTER TABLE episode ADD COLUMN title_folded TEXT NOT NULL DEFAULT ''",
      "ALTER TABLE episode ADD COLUMN description_folded TEXT NOT NULL DEFAULT ''",
      "ALTER TABLE download_rule ADD COLUMN since INTEGER"
    ]
  }
]

/** Runs the shared migrations with any `effect/sql` SQLite driver (server or browser). */
export const makeMigrationLoader = (
  fold?: (text: ReadonlyArray<string>) => Effect.Effect<ReadonlyArray<string>>
) =>
  Migrator.fromRecord(
    Object.fromEntries(
      migrations.map((m) => [
        `${String(m.id).padStart(4, "0")}_${m.name}`,
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient
          for (const statement of m.statements) yield* sql.unsafe(statement)
          if (m.id === 4) yield* backfillMentionsWith(fold)
        })
      ])
    )
  )

// Runs inside migration 4's transaction, before its journal entry is committed.
// Bounded batches avoid loading a large Library's show notes into memory at once.
const backfillMentionsWith = (
  fold: (text: ReadonlyArray<string>) => Effect.Effect<ReadonlyArray<string>> = (text) =>
    Effect.sync(() => text.map(Mentions.fold))
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    for (const table of ["subscription", "episode"] as const) {
      let after: string | null = null
      for (;;) {
        const rows: ReadonlyArray<{ id: string; title: string; description?: string }> =
          yield* sql.unsafe<{ id: string; title: string; description?: string }>(
            `SELECT id, title${table === "episode" ? ", description" : ""} FROM ${table} ${after === null ? "" : "WHERE id > ?"} ORDER BY id LIMIT 128`,
            after === null ? [] : [after]
          )
        if (rows.length === 0) break
        const isEpisode = table === "episode"
        const folded = yield* fold(
          rows.flatMap((row) => (isEpisode ? [row.title, row.description ?? ""] : [row.title]))
        )
        const columns = isEpisode ? "id, title_folded, description_folded" : "id, title_folded"
        const values = rows.map(() => (isEpisode ? "(?, ?, ?)" : "(?, ?)")).join(", ")
        const params = rows.flatMap((row, i) =>
          isEpisode ? [row.id, folded[i * 2], folded[i * 2 + 1]] : [row.id, folded[i]]
        )
        yield* sql.unsafe(
          `WITH folded(${columns}) AS (VALUES ${values})
         UPDATE ${table} SET title_folded = folded.title_folded
         ${isEpisode ? ", description_folded = folded.description_folded" : ""}
         FROM folded WHERE ${table}.id = folded.id`,
          params
        )
        after = rows.at(-1)?.id ?? after
      }
    }
  })

export const migrationLoader = makeMigrationLoader()
export const backfillMentions = backfillMentionsWith()

// ---------- State <-> rows ----------

export interface StateRows {
  readonly playlist: ReadonlyArray<{
    readonly id: string
    readonly ordinal: number
    readonly doc: string
  }>
  readonly view: ReadonlyArray<{
    readonly id: string
    readonly ordinal: number
    readonly doc: string
  }>
  readonly episode_state: ReadonlyArray<{
    readonly episode_id: string
    readonly played_at: number | null
    readonly played_source: string | null
    readonly starred: number
  }>
  readonly entry_index: ReadonlyArray<{
    readonly playlist_id: string
    readonly episode_id: string
    readonly ordinal: number
    readonly position: number
  }>
  readonly download_rule: ReadonlyArray<{
    readonly subscription_id: string
    readonly device_id: string
    readonly mode: string
    readonly keep_at_most: number | null
    readonly since: number | null
  }>
  readonly setting: ReadonlyArray<{ readonly key: string; readonly value: string }>
}

const PlaylistJson = Schema.fromJsonString(Playlist)
const ViewJson = Schema.fromJsonString(View)
const SettingsJson = Schema.fromJsonString(PlaybackSettings)
const ListeningJson = Schema.fromJsonString(Listening.Log)
const TrashJson = Schema.fromJsonString(Schema.Array(TrashedPlaylist))
const PlayedJson = Schema.fromJsonString(EpisodeState.fields.played)

export const playlistRow = (p: Playlist, ordinal: number): StateRows["playlist"][number] => ({
  id: p.id,
  ordinal,
  doc: Schema.encodeSync(PlaylistJson)(p)
})

export const viewRow = (v: View, ordinal: number): StateRows["view"][number] => ({
  id: v.id,
  ordinal,
  doc: Schema.encodeSync(ViewJson)(v)
})

export const episodeStateRow = (s: EpisodeState): StateRows["episode_state"][number] => ({
  episode_id: s.episodeId,
  played_at: s.played?.at ?? null,
  played_source: s.played === null ? null : Schema.encodeSync(PlayedJson)(s.played),
  starred: s.starred ? 1 : 0
})

export const entryRow = (
  playlistId: string,
  entry: Playlist["entries"][number],
  ordinal: number
): StateRows["entry_index"][number] => ({
  playlist_id: playlistId,
  episode_id: entry.episodeId,
  ordinal,
  position: entry.position
})

export const downloadRuleRow = (r: DownloadRule): StateRows["download_rule"][number] => ({
  subscription_id: r.subscriptionId,
  device_id: r.deviceId,
  mode: r.mode,
  keep_at_most: r.keepAtMost,
  since: r.mode === "allNew" ? (r.since ?? null) : null
})

const settingEncoders = {
  listeningLog: Schema.encodeSync(ListeningJson),
  activePlaylistId: JSON.stringify,
  playbackSettings: Schema.encodeSync(SettingsJson),
  trash: Schema.encodeSync(TrashJson),
  trashDays: JSON.stringify
}

export const settingKeys = Object.keys(settingEncoders) as Array<keyof typeof settingEncoders>

export const settingRow = <K extends keyof typeof settingEncoders>(
  state: State,
  key: K
): StateRows["setting"][number] | undefined => {
  const value = state[key]
  if (value === undefined) return undefined
  const encode = settingEncoders[key] as (input: NonNullable<State[K]>) => string
  return { key, value: encode(value) }
}

/** Rows for every table that mirrors user State. Writers replace these tables wholesale or per key. */
export const stateToRows = (state: State): StateRows => ({
  playlist: state.playlists.map(playlistRow),
  view: state.views.map(viewRow),
  episode_state: Object.values(state.episodeStates).map(episodeStateRow),
  entry_index: state.playlists.flatMap((p) =>
    p.entries.map((e, ordinal) => entryRow(p.id, e, ordinal))
  ),
  download_rule: state.downloadRules.map(downloadRuleRow),
  setting: settingKeys.flatMap((key) => {
    const row = settingRow(state, key)
    return row === undefined ? [] : [row]
  })
})

const byOrdinal = <A extends { readonly ordinal: number }>(rows: ReadonlyArray<A>) =>
  [...rows].sort((a, b) => a.ordinal - b.ordinal)

export type StoredStateRows = Pick<
  StateRows,
  "playlist" | "view" | "episode_state" | "download_rule" | "setting"
>

/** Rebuilds State from the document tables; the index tables are derived, not read. */
export const rowsToState = (rows: StoredStateRows): State => {
  const setting = (key: string) => {
    const row = rows.setting.find((s) => s.key === key)
    if (row === undefined) throw new Error(`missing setting ${key}`)
    return row.value
  }
  const optional = (key: string) => rows.setting.find((s) => s.key === key)?.value
  return new State({
    playlists: byOrdinal(rows.playlist).map((r) => Schema.decodeSync(PlaylistJson)(r.doc)),
    views: byOrdinal(rows.view).map((r) => Schema.decodeSync(ViewJson)(r.doc)),
    episodeStates: Object.fromEntries(
      rows.episode_state.map((r) => [
        r.episode_id,
        new EpisodeState({
          episodeId: Schema.decodeSync(EpisodeState.fields.episodeId)(r.episode_id),
          played: r.played_source === null ? null : Schema.decodeSync(PlayedJson)(r.played_source),
          starred: r.starred === 1
        })
      ])
    ),
    downloadRules: rows.download_rule.map((r) =>
      Schema.decodeUnknownSync(DownloadRule)({
        subscriptionId: r.subscription_id,
        deviceId: r.device_id,
        mode: r.mode,
        keepAtMost: r.keep_at_most,
        ...(r.since == null ? {} : { since: r.since })
      })
    ),
    ...(optional("listeningLog") === undefined
      ? {}
      : { listeningLog: Schema.decodeSync(ListeningJson)(optional("listeningLog") ?? "{}") }),
    activePlaylistId: JSON.parse(setting("activePlaylistId")),
    playbackSettings: Schema.decodeSync(SettingsJson)(setting("playbackSettings")),
    ...(optional("trash") === undefined
      ? {}
      : { trash: Schema.decodeSync(TrashJson)(optional("trash") ?? "[]") }),
    ...(optional("trashDays") === undefined
      ? {}
      : { trashDays: JSON.parse(optional("trashDays") ?? "30") })
  })
}
