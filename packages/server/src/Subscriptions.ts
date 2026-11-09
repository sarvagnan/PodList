import { randomUUID } from "node:crypto"
import { Subscriptions as Api } from "@podlist/api"
import { Library as Domain, Mentions } from "@podlist/domain"
import { Context, Data, Effect, Layer, Schema } from "effect"
import { SqlClient } from "effect/sql"
import { XMLParser } from "fast-xml-parser"
import { type FeedError, Library } from "./Library.ts"

// Following and unfollowing podcasts, and moving subscriptions in and out as OPML.
// Unsubscribing keeps the Episodes so Starred ones and Entries survive as Orphaned (Q31).

export class NotFound extends Data.TaggedError("NotFound")<{ readonly id: string }> {}

export interface ImportSummary {
  readonly added: number
  readonly alreadySubscribed: number
  readonly failed: ReadonlyArray<{ readonly feedUrl: string; readonly message: string }>
}

interface SubscriptionRow {
  readonly id: string
  readonly feed_url: string
  readonly title: string
  readonly author: string | null
  readonly description: string | null
  readonly artwork_url: string | null
  readonly subscribed_at: number
  readonly unsubscribed_at: number | null
  readonly played_threshold: number | null
  readonly playback_settings: string
}

const decodeSubscription = Schema.decodeUnknownSync(Domain.Subscription)
export const toSubscription = (row: SubscriptionRow) =>
  decodeSubscription({
    id: row.id,
    feedUrl: row.feed_url,
    title: row.title,
    author: row.author,
    description: row.description,
    artwork: row.artwork_url === null ? null : { url: row.artwork_url },
    subscribedAt: row.subscribed_at,
    unsubscribedAt: row.unsubscribed_at,
    playedThreshold: row.played_threshold,
    playbackSettings: JSON.parse(row.playback_settings)
  })

const opmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" })

/** Every feed URL in an OPML document, however deeply its outlines are nested. */
export const feedUrlsFromOpml = (opml: string): ReadonlyArray<string> => {
  const urls: Array<string> = []
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child)
      return
    }
    if (typeof node !== "object" || node === null) return
    const record = node as Record<string, unknown>
    const url = record["@_xmlUrl"]
    if (typeof url === "string" && url.length > 0) urls.push(url)
    walk(record.outline)
  }
  walk((opmlParser.parse(opml) as { opml?: { body?: unknown } }).opml?.body)
  return [...new Set(urls)]
}

const escapeXml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => `&${{ "<": "lt", ">": "gt", "&": "amp", '"': "quot", "'": "apos" }[c]};`
  )

export class Subscriptions extends Context.Service<
  Subscriptions,
  {
    readonly list: Effect.Effect<ReadonlyArray<Domain.Subscription>>
    /** Follows a feed: fetches it first, and keeps nothing if it cannot be read. */
    readonly subscribe: (feedUrl: string) => Effect.Effect<Domain.Subscription, FeedError>
    readonly unsubscribe: (id: string) => Effect.Effect<Domain.Subscription, NotFound>
    /** Inserts missing identities without fetching feeds or changing existing rows. Ids sync via Catalogue. */
    readonly bringOver: (
      metadata: Api.BringOverRequest
    ) => Effect.Effect<void, Api.MissingSubscription>
    readonly importOpml: (opml: string) => Effect.Effect<ImportSummary>
    readonly exportOpml: Effect.Effect<string>
  }
>()("@podlist/server/Subscriptions") {
  static readonly layer = Layer.effect(
    Subscriptions,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const library = yield* Library

      const byId = (id: string) =>
        sql<SubscriptionRow>`SELECT * FROM subscription WHERE id = ${id}`.pipe(
          Effect.orDie,
          Effect.flatMap(([row]) =>
            row === undefined
              ? Effect.fail(new NotFound({ id }))
              : Effect.succeed(toSubscription(row))
          )
        )

      const list = sql<SubscriptionRow>`SELECT * FROM subscription ORDER BY title`.pipe(
        Effect.orDie,
        Effect.map((rows) => rows.map(toSubscription))
      )

      const subscribe = (feedUrl: string) =>
        Effect.gen(function* () {
          const [existing] = yield* sql<{ id: string; unsubscribed_at: number | null }>`
            SELECT id, unsubscribed_at FROM subscription WHERE feed_url = ${feedUrl}`.pipe(
            Effect.orDie
          )
          if (existing !== undefined) {
            // Following again: clear the unsubscribe, keep the Episodes already stored.
            yield* sql`UPDATE subscription SET unsubscribed_at = NULL WHERE id = ${existing.id}`.pipe(
              Effect.orDie
            )
            return yield* byId(existing.id).pipe(Effect.orDie)
          }
          const id = `sub_${randomUUID()}`
          yield* sql`INSERT INTO subscription ${sql.insert({
            id,
            feed_url: feedUrl,
            title: feedUrl,
            title_folded: Mentions.fold(feedUrl),
            subscribed_at: Date.now()
          })}`.pipe(Effect.orDie)
          yield* library.refresh(id).pipe(
            Effect.catchTag("SubscriptionNotFound", () => Effect.die("subscription vanished")),
            Effect.tapError(() =>
              Effect.all([
                sql`DELETE FROM episode WHERE subscription_id = ${id}`,
                sql`DELETE FROM feed_state WHERE subscription_id = ${id}`,
                sql`DELETE FROM subscription WHERE id = ${id}`
              ]).pipe(Effect.orDie)
            )
          )
          return yield* byId(id).pipe(Effect.orDie)
        })

      const unsubscribe = (id: string) =>
        Effect.gen(function* () {
          yield* byId(id)
          yield* sql`UPDATE subscription SET unsubscribed_at = coalesce(unsubscribed_at, ${Date.now()})
            WHERE id = ${id}`.pipe(Effect.orDie)
          return yield* byId(id)
        })

      const bringOver = (metadata: Api.BringOverRequest) =>
        Effect.gen(function* () {
          for (const s of metadata.subscriptions) {
            yield* sql`INSERT INTO subscription ${sql.insert({
              id: `sub_${randomUUID()}`,
              feed_url: s.feedUrl,
              title: s.title,
              title_folded: Mentions.fold(s.title),
              author: s.author,
              description: s.description,
              artwork_url: s.artwork?.url ?? null,
              subscribed_at: s.subscribedAt,
              unsubscribed_at: s.unsubscribedAt,
              played_threshold: s.playedThreshold,
              playback_settings: JSON.stringify(s.playbackSettings)
            })} ON CONFLICT (feed_url) DO NOTHING`
          }
          for (const e of metadata.episodes) {
            const [subscription] = yield* sql<{ id: string }>`
              SELECT id FROM subscription WHERE feed_url = ${e.feedUrl}`
            if (subscription === undefined) {
              return yield* new Api.MissingSubscription({ feedUrl: e.feedUrl })
            }
            // Refresh may have changed a guid while retaining its old hashed id.
            // A fresh id avoids colliding with that different, existing identity.
            yield* sql`INSERT INTO episode ${sql.insert({
              id: `ep_${randomUUID()}`,
              subscription_id: subscription.id,
              guid: e.guid,
              title: e.title,
              title_folded: Mentions.fold(e.title),
              description: e.description,
              description_folded: Mentions.fold(e.description),
              published: e.published,
              duration: e.duration,
              audio_url: e.audioUrl,
              artwork_url: e.artwork?.url ?? null,
              chapters: JSON.stringify(e.chapters),
              audio_updated_at: e.audioUpdatedAt
            })} ON CONFLICT (subscription_id, guid) DO NOTHING`
          }
        }).pipe(sql.withTransaction, Effect.catchTag("SqlError", Effect.die))

      const importOpml = (opml: string) =>
        Effect.gen(function* () {
          const urls = yield* Effect.try(() => feedUrlsFromOpml(opml)).pipe(
            Effect.orElseSucceed(() => [])
          )
          const known = new Set(
            (yield* sql<{ feed_url: string }>`
              SELECT feed_url FROM subscription WHERE unsubscribed_at IS NULL`.pipe(
              Effect.orDie
            )).map((r) => r.feed_url)
          )
          const fresh = urls.filter((u) => !known.has(u))
          const results = yield* Effect.forEach(
            fresh,
            (feedUrl) =>
              subscribe(feedUrl).pipe(
                Effect.as(null),
                Effect.catch((e) => Effect.succeed({ feedUrl, message: e.message }))
              ),
            { concurrency: 5 }
          )
          const failed = results.filter((r) => r !== null)
          return {
            added: fresh.length - failed.length,
            alreadySubscribed: urls.length - fresh.length,
            failed
          }
        })

      const exportOpml = list.pipe(
        Effect.map((subs) => {
          const outlines = subs
            .filter((s) => s.unsubscribedAt === null)
            .map(
              (s) =>
                `    <outline type="rss" text="${escapeXml(s.title)}" title="${escapeXml(s.title)}" xmlUrl="${escapeXml(s.feedUrl)}"/>`
            )
          return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<opml version="2.0">',
            "  <head><title>PodList subscriptions</title></head>",
            "  <body>",
            ...outlines,
            "  </body>",
            "</opml>",
            ""
          ].join("\n")
        })
      )

      return Subscriptions.of({ list, subscribe, unsubscribe, bringOver, importOpml, exportOpml })
    })
  )
}
