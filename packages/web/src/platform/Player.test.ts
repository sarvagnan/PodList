import { describe, expect, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { Player, type PlayerEvent, type Track } from "./Player.ts"

const track: Track = {
  url: "https://host.test/audio.mp3",
  proxyUrl: "/proxy",
  title: "Episode",
  podcast: "Podcast",
  artworkUrl: null,
  startAt: 24
}
const fixture = (fails: (url: string) => boolean) => {
  const elements: HTMLAudioElement[] = []
  const create = () => {
    const audio = document.createElement("audio")
    Object.defineProperty(audio, "src", { value: "", writable: true })
    audio.load = () => {}
    audio.pause = () => {}
    audio.play = async () => {
      if (fails(audio.src)) throw new Error("Host failed")
      audio.dispatchEvent(new Event("playing"))
    }
    elements.push(audio)
    return audio
  }
  return { elements, layer: Player.layerBrowser(create) }
}

describe("Player source fallback", () => {
  it.live(
    "plays directly without a CORS requirement and preserves Position and speed on fallback",
    () => {
      const fake = fixture((url) => url.startsWith("https:"))
      return Effect.gen(function* () {
        const player = yield* Player
        yield* player.load(track)
        expect(fake.elements.at(-1)?.src).toBe(track.url)
        expect(fake.elements.at(-1)?.crossOrigin).toBeNull()
        yield* player.setRate(1.5)
        yield* player.play
        yield* Effect.sleep("10 millis")
        expect(fake.elements.at(-1)?.src).toBe("/proxy")
        expect(fake.elements.at(-1)?.currentTime).toBe(24)
        expect(fake.elements.at(-1)?.playbackRate).toBe(1.5)
      }).pipe(Effect.provide(fake.layer))
    }
  )
  it.live("uses the proxy for boost, then a fresh unconnected element for direct playback", () => {
    const fake = fixture((url) => url === "/proxy")
    return Effect.gen(function* () {
      const player = yield* Player
      const events: PlayerEvent[] = []
      yield* player.events.pipe(
        Stream.runForEach((e) =>
          Effect.sync(() => {
            events.push(e)
          })
        ),
        Effect.forkScoped
      )
      yield* player.load({ ...track, volumeBoost: true })
      const boosted = fake.elements.at(-1)
      expect(boosted?.src).toBe("/proxy")
      expect(boosted?.crossOrigin).toBe("anonymous")
      yield* player.play
      yield* Effect.sleep("10 millis")
      expect(fake.elements.at(-1)).not.toBe(boosted)
      expect(fake.elements.at(-1)?.src).toBe(track.url)
      expect(fake.elements.at(-1)?.crossOrigin).toBeNull()
      expect(events).toContainEqual({
        _tag: "Notice",
        message: "Playing directly without Volume Boost."
      })
      expect(events.some((e) => e._tag === "Failed")).toBe(false)
    }).pipe(Effect.provide(fake.layer))
  })
  it.live("tries each source once and reports a terminal failure", () => {
    const fake = fixture(() => true)
    return Effect.gen(function* () {
      const player = yield* Player
      const events: PlayerEvent[] = []
      yield* player.events.pipe(
        Stream.runForEach((e) =>
          Effect.sync(() => {
            events.push(e)
          })
        ),
        Effect.forkScoped
      )
      yield* player.load(track)
      yield* player.play
      yield* Effect.sleep("10 millis")
      expect(fake.elements.filter((e) => e.src).map((e) => e.src)).toEqual([track.url, "/proxy"])
      expect(events.some((e) => e._tag === "Failed")).toBe(true)
    }).pipe(Effect.provide(fake.layer))
  })
  it.live("keeps a stored download first even when boost is enabled", () => {
    const fake = fixture(() => false)
    return Effect.gen(function* () {
      const player = yield* Player
      yield* player.load({ ...track, url: "blob:download", volumeBoost: true })
      yield* player.play
      expect(fake.elements.at(-1)?.src).toBe("blob:download")
    }).pipe(Effect.provide(fake.layer))
  })
})

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
