import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Operation, PlaybackSettings, Sql, State, Units } from "../src/index.ts"
import { insertRows, migratedDatabase } from "./support/sqlite.ts"

const s0 = State.initial(
  new PlaybackSettings.PlaybackSettings({
    speed: 1.2,
    skipIntro: Units.Seconds.make(5),
    skipOutro: Units.Seconds.make(0),
    volumeBoost: false
  })
)
let n = 0
const op = (change: unknown) =>
  Schema.decodeUnknownSync(Operation.Operation)({
    id: `op-${++n}`,
    deviceId: "phone",
    sequence: n,
    recordedAt: 1_000_000 + n * 120_000,
    change
  })

const sample = () =>
  State.applyOperations(s0, [
    op({ _tag: "AddEntry", playlistId: "default", episodeId: "A", placement: "last" }),
    op({ _tag: "AddEntry", playlistId: "default", episodeId: "B", placement: "last" }),
    op({ _tag: "CreatePlaylist", playlistId: "replay", name: "Replay", clearOnPlayed: false }),
    op({ _tag: "AddEntry", playlistId: "replay", episodeId: "B", placement: "last" }),
    op({
      _tag: "ReportPosition",
      playlistId: "default",
      episodeId: "A",
      position: 90,
      listenedAt: 9_000_000_000
    }),
    op({ _tag: "MarkPlayed", episodeId: "Z", source: { _tag: "User" } }),
    op({ _tag: "SetStar", episodeId: "B", starred: true }),
    op({
      _tag: "SaveView",
      view: {
        id: "v",
        name: "Starred",
        filter: { starred: true },
        sort: "publishedDesc",
        limit: null
      }
    }),
    op({
      _tag: "SetDownloadRule",
      rule: { subscriptionId: "s", deviceId: "phone", mode: "onEntry", keepAtMost: null }
    }),
    op({ _tag: "SetActivePlaylist", playlistId: "replay" })
  ]).state

describe("SQLite schema", () => {
  it("applies the migrations to an empty database", () => {
    const db = migratedDatabase()
    const tables = db
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name")
      .all()
      .map((r) => r.name)
    expect(tables).toEqual([
      "download_rule",
      "entry_index",
      "episode",
      "episode_state",
      "playlist",
      "setting",
      "subscription",
      "view"
    ])
  })

  it("round-trips State through its tables", () => {
    const state = sample()
    const rows = Sql.stateToRows(state)
    const db = migratedDatabase()
    for (const [table, tableRows] of Object.entries(rows)) insertRows(db, table, tableRows)
    const read = (table: string) => db.prepare(`SELECT * FROM ${table}`).all() as never
    const back = Sql.rowsToState({
      playlist: read("playlist"),
      view: read("view"),
      episode_state: read("episode_state"),
      download_rule: read("download_rule"),
      setting: read("setting")
    })
    expect(Schema.encodeSync(State.State)(back)).toEqual(Schema.encodeSync(State.State)(state))
  })

  it("gives existing Playlists an order when upgrading, Default first", () => {
    const db = new DatabaseSync(":memory:")
    const [upgrade, ...earlier] = [...Sql.migrations].reverse()
    for (const m of earlier.reverse()) for (const statement of m.statements) db.exec(statement)
    for (const id of ["workshop", "default", "commute"]) {
      db.prepare("INSERT INTO playlist (id, doc) VALUES (?, '{}')").run(id)
    }
    for (const statement of upgrade?.statements ?? []) db.exec(statement)
    const rows = db.prepare("SELECT id FROM playlist ORDER BY ordinal").all()
    expect(rows.map((r) => r.id)).toEqual(["default", "workshop", "commute"])
  })

  it("keeps Playlists in their order when a row is rewritten", () => {
    // Rewriting a row (INSERT OR REPLACE) moves it to the end of the table; the order
    // must come from the State, not from the table.
    const state = State.applyOperations(sample(), [
      op({ _tag: "CreatePlaylist", playlistId: "walks", name: "Walks", clearOnPlayed: true })
    ]).state
    const db = migratedDatabase()
    for (const [table, tableRows] of Object.entries(Sql.stateToRows(state))) {
      insertRows(db, table, tableRows)
    }
    const defaultRow = Sql.stateToRows(state).playlist[0]
    db.prepare("DELETE FROM playlist WHERE id = 'default'").run()
    insertRows(db, "playlist", [defaultRow ?? {}])
    const read = (table: string) => db.prepare(`SELECT * FROM ${table}`).all() as never
    const back = Sql.rowsToState({
      playlist: read("playlist"),
      view: read("view"),
      episode_state: read("episode_state"),
      download_rule: read("download_rule"),
      setting: read("setting")
    })
    expect(back.playlists.map((p) => p.id)).toEqual(["default", "replay", "walks"])
  })

  it("indexes Entries and Episode states for View queries", () => {
    const rows = Sql.stateToRows(sample())
    expect(rows.entry_index).toEqual([
      { playlist_id: "default", episode_id: "A", ordinal: 0, position: 90 },
      { playlist_id: "default", episode_id: "B", ordinal: 1, position: 0 },
      { playlist_id: "replay", episode_id: "B", ordinal: 0, position: 0 }
    ])
    expect(rows.episode_state.find((r) => r.episode_id === "B")?.starred).toBe(1)
    expect(rows.episode_state.find((r) => r.episode_id === "Z")?.played_at).not.toBeNull()
  })
})
