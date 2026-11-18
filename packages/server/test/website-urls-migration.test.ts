import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node"
import { expect, it } from "@effect/vitest"
import { Sql } from "@podlist/domain"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { Migrator, SqlClient } from "effect/sql"
import { Catalogue, migrations as catalogueMigrations } from "../src/Catalogue.ts"
import * as Database from "../src/Database.ts"
import { Library, migrations as libraryMigrations } from "../src/Library.ts"
import { migrations as syncMigrations } from "../src/SyncStore.ts"

it.effect(
  "re-reads existing feeds after migration and publishes their links without changing identities",
  () => {
    const directory = mkdtempSync(join(tmpdir(), "podlist-website-urls-"))
    const filename = join(directory, "library.db")
    const previous = Layer.mergeAll(
      SqliteMigrator.layer({ loader: Sql.migrationLoader }),
      SqliteMigrator.layer({
        loader: Migrator.fromRecord({
          ...syncMigrations,
          ...catalogueMigrations,
          "0002_feed_state": libraryMigrations["0002_feed_state"]
        }),
        table: "server_migrations"
      })
    ).pipe(Layer.provideMerge(SqliteClient.layer({ filename })))
    const network = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) => {
        expect(request.headers["if-none-match"]).toBeUndefined()
        expect(request.headers["if-modified-since"]).toBeUndefined()
        const xml = `<rss><channel><title>Podcast</title><link>https://publisher.test</link>
        <item><title>Episode</title><guid>guid</guid><link>https://publisher.test/episode</link>
        <enclosure url="https://publisher.test/audio"/></item></channel></rss>`
        return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(xml)))
      })
    )
    const current = Layer.mergeAll(Catalogue.layer, Library.layer).pipe(
      Layer.provide(network),
      Layer.provide(Database.layer(filename))
    )
    return Effect.gen(function* () {
      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO subscription (id, feed_url, title, subscribed_at)
        VALUES ('s', 'https://publisher.test/feed', 'Podcast', 0)`
        yield* sql`INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url)
        VALUES ('e', 's', 'guid', 'Episode', '', 0, 'https://publisher.test/audio')`
        yield* sql`INSERT INTO feed_state (subscription_id, etag, last_modified) VALUES
        ('s', '"old"', 'Wed, 04 Nov 2026 06:00:00 GMT')`
      }).pipe(Effect.provide(previous))

      yield* Effect.gen(function* () {
        const catalogue = yield* Catalogue
        const library = yield* Library
        const before = yield* catalogue.changes(0)
        expect(before.subscriptions[0]?.websiteUrl).toBeNull()
        expect(before.episodes[0]?.websiteUrl).toBeNull()
        expect(yield* library.refresh("s")).toEqual({ _tag: "Updated", added: 0, changed: 1 })
        const after = yield* catalogue.changes(before.cursor)
        expect(after.subscriptions).toMatchObject([
          { id: "s", websiteUrl: "https://publisher.test" }
        ])
        expect(after.episodes).toMatchObject([
          { id: "e", websiteUrl: "https://publisher.test/episode" }
        ])
      }).pipe(Effect.provide(current))
    }).pipe(Effect.ensuring(Effect.sync(() => rmSync(directory, { recursive: true, force: true }))))
  }
)
