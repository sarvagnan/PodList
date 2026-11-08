// Conformance scenarios for the sync protocol (ADR 0007). Each becomes a JSON test
// vector: initial State + operations -> expected State. Any client, in any language,
// must reproduce every expected State exactly.
import type { Operation } from "../src/index.ts"

export interface Scenario {
  readonly name: string
  readonly description: string
  /** Operations as JSON, without ids; ids, Devices and times are filled in. */
  readonly changes: ReadonlyArray<{
    readonly change: Operation.Operation["change"] | Record<string, unknown>
    readonly device?: string
    readonly minute?: number
    readonly duplicateOf?: number
  }>
}

const add = (episodeId: string, placement = "last", playlistId = "default") => ({
  change: { _tag: "AddEntry", playlistId, episodeId, placement }
})
const abc = [add("A"), add("B"), add("C")]
const played = (episodeId: string, playlistId: string, minute: number) => ({
  change: { _tag: "MarkPlayed", episodeId, source: { _tag: "Playback", playlistId } },
  minute
})
const report = (episodeId: string, position: number, minute: number, playlistId = "default") => ({
  change: { _tag: "ReportPosition", playlistId, episodeId, position, listenedAt: minute },
  minute
})

export const scenarios: ReadonlyArray<Scenario> = [
  {
    name: "permanent-listening-log",
    description:
      "Daily listening from offline Devices adds once, survives Entry removal, and keeps each Device’s local calendar day.",
    changes: [
      add("A"),
      {
        change: {
          _tag: "ReportPosition",
          playlistId: "default",
          episodeId: "A",
          position: 15,
          listenedAt: 1,
          listening: [{ day: "2026-11-03", subscriptionId: "science", seconds: 15 }]
        }
      },
      { change: { _tag: "RemoveEntry", playlistId: "default", episodeId: "A" } },
      {
        device: "mac",
        change: {
          _tag: "ReportPosition",
          playlistId: "default",
          episodeId: "A",
          position: 10,
          listenedAt: 0,
          listening: [{ day: "2026-11-02", subscriptionId: "science", seconds: 10 }]
        }
      },
      { change: {}, duplicateOf: 1 },
      {
        change: {
          _tag: "RecordListening",
          amounts: [{ day: "2026-11-03", subscriptionId: "science", seconds: 5 }]
        }
      }
    ]
  },
  {
    name: "play-now-next-last",
    description:
      "Play Now goes before the current Entry and starts; Next after it; Last at the end.",
    changes: [...abc, add("X", "now"), add("Y", "next"), add("Z", "last")]
  },
  {
    name: "add-moves-existing-entry",
    description: "Adding an Episode that is already an Entry moves it and keeps its Position.",
    changes: [...abc, report("C", 120, 5), add("C", "next")]
  },
  {
    name: "clear-on-played-everywhere",
    description: "Played in Replay clears it from Default; Replay keeps it at 0:00 and moves on.",
    changes: [
      ...abc,
      {
        change: {
          _tag: "CreatePlaylist",
          playlistId: "replay",
          name: "Replay",
          clearOnPlayed: false
        }
      },
      add("B", "last", "replay"),
      add("C", "last", "replay"),
      played("B", "replay", 30)
    ]
  },
  {
    name: "user-played-adds-no-history",
    description: "Marking Played by hand clears Entries but records no History.",
    changes: [...abc, { change: { _tag: "MarkPlayed", episodeId: "A", source: { _tag: "User" } } }]
  },
  {
    name: "latest-listen-wins",
    description: "Position reports resolve to the most recent listen regardless of arrival order.",
    changes: [...abc, report("A", 600, 20), { ...report("A", 300, 10), device: "mac" }]
  },
  {
    name: "duplicate-operation-applies-once",
    description: "An operation delivered twice takes effect once.",
    changes: [...abc, played("A", "default", 30), { change: {}, duplicateOf: 3 }]
  },
  {
    name: "two-devices-offline",
    description: "Offline reorder on one Device merges with adds and removes from another.",
    changes: [
      ...abc,
      { ...add("D"), device: "mac" },
      { change: { _tag: "RemoveEntry", playlistId: "default", episodeId: "B" }, device: "mac" },
      { change: { _tag: "MoveEntry", playlistId: "default", episodeId: "C", after: null } },
      { change: { _tag: "MoveEntry", playlistId: "default", episodeId: "B", after: "C" } }
    ]
  },
  {
    name: "rewind-after-sleep",
    description: "Rewind undoes playback since the moment and keeps deliberate edits.",
    changes: [
      ...abc,
      add("D"),
      report("A", 100, 0),
      report("A", 400, 5),
      played("A", "default", 30),
      report("B", 30, 31),
      { ...add("X"), minute: 50 },
      { change: { _tag: "MarkPlayed", episodeId: "D", source: { _tag: "User" } }, minute: 55 },
      played("B", "default", 60),
      report("C", 20, 61),
      { change: { _tag: "Rewind", playlistId: "default", to: 6 }, minute: 70 }
    ]
  },
  {
    name: "default-playlist-protected",
    description:
      "Default cannot be renamed or deleted; deleting the Active Playlist makes Default Active.",
    changes: [
      { change: { _tag: "RenamePlaylist", playlistId: "default", name: "Inbox" } },
      { change: { _tag: "DeletePlaylist", playlistId: "default" } },
      { change: { _tag: "CreatePlaylist", playlistId: "r", name: "Replay", clearOnPlayed: false } },
      { change: { _tag: "SetActivePlaylist", playlistId: "r" } },
      { change: { _tag: "DeletePlaylist", playlistId: "r" } }
    ]
  },
  {
    name: "trash-restore-and-expiry",
    description:
      "A deleted Playlist goes to the Trash with its Entries and can be restored; once older than the Trash keeps (here 7 days), it is gone and can't be.",
    changes: [
      { change: { _tag: "CreatePlaylist", playlistId: "r", name: "Replay", clearOnPlayed: false } },
      { change: { _tag: "AddEntry", playlistId: "r", episodeId: "A", placement: "last" } },
      { change: { _tag: "DeletePlaylist", playlistId: "r" }, minute: 1 },
      { change: { _tag: "RestorePlaylist", playlistId: "r" }, minute: 2 },
      { change: { _tag: "SetTrashDays", days: 7 }, minute: 3 },
      { change: { _tag: "DeletePlaylist", playlistId: "r" }, minute: 4 },
      { change: { _tag: "RestorePlaylist", playlistId: "r" }, minute: 4 + 8 * 24 * 60 }
    ]
  }
]
