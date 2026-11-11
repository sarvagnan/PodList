import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { Reads as Api } from "@podlist/api"
import { type PlaybackSettings, Units, View, ViewQuery } from "@podlist/domain"
import { Context, Effect, Schema } from "effect"
import { SqlClient } from "effect/sql"

export const ReadTime = Context.Reference<() => number>("@podlist/server/ReadTime", {
  defaultValue: () => Date.now
})

export const cursors = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  const [row] = yield* sql<{ state: number; library: number }>`SELECT
    COALESCE((SELECT max(seq) FROM operation_log), 0) AS state,
    COALESCE((SELECT max(seq) FROM catalogue_change), 0) AS library`
  return new Api.Cursors(row ?? { state: 0, library: 0 })
}).pipe(Effect.orDie)

interface Paging {
  readonly pageSize?: number
  readonly continuation?: string
}
interface Token {
  readonly key: string
  readonly offset: number
  readonly now: number
  readonly state: number
  readonly library: number
}
interface EpisodeRow {
  id: string
  title: string
  podcast: string
  published: number
  duration: number | null
  artwork_url: string | null
  podcast_artwork_url: string | null
  played_at: number | null
  starred: number
}
const summary = (r: Omit<EpisodeRow, "published" | "played_at" | "starred">) => ({
  id: r.id,
  title: r.title,
  podcast: r.podcast,
  duration: r.duration,
  artworkUrl: r.artwork_url ?? r.podcast_artwork_url
})
const viewEpisode = (r: EpisodeRow) =>
  new Api.ViewEpisode({
    ...summary(r),
    published: r.published,
    played: r.played_at !== null,
    starred: r.starred === 1
  })
const subscriptionQuery = `SELECT s.id, s.feed_url AS feedUrl, s.title, s.author, s.description,
  s.artwork_url AS artworkUrl, s.unsubscribed_at IS NULL AS subscribed,
  s.played_threshold AS playedThreshold, s.playback_settings AS playbackSettings,
  (SELECT count(*) FROM episode e WHERE e.subscription_id = s.id) AS episodes,
  (SELECT count(*) FROM episode e LEFT JOIN episode_state st ON st.episode_id = e.id
    WHERE e.subscription_id = s.id AND st.played_at IS NULL) AS unplayed FROM subscription s`
type SubscriptionRow = Omit<
  Api.SubscriptionDetail,
  "playbackSettings" | "speed" | "customSettings" | "subscribed"
> & {
  playbackSettings: string
  subscribed: number
}
const subscription = (r: SubscriptionRow) => {
  const playbackSettings = JSON.parse(
    r.playbackSettings
  ) as PlaybackSettings.PlaybackSettingsOverride
  return new Api.SubscriptionDetail({
    ...r,
    playbackSettings,
    subscribed: r.subscribed === 1,
    speed: playbackSettings.speed ?? null,
    customSettings:
      Object.values(playbackSettings).filter((v) => v !== undefined).length +
      (r.playedThreshold === null ? 0 : 1)
  })
}

/** One reader instance owns its continuation signing key. A restart requires fresh pages. */
export const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  const now = yield* ReadTime
  const secret = randomBytes(32)
  const sign = (s: string) => createHmac("sha256", secret).update(s).digest()
  const encode = (token: Token) => {
    const body = Buffer.from(JSON.stringify(token)).toString("base64url")
    return `${body}.${sign(body).toString("base64url")}`
  }
  const decode = (encoded: string) =>
    Effect.try({
      try: (): Token => {
        if (encoded.length > 2048) throw new Error("Token too long")
        const [body, signature, extra] = encoded.split(".")
        if (!body || !signature || extra !== undefined) throw new Error("Invalid token")
        const mac = Buffer.from(signature, "base64url")
        if (mac.length !== 32 || !timingSafeEqual(mac, sign(body)))
          throw new Error("Invalid signature")
        return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Token
      },
      catch: () => new Api.InvalidContinuation()
    })
  // Object member order is not part of a filter's identity on the wire.
  const fingerprint = (value: unknown) =>
    JSON.stringify(value, (_key, item: unknown) =>
      item !== null && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
        : item
    )
  const current = cursors.pipe(Effect.provideService(SqlClient.SqlClient, sql))
  const page = <R extends object>(
    scope: unknown,
    paging: Paging,
    query: (at: number) => Effect.Effect<ViewQuery.CompiledQuery, Api.InvalidReadQuery>
  ) =>
    Effect.gen(function* () {
      const size = paging.pageSize ?? 100
      const key = createHash("sha256")
        .update(fingerprint([scope, size]))
        .digest("hex")
      const revision = yield* current
      const token =
        paging.continuation === undefined ? undefined : yield* decode(paging.continuation)
      if (token && (token.state !== revision.state || token.library !== revision.library))
        return yield* new Api.ReadChanged()
      if (token && token.key !== key) return yield* new Api.InvalidContinuation()
      const at = token?.now ?? now()
      const offset = token?.offset ?? 0
      const compiled = yield* query(at)
      const [count] = yield* sql
        .unsafe<{ total: number }>(`SELECT count(*) AS total FROM (${compiled.sql})`, [
          ...compiled.params
        ])
        .pipe(Effect.orDie)
      const total = count?.total ?? 0
      const items = yield* sql
        .unsafe<R>(`SELECT * FROM (${compiled.sql}) LIMIT ? OFFSET ?`, [
          ...compiled.params,
          size,
          offset
        ])
        .pipe(Effect.orDie)
      return {
        items,
        total,
        cursors: revision,
        continuation:
          offset + items.length < total
            ? encode({ key, offset: offset + items.length, now: at, ...revision })
            : null
      }
    }).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die))
  const compile = (input: ViewQuery.ViewQueryInput, at: number) =>
    Schema.decodeUnknownEffect(Api.ViewInput)(input).pipe(
      Effect.mapError(() => new Api.InvalidReadQuery()),
      Effect.flatMap((validated) =>
        Effect.try({
          try: () => ViewQuery.compile(validated, Units.EpochMillis.make(at)),
          catch: () => new Api.InvalidReadQuery()
        })
      )
    )
  const filter = (input: ViewQuery.ViewQueryInput, paging: Paging, scope: unknown = input) =>
    page<EpisodeRow>(scope, paging, (at) => compile(input, at)).pipe(
      Effect.map((p) => new Api.EpisodePage({ ...p, items: p.items.map(viewEpisode) }))
    )
  const savedView = (id: string) =>
    Effect.gen(function* () {
      const [row] = yield* sql<{ doc: string }>`SELECT doc FROM view WHERE id = ${id}`.pipe(
        Effect.orDie
      )
      if (!row) return yield* new Api.ReadNotFound()
      return Schema.decodeSync(Schema.fromJsonString(View.View))(row.doc)
    })
  return {
    cursors: current,
    filter: (payload: Api.FilterRequest) =>
      filter(payload, payload, [
        "filter",
        { filter: payload.filter, sort: payload.sort, limit: payload.limit }
      ]),
    search: (payload: Api.SearchRequest) =>
      filter({ filter: { text: payload.q }, sort: "publishedDesc", limit: null }, payload, [
        "search",
        payload.q
      ]),
    view: (id: string, paging: Paging) =>
      Effect.gen(function* () {
        const view = yield* savedView(id)
        return yield* filter(view, paging, ["view", view])
      }).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die)),
    counts: Effect.gen(function* () {
      const revision = yield* current
      const rows = yield* sql<{
        id: string
        doc: string
      }>`SELECT id, doc FROM view ORDER BY ordinal`.pipe(Effect.orDie)
      const counts = []
      const at = Units.EpochMillis.make(now())
      for (const row of rows) {
        const query = yield* compile(
          Schema.decodeSync(Schema.fromJsonString(View.View))(row.doc),
          at
        )
        const [count] = yield* sql
          .unsafe<{ n: number }>(`SELECT count(*) AS n FROM (${query.sql})`, [...query.params])
          .pipe(Effect.orDie)
        counts.push({ id: row.id, count: count?.n ?? 0 })
      }
      return new Api.ViewCounts({ counts, cursors: revision })
    }).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die)),
    summaries: (ids: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        if (ids.length === 0) return []
        const rows =
          yield* sql<EpisodeRow>`SELECT e.id, e.title, s.title AS podcast, e.duration, e.artwork_url,
        s.artwork_url AS podcast_artwork_url FROM episode e JOIN subscription s ON s.id = e.subscription_id
        WHERE ${sql.in("e.id", [...ids])}`.pipe(Effect.orDie)
        return rows.map((r) => new Api.EpisodeSummary(summary(r)))
      }),
    episode: (id: string) =>
      Effect.gen(function* () {
        const [row] = yield* sql<
          EpisodeRow & {
            description: string
            audioUrl: string
            subscriptionId: string
            threshold: number | null
            override: string
            chapters: string
          }
        >`SELECT e.*, s.title AS podcast,
        s.artwork_url AS podcast_artwork_url, e.audio_url AS audioUrl, s.id AS subscriptionId,
        s.played_threshold AS threshold, s.playback_settings AS override
        FROM episode e JOIN subscription s ON s.id = e.subscription_id WHERE e.id = ${id}`.pipe(
          Effect.orDie
        )
        if (!row) return yield* new Api.ReadNotFound()
        return new Api.EpisodeDetail({
          ...summary(row),
          published: row.published,
          description: row.description,
          audioUrl: row.audioUrl,
          subscriptionId: row.subscriptionId,
          threshold: row.threshold,
          override: JSON.parse(row.override),
          chapters: JSON.parse(row.chapters)
        })
      }),
    subscriptions: (paging: Paging) =>
      page<SubscriptionRow>("subscriptions", paging, () =>
        Effect.succeed({
          sql: `${subscriptionQuery} WHERE s.unsubscribed_at IS NULL ORDER BY s.title COLLATE NOCASE, s.id`,
          params: []
        })
      ).pipe(
        Effect.map((p) => new Api.SubscriptionPage({ ...p, items: p.items.map(subscription) }))
      ),
    subscription: (id: string) =>
      Effect.gen(function* () {
        const [row] = yield* sql
          .unsafe<SubscriptionRow>(`${subscriptionQuery} WHERE s.id = ?`, [id])
          .pipe(Effect.orDie)
        if (!row) return yield* new Api.ReadNotFound()
        return subscription(row)
      }),
    stats: (kind: "podcasts" | "episodes", paging: Paging) =>
      page<{ id: string; title: string | null }>(["stats", kind], paging, () =>
        Effect.succeed({
          sql:
            kind === "podcasts"
              ? "SELECT id, title FROM subscription ORDER BY id"
              : "SELECT id, NULL AS title FROM episode ORDER BY id",
          params: []
        })
      ).pipe(Effect.map((p) => new Api.StatsPage(p)))
  }
})
