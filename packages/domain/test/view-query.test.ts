import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Units, View, ViewQuery } from "../src/index.ts"
import { insertRows, migratedDatabase } from "./support/sqlite.ts"

const day = 86_400_000
const now = Units.EpochMillis.make(100 * day)

const library = () => {
  const db = migratedDatabase()
  const sub = (id: string, unsubscribedAt: number | null = null) => ({
    id,
    feed_url: `https://example.test/${id}`,
    title: id,
    subscribed_at: 0,
    unsubscribed_at: unsubscribedAt
  })
  insertRows(db, "subscription", [sub("sci"), sub("tech"), sub("gone", 50 * day)])
  const ep = (
    id: string,
    subscription_id: string,
    title: string,
    ageDays: number,
    duration: number | null,
    description = ""
  ) => ({
    id,
    subscription_id,
    guid: id,
    title,
    description,
    published: now - ageDays * day,
    duration,
    audio_url: `${id}.mp3`
  })
  insertRows(db, "episode", [
    ep("e1", "sci", "The quiet sun problem", 2, 2460),
    ep("e2", "sci", "Counting worms from orbit", 10, 2220, "satellite imagery"),
    ep("e3", "tech", "Who owns the model weights?", 1, 3480, "An AI lawyer argues"),
    ep("e4", "tech", "Small models, big phones", 6, 1500, "AI on device"),
    ep("e5", "tech", "100% uptime is a myth", 3, null),
    ep("g1", "gone", "Orphan kept by a Star", 4, 1200),
    ep("g2", "gone", "Orphan kept by an Entry", 4, 1200),
    ep("g3", "gone", "Orphan dropped", 4, 1200)
  ])
  insertRows(db, "episode_state", [
    { episode_id: "e2", played_at: 5, played_source: null, starred: 0 },
    { episode_id: "e4", played_at: null, played_source: null, starred: 1 },
    { episode_id: "g1", played_at: null, played_source: null, starred: 1 }
  ])
  insertRows(db, "entry_index", [
    { playlist_id: "default", episode_id: "e1", ordinal: 0, position: 300 },
    { playlist_id: "default", episode_id: "e3", ordinal: 1, position: 0 },
    { playlist_id: "default", episode_id: "g2", ordinal: 2, position: 0 }
  ])
  return db
}

const run = (filter: unknown, sort = "publishedDesc", limit: number | null = null) => {
  const view = Schema.decodeUnknownSync(View.View)({ id: "v", name: "v", filter, sort, limit })
  const { sql, params } = ViewQuery.compile(view, now)
  return library()
    .prepare(sql)
    .all(...params)
    .map((r) => r.id)
}

describe("View queries", () => {
  it("lists the Library newest first, keeping Orphans only if Starred or in a Playlist", () => {
    expect(run({})).toEqual(["e3", "e1", "e5", "g1", "g2", "e4", "e2"])
  })

  it("filters by Published: last N days and a fixed range", () => {
    expect(run({ published: { _tag: "LastDays", days: 3 } })).toEqual(["e3", "e1", "e5"])
    expect(run({ published: { _tag: "Between", from: now - 7 * day, to: now - 5 * day } })).toEqual(
      ["e4"]
    )
  })

  it("includes or excludes a set of podcasts", () => {
    expect(run({ podcasts: { mode: "include", subscriptionIds: ["sci"] } })).toEqual(["e1", "e2"])
    expect(run({ podcasts: { mode: "exclude", subscriptionIds: ["tech", "gone"] } })).toEqual([
      "e1",
      "e2"
    ])
  })

  it("matches every word in the title or description, case-insensitively and literally", () => {
    expect(run({ text: "ai" })).toEqual(["e3", "e4"])
    expect(run({ text: "AI device" })).toEqual(["e4"])
    expect(run({ text: "100%" })).toEqual(["e5"])
    expect(run({ text: "%" })).toEqual(["e5"])
  })

  it("filters by played state, including in progress", () => {
    expect(run({ played: "played" })).toEqual(["e2"])
    expect(run({ played: "inProgress" })).toEqual(["e1"])
    expect(run({ played: "unplayed" })).not.toContain("e2")
  })

  it("filters by Star, Playlist membership and duration", () => {
    expect(run({ starred: true })).toEqual(["g1", "e4"])
    expect(run({ notInAnyPlaylist: true, starred: false })).toEqual(["e5", "e2"])
    expect(run({ maxDuration: 1800 })).toEqual(["g1", "g2", "e4"])
    expect(run({ minDuration: 3000 })).toEqual(["e3"])
  })

  it("combines conditions with AND, sorts and limits", () => {
    expect(
      run(
        { podcasts: { mode: "include", subscriptionIds: ["tech"] }, played: "unplayed" },
        "durationDesc"
      )
    ).toEqual(["e3", "e4", "e5"])
    expect(run({}, "publishedAsc", 2)).toEqual(["e2", "e4"])
  })
})
