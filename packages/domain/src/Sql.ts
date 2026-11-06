import { Effect, Schema } from "effect"
import { Migrator, SqlClient } from "effect/sql"
import { DownloadRule } from "./Device.ts"
import { EpisodeState } from "./Library.ts"
import { PlaybackSettings } from "./PlaybackSettings.ts"
import { Playlist } from "./Playlist.ts"
import { State } from "./State.ts"
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
  }
]

/** Runs the shared migrations with any `effect/sql` SQLite driver (server or browser). */
export const migrationLoader = Migrator.fromRecord(
  Object.fromEntries(
    migrations.map((m) => [
      `${String(m.id).padStart(4, "0")}_${m.name}`,
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        for (const statement of m.statements) yield* sql.unsafe(statement)
      })
    ])
  )
)

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
  }>
  readonly setting: ReadonlyArray<{ readonly key: string; readonly value: string }>
}

const PlaylistJson = Schema.fromJsonString(Playlist)
const ViewJson = Schema.fromJsonString(View)
const SettingsJson = Schema.fromJsonString(PlaybackSettings)
const PlayedJson = Schema.fromJsonString(EpisodeState.fields.played)

/** Rows for every table that mirrors user State. Writers replace these tables wholesale or per key. */
export const stateToRows = (state: State): StateRows => ({
  playlist: state.playlists.map((p, ordinal) => ({
    id: p.id,
    ordinal,
    doc: Schema.encodeSync(PlaylistJson)(p)
  })),
  view: state.views.map((v, ordinal) => ({
    id: v.id,
    ordinal,
    doc: Schema.encodeSync(ViewJson)(v)
  })),
  episode_state: Object.values(state.episodeStates).map((s) => ({
    episode_id: s.episodeId,
    played_at: s.played?.at ?? null,
    played_source: s.played === null ? null : Schema.encodeSync(PlayedJson)(s.played),
    starred: s.starred ? 1 : 0
  })),
  entry_index: state.playlists.flatMap((p) =>
    p.entries.map((e, ordinal) => ({
      playlist_id: p.id,
      episode_id: e.episodeId,
      ordinal,
      position: e.position
    }))
  ),
  download_rule: state.downloadRules.map((r) => ({
    subscription_id: r.subscriptionId,
    device_id: r.deviceId,
    mode: r.mode,
    keep_at_most: r.keepAtMost
  })),
  setting: [
    { key: "activePlaylistId", value: JSON.stringify(state.activePlaylistId) },
    { key: "playbackSettings", value: Schema.encodeSync(SettingsJson)(state.playbackSettings) }
  ]
})

const byOrdinal = <A extends { readonly ordinal: number }>(rows: ReadonlyArray<A>) =>
  [...rows].sort((a, b) => a.ordinal - b.ordinal)

/** Rebuilds State from the document tables; the index tables are derived, not read. */
export const rowsToState = (
  rows: Pick<StateRows, "playlist" | "view" | "episode_state" | "download_rule" | "setting">
): State => {
  const setting = (key: string) => {
    const row = rows.setting.find((s) => s.key === key)
    if (row === undefined) throw new Error(`missing setting ${key}`)
    return row.value
  }
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
        keepAtMost: r.keep_at_most
      })
    ),
    activePlaylistId: JSON.parse(setting("activePlaylistId")),
    playbackSettings: Schema.decodeSync(SettingsJson)(setting("playbackSettings"))
  })
}
