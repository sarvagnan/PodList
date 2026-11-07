import { Effect } from "effect"
import { LibraryClient } from "../library/LibraryClient.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { runtime } from "./runtime.ts"

// Library actions. Each asks the server, then syncs at once so the new Subscription
// (or its absence) and its Episodes show without waiting for the next sync.

const thenSync = <A, E>(effect: Effect.Effect<A, E, LibraryClient | SyncEngine>) =>
  Effect.gen(function* () {
    const result = yield* effect
    const engine = yield* SyncEngine
    yield* engine.sync.pipe(Effect.ignore)
    return result
  })

export const directorySearchAtom = runtime.fn((query: string) =>
  Effect.gen(function* () {
    const client = yield* LibraryClient
    return yield* client.search(query)
  })
)

export const subscribeAtom = runtime.fn(
  (feedUrl: string) =>
    thenSync(Effect.flatMap(LibraryClient, (client) => client.subscribe(feedUrl))),
  { concurrent: true }
)

export const unsubscribeAtom = runtime.fn((subscriptionId: string) =>
  thenSync(Effect.flatMap(LibraryClient, (client) => client.unsubscribe(subscriptionId)))
)

export const importOpmlAtom = runtime.fn((opml: string) =>
  thenSync(Effect.flatMap(LibraryClient, (client) => client.importOpml(opml)))
)
