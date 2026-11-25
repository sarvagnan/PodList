import { Effect, SubscriptionRef } from "effect"
import { Atom } from "effect/reactivity"
import { DataLayer } from "../data/DataLayer.ts"
import { pageControls } from "../data/PagedRead.ts"
import { desktopStandalone } from "../lib/desktopSession.ts"
import { LibraryClient } from "../library/LibraryClient.ts"
import { runtime } from "./runtime.ts"

type FeedRefresh =
  | { readonly kind: "idle" }
  | { readonly kind: "running"; readonly checked: number; readonly total: number }
  | { readonly kind: "finished"; readonly message: string; readonly error: boolean }

export const feedRefreshAtom = Atom.make<FeedRefresh>({ kind: "idle" }).pipe(Atom.keepAlive)

export const refreshFeedsAtom = runtime
  .fn((command: "start" | "cancel", context) =>
    Effect.gen(function* () {
      const data = yield* DataLayer
      if (command === "cancel") {
        context.set(feedRefreshAtom, {
          kind: "finished",
          message: desktopStandalone
            ? "Feed refresh cancelled."
            : "Feed refresh cancelled. The server may finish the current feed.",
          error: false
        })
        yield* data.sync.pipe(Effect.ignore)
        return
      }
      const library = yield* LibraryClient
      context.set(feedRefreshAtom, { kind: "running", checked: 0, total: 0 })
      if (!(yield* SubscriptionRef.get(data.status)).ready) yield* data.sync
      let subscriptions = yield* data.subscriptions
      for (;;) {
        const more = pageControls(subscriptions)?.more
        if (!more) break
        subscriptions = yield* Effect.tryPromise(() => more())
      }

      let checked = 0
      let failed = 0
      for (const subscription of subscriptions) {
        context.set(feedRefreshAtom, { kind: "running", checked, total: subscriptions.length })
        if (yield* library.refreshSubscription(subscription.id).pipe(Effect.isFailure)) failed++
        checked++
      }
      context.set(feedRefreshAtom, { kind: "running", checked, total: subscriptions.length })
      yield* data.sync
      context.set(feedRefreshAtom, {
        kind: "finished",
        message: failed
          ? `Could not refresh ${failed} of ${checked} ${checked === 1 ? "feed" : "feeds"}. Try again.`
          : "Feeds refreshed.",
        error: failed > 0
      })
    }).pipe(
      Effect.catch(() =>
        Effect.sync(() =>
          context.set(feedRefreshAtom, {
            kind: "finished",
            message: "Could not refresh the feeds. Check your connection and try again.",
            error: true
          })
        )
      )
    )
  )
  .pipe(Atom.keepAlive)
