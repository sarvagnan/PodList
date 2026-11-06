import type { Operation } from "@podlist/domain"
import { Effect, SubscriptionRef } from "effect"
import { Atom } from "effect/reactivity"
import {
  changesFor,
  confirmation,
  type EpisodeAction,
  type Outcome,
  undoFor
} from "../lib/episodeActions.ts"
import { Playback } from "../playback/Playback.ts"
import { SyncEngine } from "../sync/SyncEngine.ts"
import { runtime } from "./runtime.ts"

/** Runs an action from an Episode row; answers with its confirmation and undo. */
export const episodeActionAtom = runtime.fn((action: EpisodeAction) =>
  Effect.gen(function* () {
    const engine = yield* SyncEngine
    const before = yield* SubscriptionRef.get(engine.state)
    for (const c of changesFor(action, before)) yield* engine.record(c)
    if (action._tag === "PlayNow") {
      const playback = yield* Playback
      yield* playback.playEntry(before.activePlaylistId, action.episodeId)
    }
    const after = yield* SubscriptionRef.get(engine.state)
    const undo = undoFor(action, before, after, Date.now())
    // Adding what was already there changes nothing: say so rather than offer an Undo.
    const message =
      action._tag === "Add" && undo.length === 0
        ? confirmation(action, before).replace(/^(Playing next|Added last)/, (m) =>
            m === "Playing next" ? "Already next" : "Already last"
          )
        : confirmation(action, before)
    return { message, undo } satisfies Outcome
  })
)

/** Records the operations that take an action back. */
export const undoAtom = runtime.fn((changes: ReadonlyArray<Operation.Change>) =>
  Effect.gen(function* () {
    const engine = yield* SyncEngine
    for (const c of changes) yield* engine.record(c)
  })
)

/** Desktop: the Playlist that Play Next and Play Last go to; the Active one when unset. */
export const nextLastTargetAtom = Atom.make<string | null>(null).pipe(Atom.keepAlive)
