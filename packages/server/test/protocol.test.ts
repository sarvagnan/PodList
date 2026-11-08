import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { Library, Operation, State, StateStore } from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import { SqlClient } from "effect/sql"
import { buildServerVectors } from "../../domain/scripts/server-vectors.ts"
import * as Database from "../src/Database.ts"
import { toSubscription } from "../src/Subscriptions.ts"
import { defaultPlaybackSettings, SyncStore } from "../src/SyncStore.ts"

const vectors: ReturnType<typeof buildServerVectors> = JSON.parse(
  readFileSync(new URL("../../domain/protocol/server.json", import.meta.url), "utf8")
)
const services = SyncStore.layer.pipe(Layer.provideMerge(Database.layer(":memory:")))

describe("Language-neutral Library-dependent operation vectors", () => {
  it("committed server vectors are current", () =>
    expect(vectors).toEqual(JSON.parse(JSON.stringify(buildServerVectors()))))
  for (const vector of vectors) {
    it.effect(vector.name, () =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const store = yield* SyncStore
        for (const s of vector.subscriptions) {
          yield* sql`INSERT INTO subscription ${sql.insert({ id: s.id, title: s.title, feed_url: s.feedUrl, subscribed_at: s.subscribedAt, unsubscribed_at: s.unsubscribedAt, played_threshold: s.playedThreshold, playback_settings: JSON.stringify(s.playbackSettings) })}`
        }
        for (const e of vector.episodes) {
          yield* sql`INSERT INTO episode ${sql.insert({ id: e.id, subscription_id: e.subscriptionId, guid: e.guid, title: e.title, description: e.description, published: e.published, duration: e.duration, audio_url: e.audioUrl })}`
        }
        yield* StateStore.save(null, Schema.decodeUnknownSync(State.State)(vector.initial))
        for (const batch of vector.batches) {
          const operations = batch.operations.map((o) =>
            Schema.decodeUnknownSync(Operation.Operation)(o)
          )
          expect(yield* store.push(operations)).toEqual({
            accepted: batch.expectedAccepted,
            cursor: batch.expectedCursor
          })
          const pulled = yield* store.pull(0)
          expect(Schema.encodeSync(State.State)(pulled.snapshot as State.State)).toEqual(
            batch.expectedState
          )
          const log = yield* sql<{
            operation: string
          }>`SELECT operation FROM operation_log ORDER BY seq`
          expect(log.map((r) => JSON.parse(r.operation))).toEqual(batch.expectedOperations)
          const subscriptions = yield* sql`SELECT * FROM subscription ORDER BY id`
          expect(
            subscriptions.map((s) =>
              Schema.encodeSync(Library.Subscription)(toSubscription(s as never))
            )
          ).toEqual([...batch.expectedSubscriptions].sort((a, b) => a.id.localeCompare(b.id)))
          const loaded = yield* StateStore.load(defaultPlaybackSettings)
          expect(Schema.encodeSync(State.State)(loaded)).toEqual(batch.expectedState)
        }
      }).pipe(Effect.provide(services))
    )
  }
})
