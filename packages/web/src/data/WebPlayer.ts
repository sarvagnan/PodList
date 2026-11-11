import { Effect, Layer } from "effect"
import { Player } from "../platform/Player.ts"

/** Play only claims this browser profile, never another Device. Pausing the peer
 * uses the normal player event path, which flushes Position and Listening. */
export const webPlayerLayer = Layer.effect(
  Player,
  Effect.gen(function* () {
    const player = yield* Player
    const channel = yield* Effect.acquireRelease(
      Effect.sync(() => new BroadcastChannel("podlist:web-playback")),
      (channel) => Effect.sync(() => channel.close())
    )
    channel.onmessage = (event) => {
      if (event.data === "play") Effect.runFork(player.pause)
    }
    return Player.of({
      ...player,
      play: player.play.pipe(Effect.tap(() => Effect.sync(() => channel.postMessage("play"))))
    })
  })
).pipe(Layer.provide(Player.layerWeb))
