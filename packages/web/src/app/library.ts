import { Effect } from "effect"
import { Atom } from "effect/reactivity"
import { DataLayer } from "../data/DataLayer.ts"
import { pageControls } from "../data/PagedRead.ts"
import { LibraryClient, LibraryError } from "../library/LibraryClient.ts"
import { opmlImport } from "../library/OpmlImport.ts"
import { runtime } from "./runtime.ts"

// Library actions. Each asks the server, then syncs at once so the new Subscription
// (or its absence) and its Episodes show without waiting for the next sync.

const thenSync = <A, E>(effect: Effect.Effect<A, E, LibraryClient | DataLayer>) =>
  Effect.gen(function* () {
    const result = yield* effect
    const engine = yield* DataLayer
    yield* engine.sync.pipe(Effect.ignore)
    return result
  })

export const directorySearchAtom = runtime.fn((query: string) =>
  Effect.gen(function* () {
    const client = yield* LibraryClient
    return yield* client.search(query)
  })
)

export const readPodcastAtom = runtime.fn((feedUrl: string) =>
  Effect.flatMap(LibraryClient, (client) => client.readPodcast(feedUrl))
)

const episodeLoading = () => new LibraryError("Episode details are still loading. Try again.")

export const bringEpisodeAtom = runtime.fn(
  ({ feedUrl, guid }: { readonly feedUrl: string; readonly guid: string }) =>
    Effect.gen(function* () {
      const library = yield* LibraryClient
      const data = yield* DataLayer
      const id = yield* library.bringEpisode(feedUrl, guid)
      yield* data.sync.pipe(Effect.mapError(episodeLoading))
      const title = yield* data.episodeTitle(id).pipe(Effect.mapError(episodeLoading))
      if (title === undefined) return yield* Effect.fail(episodeLoading())
      return id
    }),
  { concurrent: true }
)

const subscribeFeed = (feedUrl: string) =>
  thenSync(Effect.flatMap(LibraryClient, (client) => client.subscribe(feedUrl)))

export const subscribeAtom = runtime.fn(subscribeFeed, { concurrent: true })

export const unsubscribeAtom = runtime.fn((subscriptionId: string) =>
  thenSync(Effect.flatMap(LibraryClient, (client) => client.unsubscribe(subscriptionId)))
)

export const importOpmlAtom = runtime.fn((opml: string) =>
  thenSync(Effect.flatMap(LibraryClient, (client) => client.importOpml(opml)))
)

// Kept alive while navigating away from Settings. Uses the ordinary Subscribe path.
export const opmlCommandAtom = runtime
  .fn(
    (command: File | ReadonlyArray<File> | "import" | "retry") =>
      Effect.gen(function* () {
        const data = yield* DataLayer
        const services = yield* Effect.context<LibraryClient | DataLayer>()
        const known = async () => {
          let items = await Effect.runPromise(data.subscriptions)
          for (;;) {
            const more = pageControls(items)?.more
            if (!more) return new Set(items.map((s) => s.feedUrl))
            items = await more()
          }
        }
        if (typeof command !== "string") {
          yield* Effect.promise(() =>
            opmlImport.selectFiles(command instanceof File ? [command] : command, known)
          )
          return
        }
        yield* Effect.promise(() =>
          opmlImport.run(
            known,
            (feed) => Effect.runPromise(subscribeFeed(feed).pipe(Effect.provide(services))),
            command === "retry"
          )
        )
      }),
    { concurrent: true }
  )
  .pipe(Atom.keepAlive)

export const exportOpmlAtom = runtime.fn(() =>
  Effect.gen(function* () {
    const data = yield* DataLayer
    let items = yield* data.subscriptions
    for (;;) {
      const more = pageControls(items)?.more
      if (!more) break
      items = yield* Effect.tryPromise(() => more())
    }
    const xmlEscape = (s: string) =>
      s
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
    return `<?xml version="1.0"?><opml version="2.0"><body>${items.map((s) => `<outline type="rss" text="${xmlEscape(s.title)}" xmlUrl="${xmlEscape(s.feedUrl)}"/>`).join("")}</body></opml>`
  })
)
