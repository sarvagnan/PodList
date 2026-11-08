import type { Scenario } from "./scenarios.ts"

const step = (change: Record<string, unknown>, minute = 0, device = "phone") => ({
  change,
  minute,
  device
})
const add = (episodeId: string, placement = "last", playlistId = "default") =>
  step({ _tag: "AddEntry", episodeId, placement, playlistId })
const report = (position: number, listenedAt: number, device = "phone") =>
  step(
    { _tag: "ReportPosition", playlistId: "default", episodeId: "A", position, listenedAt },
    listenedAt,
    device
  )
const view = (name: string) => ({
  id: "v",
  name,
  filter: { played: "unplayed" },
  sort: "durationAsc",
  limit: 2
})
const rule = (deviceId: string, mode: string) => ({
  subscriptionId: "s",
  deviceId,
  mode,
  keepAtMost: mode === "allNew" ? 3 : null
})

export const contractScenarios: ReadonlyArray<Scenario> = [
  {
    name: "all-new-activation-per-device",
    description:
      "All New keeps its activation time for cap edits, clears it on Stream or Entries, and starts again on re-entry. Arrival order wins over recording time, Devices are independent and duplicate delivery does nothing.",
    changes: [
      step({ _tag: "SetDownloadRule", rule: rule("phone", "allNew") }, 1),
      step(
        { _tag: "SetDownloadRule", rule: { ...rule("phone", "allNew"), keepAtMost: 8 } },
        2,
        "mac"
      ),
      step({ _tag: "SetDownloadRule", rule: rule("mac", "allNew") }, 3),
      step({ _tag: "SetDownloadRule", rule: rule("phone", "never") }, 4),
      step({ _tag: "SetDownloadRule", rule: rule("phone", "allNew") }, 5, "mac"),
      { duplicateOf: 4, change: {} },
      step({ _tag: "SetDownloadRule", rule: rule("phone", "onEntry") }, 6),
      step({ _tag: "SetDownloadRule", rule: rule("phone", "allNew") }, 2),
      step({ _tag: "SetDownloadRule", rule: { ...rule("phone", "allNew"), since: 0 } }, 7)
    ]
  },
  {
    name: "settings-and-views-last-arrival",
    description:
      "View updates replace in place; deletion is idempotent; Download Rules replace only the same Subscription/Device pair; Playback Settings replace wholesale. Arrival order wins, even for older recording times.",
    changes: [
      step({ _tag: "SaveView", view: view("First") }, 5),
      step({ _tag: "SaveView", view: { ...view("Second"), id: "keep" } }),
      step({ _tag: "SaveView", view: view("Older recording arrives last") }, 1, "mac"),
      step({ _tag: "DeleteView", viewId: "v" }),
      step({ _tag: "DeleteView", viewId: "missing" }),
      step({ _tag: "SetDownloadRule", rule: rule("phone", "onEntry") }),
      step({ _tag: "SetDownloadRule", rule: rule("mac", "allNew") }),
      step({ _tag: "SetDownloadRule", rule: rule("phone", "never") }),
      step({
        _tag: "SetPlaybackSettings",
        settings: { speed: 2, skipIntro: 10, skipOutro: 5, volumeBoost: true }
      }),
      step(
        {
          _tag: "SetPlaybackSettings",
          settings: { speed: 0.75, skipIntro: 0, skipOutro: 0, volumeBoost: false }
        },
        0,
        "mac"
      )
    ]
  },
  {
    name: "playlist-and-episode-facts",
    description:
      "Duplicate creation does not replace a Playlist; normal rename succeeds; enabling Clear on Played is not retroactive. Unplayed preserves a Star; removing the last fact removes its record. Missing targets and invalid Cursors do nothing.",
    changes: [
      step({ _tag: "CreatePlaylist", playlistId: "p", name: "Keep", clearOnPlayed: false }),
      step({ _tag: "CreatePlaylist", playlistId: "p", name: "Ignored", clearOnPlayed: true }),
      step({ _tag: "RenamePlaylist", playlistId: "p", name: "Renamed" }),
      add("A", "last", "p"),
      add("B", "last", "p"),
      step({ _tag: "MarkPlayed", episodeId: "A", source: { _tag: "User" } }),
      step({ _tag: "SetClearOnPlayed", playlistId: "p", clearOnPlayed: true }),
      step({ _tag: "SetCursor", playlistId: "p", episodeId: "missing" }),
      step({ _tag: "SetCursor", playlistId: "p", episodeId: null }),
      step({ _tag: "SetCursor", playlistId: "p", episodeId: "B" }),
      step({ _tag: "SetActivePlaylist", playlistId: "p" }),
      step({ _tag: "SetActivePlaylist", playlistId: "missing" }),
      step({ _tag: "SetStar", episodeId: "A", starred: true }),
      step({ _tag: "MarkUnplayed", episodeId: "A" }),
      step({ _tag: "SetStar", episodeId: "B", starred: true }),
      step({ _tag: "SetStar", episodeId: "B", starred: false }),
      step({ _tag: "RenamePlaylist", playlistId: "missing", name: "Ignored" }),
      add("Z", "now", "missing")
    ]
  },
  {
    name: "cursor-and-missing-anchors",
    description:
      "Moving the Cursor Entry with Play Next advances to its former successor; moving a last Cursor with Play Last selects it again. Missing/self reorder anchors do nothing; removing the last Cursor sets null; next add selects itself.",
    changes: [
      add("A"),
      add("B"),
      add("C"),
      add("A", "next"),
      step({ _tag: "MoveEntry", playlistId: "default", episodeId: "A", after: "missing" }),
      step({ _tag: "MoveEntry", playlistId: "default", episodeId: "A", after: "A" }),
      step({ _tag: "SetCursor", playlistId: "default", episodeId: "C" }),
      add("C"),
      step({ _tag: "RemoveEntry", playlistId: "default", episodeId: "C" }),
      add("D", "next")
    ]
  },
  ...[false, true].map(
    (reverse): Scenario => ({
      name: `equal-position-time-${reverse ? "reverse" : "forward"}`,
      description:
        "Equal listenedAt uses the last arrival for Position; Timeline sampling retains the first point. Device id and sequence do not break ties.",
      changes: [
        add("A"),
        ...(reverse ? [report(20, 1, "mac"), report(10, 1)] : [report(10, 1), report(20, 1, "mac")])
      ]
    })
  ),
  {
    name: "stale-listen-still-adds-time",
    description:
      "A stale Position can add Listening log amounts, and an older Timeline point; a retry of that operation adds nothing.",
    changes: [
      add("A"),
      report(200, 5),
      step(
        {
          _tag: "ReportPosition",
          playlistId: "default",
          episodeId: "A",
          position: 100,
          listenedAt: 2,
          listening: [{ day: "2026-11-01", subscriptionId: "s", seconds: 12 }]
        },
        2,
        "mac"
      ),
      { change: {}, duplicateOf: 2 }
    ]
  },
  {
    name: "trash-exact-boundary-and-conflict",
    description:
      "Trash expires strictly after the retention boundary. An active Playlist with the same id blocks restore; missing restore does nothing.",
    changes: [
      step({ _tag: "SetTrashDays", days: 1 }),
      step({ _tag: "CreatePlaylist", playlistId: "p", name: "Original", clearOnPlayed: false }),
      step({ _tag: "DeletePlaylist", playlistId: "p" }),
      step({ _tag: "RestorePlaylist", playlistId: "p" }, 1440),
      step({ _tag: "DeletePlaylist", playlistId: "p" }, 1441),
      step(
        { _tag: "CreatePlaylist", playlistId: "p", name: "Replacement", clearOnPlayed: true },
        1442
      ),
      step({ _tag: "RestorePlaylist", playlistId: "p" }, 1443),
      step({ _tag: "RestorePlaylist", playlistId: "missing" }, 1444)
    ]
  },
  {
    name: "timeline-spacing-and-retention",
    description:
      "Timeline spacing is per Episode and excludes differences below one minute. The 30-day boundary is inclusive; reports older than it must not reintroduce expired points.",
    changes: [
      add("A"),
      report(10, 0),
      report(20, 0.5),
      report(30, 1),
      report(40, 30 * 1440),
      report(50, 30 * 1440 + 1),
      report(5, -1)
    ]
  },
  {
    name: "server-intentions-do-not-change-shared-state",
    description:
      "Library-dependent intentions leave shared State unchanged; see server.json for their authoritative expansion and Library effects.",
    changes: [
      step({ _tag: "MarkSubscriptionPlayed", subscriptionId: "s" }),
      step({
        _tag: "SetSubscriptionOverrides",
        subscriptionId: "s",
        playbackSettings: { speed: 2 },
        playedThreshold: 10
      })
    ]
  }
]
