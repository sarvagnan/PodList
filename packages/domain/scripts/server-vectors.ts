import { Schema } from "effect"
import { Operation, Protocol, State } from "../src/index.ts"
import { initialState } from "./protocol.ts"
import { buildViewVectors } from "./view-vectors.ts"

const add = (episodeId: string) => ({
  _tag: "AddEntry",
  playlistId: "default",
  episodeId,
  placement: "last"
})
const mark = (episodeId: string) => ({ _tag: "MarkPlayed", episodeId, source: { _tag: "User" } })
const all = { _tag: "MarkSubscriptionPlayed", subscriptionId: "sci" }
const override = (
  subscriptionId: string,
  playbackSettings: object,
  playedThreshold: number | null
) => ({ _tag: "SetSubscriptionOverrides", subscriptionId, playbackSettings, playedThreshold })
interface Batch {
  readonly changes: ReadonlyArray<object>
  /** Server-authored MarkPlayed expansions, keyed by the input's index. */
  readonly expansions?: Readonly<Record<number, ReadonlyArray<string>>>
  readonly retry?: boolean
}
const scenarios: Array<{ name: string; description: string; batches: Array<Batch> }> = [
  {
    name: "subscription-played-and-retry",
    description:
      "Only currently Unplayed Episodes in the Subscription are marked by hand; Entries clear; retry adds no operations; missing Subscription has no Episode effects.",
    batches: [
      { changes: [add("a"), add("c"), mark("c")] },
      { changes: [all], expansions: { 0: ["a"] } },
      { changes: [], retry: true },
      { changes: [{ ...all, subscriptionId: "missing" }] }
    ]
  },
  {
    name: "unplayed-before-subscription-played",
    description:
      "Server expansion observes earlier changes in the same push: Unplayed then mark Subscription Played marks that Episode again.",
    batches: [
      { changes: [mark("a")] },
      { changes: [{ _tag: "MarkUnplayed", episodeId: "a" }, all], expansions: { 1: ["c", "a"] } }
    ]
  },
  {
    name: "played-before-subscription-played",
    description:
      "An Episode marked Played earlier in the same push is excluded from the Subscription expansion; expansion is ordered by Published ascending.",
    batches: [{ changes: [mark("c"), all], expansions: { 1: ["a"] } }]
  },
  {
    name: "subscription-overrides-replace",
    description:
      "Overrides replace the whole override document, not individual keys; null threshold restores the default. Missing Subscription is a logged no-op. These operations never change shared State.",
    batches: [
      { changes: [override("sci", { speed: 2, volumeBoost: true }, 10)] },
      {
        changes: [
          override("sci", {}, null),
          override("tech", { speed: 0.5 }, 0),
          override("missing", { skipIntro: 20 }, 5)
        ]
      }
    ]
  }
]

export const buildServerVectors = () =>
  scenarios.map((scenario) => {
    const library = buildViewVectors()
    const subscriptions = library.subscriptions.filter((s) => s.id !== "gone")
    const episodes = library.episodes.filter((e) => ["a", "b", "c"].includes(e.id))
    let state = initialState()
    // JSON round-trip removes Schema class prototypes for portable fixture documents.
    let expectedSubscriptions = JSON.parse(JSON.stringify(subscriptions)) as Array<{
      id: string
      playbackSettings: object
      playedThreshold: number | null
    }>
    const logged: Array<Operation.Operation> = []
    let sequence = 0
    let previous: Array<Operation.Operation> = []
    const batches = scenario.batches.map((batch) => {
      const operations = batch.retry
        ? previous
        : batch.changes.map((change) =>
            Schema.decodeUnknownSync(Operation.Operation)({
              id: `${scenario.name}-${sequence}`,
              deviceId: "phone",
              sequence: sequence++,
              recordedAt: 1000 + sequence,
              change
            })
          )
      previous = operations
      const expanded = batch.retry
        ? []
        : operations.flatMap((operation, index) => [
            operation,
            ...(batch.expansions?.[index] ?? []).map((episodeId) =>
              Schema.decodeUnknownSync(Operation.Operation)({
                ...Schema.encodeSync(Operation.Operation)(operation),
                id: `${operation.id}:${episodeId}`,
                change: mark(episodeId)
              })
            )
          ])
      state = State.applyOperations(state, expanded).state
      for (const operation of expanded) {
        if (operation.change._tag !== "SetSubscriptionOverrides") continue
        const change = operation.change
        expectedSubscriptions = expectedSubscriptions.map((s) =>
          s.id === change.subscriptionId
            ? {
                ...s,
                playbackSettings: change.playbackSettings,
                playedThreshold: change.playedThreshold
              }
            : s
        )
      }
      logged.push(...expanded)
      return {
        operations: operations.map((o) => Schema.encodeSync(Operation.Operation)(o)),
        expectedAccepted: batch.retry ? 0 : operations.length,
        expectedCursor: logged.length,
        expectedOperations: logged.map((o) => Schema.encodeSync(Operation.Operation)(o)),
        expectedState: Schema.encodeSync(State.State)(state),
        expectedSubscriptions: JSON.parse(JSON.stringify(expectedSubscriptions))
      }
    })
    return {
      name: scenario.name,
      description: scenario.description,
      protocolVersion: Protocol.version,
      subscriptions,
      episodes,
      initial: Schema.encodeSync(State.State)(initialState()),
      batches
    }
  })
