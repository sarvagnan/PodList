import { describe, expect, it } from "@effect/vitest"
import { Exit, Schema } from "effect"
import { Device, Library, PlaybackSettings, Playlist, View } from "../src/index.ts"

const accepts = <S extends Schema.Top>(schema: S, input: unknown) =>
  Exit.isSuccess(Schema.decodeUnknownExit(schema as never)(input))

const episode = {
  id: "ep-1",
  subscriptionId: "sub-1",
  guid: "urn:x",
  title: "The night the bridge lights went out",
  description: "…",
  published: 1_793_750_400_000,
  duration: 4324,
  audioUrl: "https://example.test/a.mp3",
  artwork: null,
  chapters: [
    { start: 0, title: "Cold open", artwork: { url: "https://example.test/c.jpg" }, url: null }
  ],
  audioUpdatedAt: null
}

describe("Library", () => {
  it("decodes an Episode with Chapters", () => {
    const decoded = Schema.decodeUnknownSync(Library.Episode)(episode)
    expect(decoded.chapters[0]?.artwork?.url).toBe("https://example.test/c.jpg")
  })

  it("rejects a negative duration and a fractional publish time", () => {
    expect(accepts(Library.Episode, { ...episode, duration: -1 })).toBe(false)
    expect(accepts(Library.Episode, { ...episode, published: 1.5 })).toBe(false)
  })

  it("records whether playback or the user made an Episode Played (ADR 0006)", () => {
    const byPlayback = Schema.decodeUnknownSync(Library.EpisodeState)({
      episodeId: "ep-1",
      played: { at: 1, source: { _tag: "Playback", playlistId: "pl-default" } },
      starred: false
    })
    expect(byPlayback.played?.source._tag).toBe("Playback")
    expect(
      accepts(Library.EpisodeState, {
        episodeId: "ep-1",
        played: { at: 1, source: { _tag: "Playback" } },
        starred: false
      })
    ).toBe(false)
  })
})

describe("Playlist", () => {
  const playlist = {
    id: "pl-default",
    name: "Default",
    isDefault: true,
    clearOnPlayed: true,
    entries: [
      { episodeId: "ep-1", position: 1330 },
      { episodeId: "ep-2", position: 0 }
    ],
    cursor: "ep-1"
  }

  it("keeps Position on the Entry (ADR 0001)", () => {
    const decoded = Schema.decodeUnknownSync(Playlist.Playlist)(playlist)
    expect(decoded.entries.map((e) => e.position)).toEqual([1330, 0])
  })

  it("allows a Cursor that has run past the end", () => {
    expect(accepts(Playlist.Playlist, { ...playlist, cursor: null })).toBe(true)
  })

  it("rejects an empty name", () => {
    expect(accepts(Playlist.Playlist, { ...playlist, name: "" })).toBe(false)
  })
})

describe("View", () => {
  const view = {
    id: "v-1",
    name: "New this week",
    filter: { published: { _tag: "LastDays", days: 7 }, played: "unplayed" },
    sort: "publishedDesc",
    limit: 200
  }

  it("decodes a flat AND of conditions", () => {
    expect(accepts(View.View, view)).toBe(true)
    expect(
      accepts(View.View, {
        ...view,
        filter: {
          podcasts: { mode: "include", subscriptionIds: ["sub-1", "sub-2"] },
          text: "AI",
          notInAnyPlaylist: true,
          maxDuration: 1800
        }
      })
    ).toBe(true)
  })

  it("rejects an empty podcast set, zero days and unknown played states", () => {
    expect(
      accepts(View.View, {
        ...view,
        filter: { podcasts: { mode: "include", subscriptionIds: [] } }
      })
    ).toBe(false)
    expect(
      accepts(View.View, { ...view, filter: { published: { _tag: "LastDays", days: 0 } } })
    ).toBe(false)
    expect(accepts(View.View, { ...view, filter: { played: "half" } })).toBe(false)
  })
})

describe("Device and Download Rule", () => {
  it("caps downloads only with a positive count", () => {
    const rule = { subscriptionId: "sub-1", deviceId: "phone", mode: "allNew", keepAtMost: 5 }
    expect(accepts(Device.DownloadRule, rule)).toBe(true)
    expect(accepts(Device.DownloadRule, { ...rule, keepAtMost: 0 })).toBe(false)
    expect(accepts(Device.DownloadRule, { ...rule, mode: "sometimes" })).toBe(false)
  })
})

describe("Playback Settings", () => {
  it("bounds speed and lets a Subscription override only some keys", () => {
    const settings = { speed: 1.2, skipIntro: 0, skipOutro: 0, volumeBoost: false }
    expect(accepts(PlaybackSettings.PlaybackSettings, settings)).toBe(true)
    expect(accepts(PlaybackSettings.PlaybackSettings, { ...settings, speed: 4 })).toBe(false)
    expect(accepts(PlaybackSettings.PlaybackSettingsOverride, { speed: 1.5 })).toBe(true)
    expect(accepts(PlaybackSettings.PlaybackSettingsOverride, {})).toBe(true)
  })
})
