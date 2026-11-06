import { Context, Duration, Effect, Exit, Layer, Schedule } from "effect"
import { SqlClient } from "effect/sql"
import { Library, type RefreshResult } from "./Library.ts"

/** Every active Subscription is checked this often (Q26). */
export const pollInterval = Duration.minutes(30)
/** At most this many feeds are fetched at once. */
export const concurrency = 5

const halfHour = 30 * 60 * 1000
const day = 24 * 60 * 60 * 1000

/** How long a failing feed waits before the scheduler tries it again: 30 min, 1 h, 2 h … up to a day. */
export const backoffMillis = (failures: number) =>
  failures <= 0 ? 0 : Math.min(halfHour * 2 ** (failures - 1), day)

export interface RefreshSummary {
  readonly checked: number
  readonly updated: number
  readonly notModified: number
  readonly failed: number
}

export class Poller extends Context.Service<
  Poller,
  {
    /** Refreshes every active Subscription; `respectBackoff` skips feeds still backing off. */
    readonly refreshAll: (options: {
      readonly respectBackoff: boolean
    }) => Effect.Effect<RefreshSummary>
    readonly refreshOne: (subscriptionId: string) => ReturnType<Library["Service"]["refresh"]>
  }
>()("@podlist/server/Poller") {
  static readonly layer = Layer.effect(
    Poller,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const library = yield* Library

      const refreshAll = ({ respectBackoff }: { readonly respectBackoff: boolean }) =>
        Effect.gen(function* () {
          const now = Date.now()
          const rows = yield* sql<{
            id: string
            failures: number | null
            checked_at: number | null
          }>`
            SELECT s.id, f.failures, f.checked_at
            FROM subscription s LEFT JOIN feed_state f ON f.subscription_id = s.id
            WHERE s.unsubscribed_at IS NULL`.pipe(Effect.orDie)
          const due = rows.filter(
            (r) =>
              !respectBackoff ||
              r.checked_at === null ||
              now >= r.checked_at + backoffMillis(r.failures ?? 0)
          )
          const results = yield* Effect.forEach(due, (r) => Effect.exit(library.refresh(r.id)), {
            concurrency
          })
          const ok = results.flatMap((e) => (Exit.isSuccess(e) ? [e.value as RefreshResult] : []))
          return {
            checked: results.length,
            updated: ok.filter((r) => r._tag === "Updated").length,
            notModified: ok.filter((r) => r._tag === "NotModified").length,
            failed: results.length - ok.length
          }
        })

      return Poller.of({ refreshAll, refreshOne: library.refresh })
    })
  )

  /** Polls in the background for as long as the server runs. */
  static readonly background = Layer.effectDiscard(
    Effect.gen(function* () {
      const poller = yield* Poller
      yield* poller.refreshAll({ respectBackoff: true }).pipe(
        Effect.tap((s) => Effect.log("feeds polled", s)),
        Effect.repeat(Schedule.spaced(pollInterval)),
        Effect.forkScoped
      )
    })
  )
}
