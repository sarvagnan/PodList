import { describe, expect, it } from "@effect/vitest"
import { Exit, Schema } from "effect"
import { Operation } from "../src/index.ts"

const decode = Schema.decodeUnknownExit(Operation.Operation)
const envelope = (change: unknown) => ({
  id: "op-1",
  deviceId: "phone",
  sequence: 7,
  recordedAt: 1_793_750_400_000,
  change
})

describe("Operation", () => {
  it("round-trips every change through JSON", () => {
    const changes = [
      { _tag: "AddEntry", playlistId: "pl", episodeId: "ep", placement: "next" },
      { _tag: "MoveEntry", playlistId: "pl", episodeId: "ep", after: null },
      { _tag: "RemoveEntry", playlistId: "pl", episodeId: "ep" },
      { _tag: "SetCursor", playlistId: "pl", episodeId: null },
      { _tag: "ReportPosition", playlistId: "pl", episodeId: "ep", position: 12.5, listenedAt: 5 },
      { _tag: "MarkPlayed", episodeId: "ep", source: { _tag: "Playback", playlistId: "pl" } },
      { _tag: "MarkUnplayed", episodeId: "ep" },
      { _tag: "MarkSubscriptionPlayed", subscriptionId: "sub" },
      { _tag: "SetStar", episodeId: "ep", starred: true },
      { _tag: "CreatePlaylist", playlistId: "pl", name: "Replay", clearOnPlayed: false },
      { _tag: "RenamePlaylist", playlistId: "pl", name: "Re-listen" },
      { _tag: "SetClearOnPlayed", playlistId: "pl", clearOnPlayed: true },
      { _tag: "DeletePlaylist", playlistId: "pl" },
      { _tag: "SetActivePlaylist", playlistId: "pl" },
      { _tag: "Rewind", playlistId: "pl", to: 4 },
      {
        _tag: "SaveView",
        view: {
          id: "v",
          name: "Starred",
          filter: { starred: true },
          sort: "publishedDesc",
          limit: null
        }
      },
      { _tag: "DeleteView", viewId: "v" },
      {
        _tag: "SetDownloadRule",
        rule: { subscriptionId: "sub", deviceId: "phone", mode: "onEntry", keepAtMost: null }
      },
      {
        _tag: "SetPlaybackSettings",
        settings: { speed: 1.2, skipIntro: 0, skipOutro: 0, volumeBoost: false }
      },
      {
        _tag: "SetSubscriptionOverrides",
        subscriptionId: "sub",
        playbackSettings: { speed: 1.5 },
        playedThreshold: 45
      }
    ]
    for (const change of changes) {
      const exit = decode(envelope(change))
      expect(Exit.isSuccess(exit), JSON.stringify(change)).toBe(true)
      if (Exit.isSuccess(exit)) {
        const json = JSON.parse(JSON.stringify(Schema.encodeSync(Operation.Operation)(exit.value)))
        expect(json.change).toEqual(change)
      }
    }
  })

  it("rejects unknown changes, bad placements and negative sequence numbers", () => {
    expect(Exit.isSuccess(decode(envelope({ _tag: "Shuffle", playlistId: "pl" })))).toBe(false)
    expect(
      Exit.isSuccess(
        decode(
          envelope({ _tag: "AddEntry", playlistId: "pl", episodeId: "ep", placement: "middle" })
        )
      )
    ).toBe(false)
    expect(
      Exit.isSuccess(
        decode({ ...envelope({ _tag: "MarkUnplayed", episodeId: "ep" }), sequence: -1 })
      )
    ).toBe(false)
  })
})
