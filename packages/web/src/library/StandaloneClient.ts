import { Subscriptions } from "@podlist/api"
import { Effect, Layer } from "effect"
import { desktopPublisher } from "./DesktopPublisher.ts"
import { LibraryClient, LibraryError } from "./LibraryClient.ts"
import { readOpml } from "./OpmlImport.ts"
import { makeStandaloneLibrary, runPublisherChecks } from "./StandaloneLibrary.ts"

export const standaloneLibraryLayer = Layer.effect(
  LibraryClient,
  Effect.gen(function* () {
    const library = yield* makeStandaloneLibrary(desktopPublisher)
    return LibraryClient.of({
      search: library.search,
      subscribe: library.subscribe,
      unsubscribe: library.unsubscribe,
      bringEpisode: library.bringEpisode,
      readPodcast: (feed) =>
        library
          .readPodcast(feed)
          .pipe(Effect.map((podcast) => new Subscriptions.PodcastFeed(podcast))),
      refreshSubscription: (id) =>
        library
          .refresh({ subscriptionId: id })
          .pipe(
            Effect.flatMap((result) =>
              result.failed || result.checked === 0
                ? Effect.fail(new LibraryError("Could not refresh the feed. Try again."))
                : Effect.void
            )
          ),
      runInBackground: runPublisherChecks(library.refresh),
      importOpml: (source) =>
        Effect.gen(function* () {
          const podcasts = yield* Effect.try({
            try: () => readOpml(source),
            catch: (error) =>
              new LibraryError(
                error instanceof Error ? error.message : "Could not read the OPML file."
              )
          })
          const failed = []
          let added = 0
          let alreadySubscribed = 0
          for (const { feedUrl } of podcasts) {
            if (yield* library.isSubscribed(feedUrl)) {
              alreadySubscribed++
              continue
            }
            const result = yield* library.subscribe(feedUrl).pipe(Effect.result)
            if (result._tag === "Failure") failed.push({ feedUrl, message: result.failure.message })
            else added++
          }
          return new Subscriptions.ImportSummary({ added, alreadySubscribed, failed })
        })
    })
  })
)
