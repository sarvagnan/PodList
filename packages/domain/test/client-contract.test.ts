import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { openApiDocument } from "../../api/src/OpenApi.ts"
import { buildListeningVectors } from "../scripts/listening-vectors.ts"
import { buildViewVectors } from "../scripts/view-vectors.ts"
import {
  Library,
  Listening,
  PlayedRules,
  Sql,
  State,
  Units,
  View,
  ViewQuery
} from "../src/index.ts"
import { insertRows, migratedDatabase } from "./support/sqlite.ts"

const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../protocol/${file}`, import.meta.url), "utf8"))
const views: ReturnType<typeof buildViewVectors> = read("views.json")
const listening: ReturnType<typeof buildListeningVectors> = read("listening.json")

describe("Language-neutral client contract", () => {
  it("committed HTTP, View and Listening contracts are current", () => {
    expect(read("openapi.json")).toEqual(openApiDocument())
    expect(views).toEqual(JSON.parse(JSON.stringify(buildViewVectors())))
    expect(listening).toEqual(buildListeningVectors())
  })

  it.each(views.cases)(
    "View: $name",
    ({ view, expected, episodes: fixtureEpisodes, now: caseNow }) => {
      const db = migratedDatabase()
      try {
        const subscriptions = views.subscriptions.map((value) =>
          Schema.decodeUnknownSync(Library.Subscription)(value)
        )
        const episodes = (fixtureEpisodes ?? views.episodes).map((value) =>
          Schema.decodeUnknownSync(Library.Episode)(value)
        )
        insertRows(
          db,
          "subscription",
          subscriptions.map((s) => ({
            id: s.id,
            feed_url: s.feedUrl,
            title: s.title,
            subscribed_at: s.subscribedAt,
            unsubscribed_at: s.unsubscribedAt
          }))
        )
        insertRows(
          db,
          "episode",
          episodes.map((e) => ({
            id: e.id,
            subscription_id: e.subscriptionId,
            guid: e.guid,
            title: e.title,
            description: e.description,
            published: e.published,
            duration: e.duration,
            audio_url: e.audioUrl
          }))
        )
        const rows = Sql.stateToRows(Schema.decodeUnknownSync(State.State)(views.state))
        insertRows(db, "episode_state", rows.episode_state)
        insertRows(db, "entry_index", rows.entry_index)
        const compiled = ViewQuery.compile(
          Schema.decodeUnknownSync(View.View)(view),
          Units.EpochMillis.make(caseNow ?? views.now)
        )
        expect(
          db
            .prepare(compiled.sql)
            .all(...compiled.params)
            .map((r) => r.id)
        ).toEqual(expected)
      } finally {
        db.close()
      }
    }
  )

  it.each(listening.samples)("Listening measurement: $name", (v) => {
    expect(
      Listening.sample(v.before, v.after, v.speed, v.offsetMinutes).map((amount) => ({
        ...amount,
        subscriptionId: v.subscriptionId
      }))
    ).toEqual(v.expected)
  })

  it.each(listening.thresholds)("Played threshold: $name", (v) => {
    expect(
      PlayedRules.isFinished(
        Units.Seconds.make(v.position),
        v.duration === null ? null : Units.Seconds.make(v.duration),
        v.threshold === null ? null : Units.Seconds.make(v.threshold)
      )
    ).toBe(v.expected)
  })

  it("OpenAPI includes every typed endpoint, raw streams and the actual authentication boundary", () => {
    const document = openApiDocument()
    expect(document.security).toEqual([])
    expect(document.info.description).toContain("Tailscale")
    expect(Object.keys(document.paths).sort()).toEqual(
      [
        "/api/artwork",
        "/api/devices",
        "/api/directory/search",
        "/api/episodes/{id}/audio",
        "/api/episodes/{id}/chapters",
        "/api/health",
        "/api/library/changes",
        "/api/library/refresh",
        "/api/live",
        "/api/live/cursors",
        "/api/reads/views/{id}",
        "/api/reads/views/counts",
        "/api/reads/filter",
        "/api/reads/search",
        "/api/reads/episodes",
        "/api/reads/episodes/{id}",
        "/api/reads/subscriptions",
        "/api/reads/subscriptions/{id}",
        "/api/reads/stats/{kind}",
        "/api/podcasts/read",
        "/api/podcasts/episodes",
        "/api/subscriptions",
        "/api/subscriptions/bring-over",
        "/api/subscriptions/export",
        "/api/subscriptions/import",
        "/api/subscriptions/{id}",
        "/api/subscriptions/{id}/refresh",
        "/api/sync/pull",
        "/api/sync/push"
      ].sort()
    )
    expect(document.paths["/api/live"]?.get?.responses).toHaveProperty("101")
    expect(document.paths["/api/live"]?.get?.responses).toHaveProperty("403")
    expect(document.paths["/api/reads/views/{id}"]?.get?.responses).toHaveProperty("409")
    expect(document.paths["/api/episodes/{id}/audio"]?.get?.responses).toHaveProperty("206")
  })
})
