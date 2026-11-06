import { Library as Domain } from "@podlist/domain"
import { Context, Effect, Layer, Schema } from "effect"
import { SqlClient } from "effect/sql"
import { toSubscription } from "./Subscriptions.ts"

// Clients mirror the Library catalogue (subscription and episode tables) so Views run
// offline. Triggers stamp every inserted or updated row with a rising change number;
// a client asks for everything changed since the last number it saw. The trigger
// deletes then inserts rather than relying on ON CONFLICT REPLACE, because SQLite
// applies the outer statement's conflict policy inside triggers.

export const migrations = {
  "0003_catalogue_changes": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE TABLE catalogue_change (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      row_id TEXT NOT NULL
    )`
    yield* sql`CREATE UNIQUE INDEX catalogue_change_row ON catalogue_change (kind, row_id)`
    for (const table of ["subscription", "episode"]) {
      for (const event of ["INSERT", "UPDATE"]) {
        yield* sql.unsafe(`CREATE TRIGGER ${table}_${event.toLowerCase()}_change
          AFTER ${event} ON ${table}
          BEGIN
            DELETE FROM catalogue_change WHERE kind = '${table}' AND row_id = NEW.id;
            INSERT INTO catalogue_change (kind, row_id) VALUES ('${table}', NEW.id);
          END`)
      }
    }
  })
} satisfies Record<string, Effect.Effect<void, unknown, SqlClient.SqlClient>>

export interface CatalogueChanges {
  readonly cursor: number
  readonly subscriptions: ReadonlyArray<Domain.Subscription>
  readonly episodes: ReadonlyArray<Domain.Episode>
  /** True when more changes remain after `cursor`; ask again from there. */
  readonly more: boolean
}

interface EpisodeRow {
  readonly id: string
  readonly subscription_id: string
  readonly guid: string
  readonly title: string
  readonly description: string
  readonly published: number
  readonly duration: number | null
  readonly audio_url: string
  readonly artwork_url: string | null
  readonly chapters: string
  readonly audio_updated_at: number | null
}

const decodeEpisode = Schema.decodeUnknownSync(Domain.Episode)
const toEpisode = (row: EpisodeRow) =>
  decodeEpisode({
    id: row.id,
    subscriptionId: row.subscription_id,
    guid: row.guid,
    title: row.title,
    description: row.description,
    published: row.published,
    duration: row.duration,
    audioUrl: row.audio_url,
    artwork: row.artwork_url === null ? null : { url: row.artwork_url },
    chapters: JSON.parse(row.chapters),
    audioUpdatedAt: row.audio_updated_at
  })

export const defaultPageSize = 500

export class Catalogue extends Context.Service<
  Catalogue,
  { readonly changes: (since: number, limit?: number) => Effect.Effect<CatalogueChanges> }
>()("@podlist/server/Catalogue") {
  static readonly layer = Layer.effect(
    Catalogue,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const changes = (since: number, limit = defaultPageSize) =>
        Effect.gen(function* () {
          const page = yield* sql<{ seq: number; kind: string; row_id: string }>`
            SELECT seq, kind, row_id FROM catalogue_change WHERE seq > ${since}
            ORDER BY seq LIMIT ${limit + 1}`
          const rows = page.slice(0, limit)
          const ids = (kind: string) => rows.filter((r) => r.kind === kind).map((r) => r.row_id)
          const subscriptionIds = ids("subscription")
          const episodeIds = ids("episode")
          const subscriptions =
            subscriptionIds.length === 0
              ? []
              : yield* sql`SELECT * FROM subscription WHERE ${sql.in("id", subscriptionIds)}`
          const episodes =
            episodeIds.length === 0
              ? []
              : yield* sql<EpisodeRow>`SELECT * FROM episode WHERE ${sql.in("id", episodeIds)}`
          return {
            cursor: rows.at(-1)?.seq ?? since,
            subscriptions: subscriptions.map((r) => toSubscription(r as never)),
            episodes: episodes.map(toEpisode),
            more: page.length > limit
          }
        }).pipe(Effect.orDie)
      return Catalogue.of({ changes })
    })
  )
}
