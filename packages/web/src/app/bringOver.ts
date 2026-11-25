import { Effect, Semaphore } from "effect"
import { Atom } from "effect/reactivity"
import type { BringOverPresentation, BringOverProgress } from "../library/BringOverClient.ts"
import { LibraryClient } from "../library/LibraryClient.ts"
import { runtime } from "./runtime.ts"

type Offer = Extract<BringOverPresentation, { kind: "offer" }> & {
  readonly open: boolean
  readonly address: string
}
type Status =
  | { readonly kind: "idle" | "unavailable" | "complete" }
  | Offer
  | { readonly kind: "pending"; readonly progress: BringOverProgress }
  | { readonly kind: "error"; readonly message: string }

const failedProgress: BringOverProgress = { feeds: 0, downloads: 0 }
export const bringOverStatusAtom = Atom.make<Status>({ kind: "idle" }).pipe(Atom.keepAlive)
const commands = Semaphore.makeUnsafe(1)

export const bringOverCommandAtom = runtime
  .fn(
    (command: "inspect" | "show" | "decline" | "accept" | "retry", context) =>
      Effect.gen(function* () {
        const { bringOver } = yield* LibraryClient
        const bridge = window.podlistApp?.bringOver
        if (!bringOver || !bridge) return
        const previous = context(bringOverStatusAtom)
        const set = (value: Status) => context.set(bringOverStatusAtom, value)
        const dismissOffer = Effect.promise(() => bridge.dismissOffer().catch(() => undefined))
        const resume = (progress: BringOverProgress) =>
          Effect.gen(function* () {
            set({ kind: "pending", progress })
            yield* bringOver.resume((value) => set({ kind: "pending", progress: value }))
            set({ kind: "complete" })
          })
        if (command === "show" || command === "decline") {
          if (previous.kind === "offer") {
            if (command === "decline") yield* dismissOffer
            set({ ...previous, open: command === "show" })
          }
          return
        }
        if (command === "accept") {
          if (previous.kind !== "offer") return
          yield* bringOver.accept(previous.snapshot)
          yield* dismissOffer
          yield* resume(failedProgress)
          return
        }
        if (
          command === "inspect" &&
          (previous.kind === "offer" ||
            previous.kind === "unavailable" ||
            previous.kind === "complete")
        )
          return
        const found = yield* bringOver.inspect
        if (found.kind === "pending") {
          yield* resume(found.progress)
        } else if (found.kind === "offer") {
          const target = yield* Effect.tryPromise(() => bridge.offer())
          if (target) set({ ...found, address: target.address, open: target.automatic })
        } else set(found)
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() =>
            context.set(bringOverStatusAtom, {
              kind: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Could not bring over the Library. Try again."
            })
          )
        ),
        commands.withPermits(1)
      ),
    { concurrent: true }
  )
  .pipe(Atom.keepAlive)
