import { Operation } from "@podlist/domain"
import { Effect, Schema, SubscriptionRef } from "effect"
import { Atom } from "effect/reactivity"
import { DataLayer } from "../data/DataLayer.ts"
import {
  changesFor,
  confirmation,
  type EpisodeAction,
  type Outcome,
  undoFor
} from "../lib/episodeActions.ts"
import { nextLastTarget } from "../lib/remembered.ts"
import { Playback } from "../playback/Playback.ts"
import { runtime } from "./runtime.ts"

/** Runs an action from an Episode row; answers with its confirmation and undo. */
export const episodeActionAtom = runtime.fn(
  (action: EpisodeAction) =>
    Effect.gen(function* () {
      const engine = yield* DataLayer
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
          ? confirmation(action, before).replace(/^Plays (next|last)/, (m) =>
              m === "Plays next" ? "Already next" : "Already last"
            )
          : confirmation(action, before)
      // A removal names what went, as a move does (one message form).
      if (action._tag === "Remove" && undo.length > 0) {
        const title = yield* engine
          .episodeTitle(action.episodeId)
          .pipe(Effect.orElseSucceed(() => undefined))
        if (title)
          return {
            message: `Removed “${title}” from ${message.replace(/^Removed from /, "")}`,
            undo
          } satisfies Outcome
      }
      return { message, undo } satisfies Outcome
    }),
  // Actions on different rows must not cancel one another.
  { concurrent: true }
)

/**
 * Runs the same kind of action on several Episodes as one step, with one confirmation
 * and one Undo: each action's undo is worked out from the State just before it, and
 * they are taken back last first.
 */
export const bulkActionAtom = runtime.fn(
  (input: { readonly actions: ReadonlyArray<EpisodeAction>; readonly message: string }) =>
    Effect.gen(function* () {
      const engine = yield* DataLayer
      const undos: Array<ReadonlyArray<Operation.Change>> = []
      for (const action of input.actions) {
        const before = yield* SubscriptionRef.get(engine.state)
        for (const c of changesFor(action, before)) yield* engine.record(c)
        const after = yield* SubscriptionRef.get(engine.state)
        undos.push(undoFor(action, before, after, Date.now()))
      }
      return { message: input.message, undo: undos.reverse().flat() } satisfies Outcome
    }),
  { concurrent: true }
)

/** Records the operations that take an action back. */
export const undoAtom = runtime.fn(
  (changes: ReadonlyArray<Operation.Change>) =>
    Effect.gen(function* () {
      const engine = yield* DataLayer
      for (const c of changes) yield* engine.record(c)
    }),
  // Two undos in quick succession both happen.
  { concurrent: true }
)

/** One step that can be taken back: what it said, and the operations that undo it. */
export interface Undoable extends Outcome {
  readonly id: number
  /** Does the step again, for Redo; answers with the new way to take it back. */
  readonly again: () => Promise<Outcome>
}

/**
 * This session's steps that can be taken back, newest last (DATA-04). Cmd/Ctrl-Z walks
 * it; a toast's Undo takes back its own step wherever it is in the stack.
 */
export const undoStackAtom = Atom.make<ReadonlyArray<Undoable>>([]).pipe(Atom.keepAlive)

/** Steps taken back, newest last; Cmd/Ctrl-Shift-Z does them again. A new step clears it. */
export const redoStackAtom = Atom.make<ReadonlyArray<Undoable>>([]).pipe(Atom.keepAlive)

/** Desktop: the Playlist that Play Next and Play Last go to; the Active one when unset. */
export const nextLastTargetAtom = Atom.make<string | null>(nextLastTarget.get()).pipe(
  Atom.keepAlive
)

/** Creating and filling a Playlist is one user step, including Undo (pod-1jt). */
export const createAndAddAtom = runtime.fn(
  (input: {
    readonly name: string
    readonly episodeIds: ReadonlyArray<string>
    readonly placement: "next" | "last"
  }) =>
    Effect.gen(function* () {
      const engine = yield* DataLayer
      const state = yield* SubscriptionRef.get(engine.state)
      const name = input.name.trim()
      if (!name || state.playlists.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        return {
          message: !name
            ? "A Playlist needs a name."
            : `There’s already a Playlist called “${name}”.`,
          undo: []
        } satisfies Outcome
      }
      const change = Schema.decodeUnknownSync(Operation.Change)
      const playlistId = crypto.randomUUID()
      yield* engine.record(
        change({ _tag: "CreatePlaylist", playlistId, name, clearOnPlayed: false })
      )
      // A new Playlist has no previous Cursor. Both choices keep the View’s order;
      // inserting Next repeatedly would reverse it around the first Entry (pod-1jt).
      for (const episodeId of input.episodeIds) {
        yield* engine.record(change({ _tag: "AddEntry", playlistId, episodeId, placement: "last" }))
      }
      return {
        message: `Created “${name}” with ${input.episodeIds.length} ${input.episodeIds.length === 1 ? "Episode" : "Episodes"}`,
        undo: [change({ _tag: "DeletePlaylist", playlistId })]
      } satisfies Outcome
    }),
  { concurrent: true }
)
