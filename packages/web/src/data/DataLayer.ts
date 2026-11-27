import type { Library, Operation, PlaybackSettings, State, ViewQuery } from "@podlist/domain"
import { Context, Effect, SubscriptionRef } from "effect"
import type { PlayerChapter } from "../lib/chapters.ts"
import type { Offline } from "../sync/Transport.ts"

/** Invalidated after Library metadata changes, for both local and server-backed readers. */
export const catalogueKey = "catalogue"
export const playedKey = "local:played"
export const episodeFactsKey = "local:episode-facts"
export const entryMembershipKey = "local:entry-membership"
export const progressMembershipKey = "local:progress-membership"

/** A sequence of edits that can read intermediate State to prepare the next edit or Undo. */
export type RecordPlan<A> = (state: State.State) => Generator<Operation.Change, A, State.State>
export type RecordBatch = <A>(plan: RecordPlan<A>) => Effect.Effect<A>

export const recordBatch = <A>(
  data: Pick<DataLayer["Service"], "state" | "record" | "recordBatch">,
  plan: RecordPlan<A>
) =>
  data.recordBatch
    ? data.recordBatch(plan)
    : Effect.gen(function* () {
        const iterator = plan(yield* SubscriptionRef.get(data.state))
        let step = iterator.next()
        while (!step.done) {
          yield* data.record(step.value)
          step = iterator.next(yield* SubscriptionRef.get(data.state))
        }
        return step.value
      })

export interface EpisodeSummary {
  readonly id: string
  readonly title: string
  readonly podcast: string
  readonly duration: number | null
  readonly artworkUrl: string | null
}

export interface SubscriptionSummary {
  readonly id: string
  readonly feedUrl: string
  readonly title: string
  readonly author: string | null
  readonly artworkUrl: string | null
  readonly unplayed: number
  /** This podcast's own speed, or null for the default. */
  readonly speed: number | null
  /** How many settings differ from the defaults (overrides and the Played threshold). */
  readonly customSettings: number
}

export interface SubscriptionDetail {
  readonly websiteUrl?: string
  readonly id: string
  readonly feedUrl: string
  readonly title: string
  readonly author: string | null
  readonly description: string | null
  readonly artworkUrl: string | null
  readonly subscribed: boolean
  /** Seconds before the end that count as finished; null for the default. */
  readonly playedThreshold: number | null
  readonly playbackSettings: PlaybackSettings.PlaybackSettingsOverride
  readonly episodes: number
  readonly unplayed: number
}

export interface ViewEpisode {
  readonly id: string
  readonly title: string
  readonly podcast: string
  readonly published: number
  readonly duration: number | null
  readonly artworkUrl: string | null
  readonly played: boolean
  readonly starred: boolean
}

export interface EpisodeDetail {
  readonly websiteUrl?: string
  readonly id: string
  readonly title: string
  readonly podcast: string
  readonly published: number
  readonly duration: number | null
  readonly description: string
  readonly artworkUrl: string | null
  readonly chapters: ReadonlyArray<PlayerChapter>
}

export interface StatsCatalogue {
  readonly podcasts: Map<string, string>
  readonly episodes: Set<string>
}

export interface PlaybackEpisode {
  readonly title: string
  readonly audioUrl: string | null
  readonly podcast: string
  readonly artworkUrl: string | null
  readonly duration: number | null
  readonly threshold: number | null
  readonly subscriptionId: string | null
  readonly override: PlaybackSettings.PlaybackSettingsOverride
  readonly chapters: ReadonlyArray<PlayerChapter>
}

export interface DataStatus {
  readonly syncBlocked?: "UpdateRequired" | "UnsupportedOperation" | undefined
  readonly pending: number
  readonly lastSyncedAt: number | null
  readonly error: string | null
  /** State and Library have loaded at least once, including in an earlier session. */
  readonly ready: boolean
  /** Web user edits need a reachable server. Local adapters always allow edits. */
  readonly writable?: boolean
}

/** The screens and player depend on this service, never on SQL or sync bookkeeping. */
export class DataLayer extends Context.Service<
  DataLayer,
  {
    readonly state: SubscriptionRef.SubscriptionRef<State.State>
    readonly status: SubscriptionRef.SubscriptionRef<DataStatus>
    readonly deviceId: string
    /** Accepts an edit. The local adapter persists it before returning. */
    readonly record: (change: Operation.Change) => Effect.Effect<void>
    readonly recordBatch?: RecordBatch
    readonly sync: Effect.Effect<void, Offline>
    readonly runInBackground: Effect.Effect<never>
    readonly entryEpisodes: (
      ids: ReadonlyArray<string>
    ) => Effect.Effect<Map<string, EpisodeSummary>, unknown>
    readonly subscriptions: Effect.Effect<ReadonlyArray<SubscriptionSummary>, unknown>
    readonly subscription: (id: string) => Effect.Effect<SubscriptionDetail | null, unknown>
    readonly viewEpisodes: (id: string) => Effect.Effect<ReadonlyArray<ViewEpisode>, unknown>
    readonly filterEpisodes: (
      input: ViewQuery.ViewQueryInput
    ) => Effect.Effect<ReadonlyArray<ViewEpisode>, unknown>
    readonly episodePage?: (
      source: string | ViewQuery.ViewQueryInput,
      offset: number,
      limit: number
    ) => Effect.Effect<
      { readonly items: ReadonlyArray<ViewEpisode>; readonly total: number },
      unknown
    >
    readonly viewCounts: Effect.Effect<Map<string, number>, unknown>
    readonly episodeDetail: (id: string) => Effect.Effect<EpisodeDetail | null, unknown>
    readonly statsCatalogue: Effect.Effect<StatsCatalogue, unknown>
    readonly hasLibraryEpisode?: (id: string) => Effect.Effect<boolean, unknown>
    readonly episodeTitle: (id: string) => Effect.Effect<string | undefined, unknown>
    readonly playbackEpisode: (id: string) => Effect.Effect<PlaybackEpisode>
    /** Resolve Chapters without delaying the initial player load. */
    readonly chapters: (id: string) => Effect.Effect<ReadonlyArray<Library.Chapter>, Offline>
  }
>()("@podlist/web/DataLayer") {}
