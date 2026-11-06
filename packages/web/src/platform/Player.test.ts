import { describe, expect, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { Player } from "./Player.ts"

/** A short silent WAV, so playback works without network or real media. */
const silentWav = (seconds: number) => {
  const rate = 8000
  const samples = Math.floor(rate * seconds)
  const buffer = new ArrayBuffer(44 + samples)
  const view = new DataView(buffer)
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i))
  }
  text(0, "RIFF")
  view.setUint32(4, 36 + samples, true)
  text(8, "WAVEfmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  text(36, "data")
  view.setUint32(40, samples, true)
  new Uint8Array(buffer, 44).fill(128)
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }))
}

describe("Player (<audio> + Media Session)", () => {
  it.effect("plays a track from its start Position through to the end", () =>
    Effect.gen(function* () {
      const player = yield* Player
      yield* player.load({
        url: silentWav(1.5),
        title: "t",
        podcast: "p",
        artworkUrl: null,
        startAt: 1
      })
      yield* player.play
      const seen = yield* player.events.pipe(
        Stream.takeUntil((e) => e._tag === "Ended"),
        Stream.runCollect,
        Effect.timeout("5 seconds")
      )
      const tags = seen.map((e) => e._tag)
      expect(tags).toContain("Playing")
      expect(tags.at(-1)).toBe("Ended")
      const first = seen.find((e) => e._tag === "Position")
      expect(first?._tag === "Position" && first.seconds >= 1).toBe(true)
      expect(navigator.mediaSession.metadata?.title).toBe("t")
    }).pipe(Effect.provide(Player.layerWeb))
  )
})
