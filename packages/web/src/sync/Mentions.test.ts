import { describe, expect, it } from "@effect/vitest"
import { Library, State, StateStore, Units, View, ViewQuery } from "@podlist/domain"
import { Effect, Layer, Schema } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import vectors from "../../../domain/protocol/views.json"
import * as LocalDb from "../platform/LocalDb.ts"
import { upsertEpisodes, upsertSubscriptions } from "./Catalogue.ts"

// The same independent vectors run on Node SQLite and Android's bundled SQLite.
describe("Mentions on browser SQLite", () => {
  it.effect("matches every View vector after Library sync, including metadata replacements", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      yield* upsertSubscriptions(
        vectors.subscriptions.map((value) => Schema.decodeUnknownSync(Library.Subscription)(value))
      )
      const state = Schema.decodeUnknownSync(State.State)(vectors.state)
      yield* StateStore.save(null, state)
      for (const vector of vectors.cases) {
        yield* sql`DELETE FROM episode`
        yield* upsertEpisodes(
          ("episodes" in vector ? vector.episodes : vectors.episodes).map((value) =>
            Schema.decodeUnknownSync(Library.Episode)(value)
          )
        )
        const compiled = ViewQuery.compile(
          Schema.decodeUnknownSync(View.View)(vector.view),
          Units.EpochMillis.make("now" in vector ? vector.now : vectors.now)
        )
        const rows = yield* sql.unsafe<{ id: string }>(compiled.sql, compiled.params)
        expect(
          rows.map((r) => r.id),
          vector.name
        ).toEqual(vector.expected)
      }
      // A replacement must update each folded column, too.
      const first = Schema.decodeUnknownSync(Library.Episode)(vectors.episodes[0])
      yield* sql`DELETE FROM episode`
      yield* upsertEpisodes([first])
      yield* upsertEpisodes([
        new Library.Episode({ ...first, title: "ПРИВЕТ", description: "été" })
      ])
      const compiled = ViewQuery.compile(
        { filter: { text: "привет ÉTÉ" }, sort: "publishedDesc", limit: null },
        Units.EpochMillis.make(vectors.now)
      )
      expect(
        (yield* sql.unsafe<{ id: string }>(compiled.sql, compiled.params)).map((r) => r.id)
      ).toEqual([first.id])
    }).pipe(Effect.provide(LocalDb.layerMemory.pipe(Layer.provideMerge(Reactivity.layer))))
  )
})
