import { Schema } from "effect"
import { DownloadRule } from "./Device.ts"
import { DeviceId, EpisodeId, OperationId, PlaylistId, SubscriptionId, ViewId } from "./Ids.ts"
import { PlayedSource } from "./Library.ts"
import { PlaybackSettings, PlaybackSettingsOverride } from "./PlaybackSettings.ts"
import { EpochMillis, PositiveInt, Seconds } from "./Units.ts"
import { View } from "./View.ts"

// Each operation states an intention ("put this Episode next"), not a resulting
// snapshot, so concurrent edits from several Devices merge instead of overwriting
// each other (ADR 0003). Operations whose target no longer exists are dropped.

/** Play Now / Play Next / Play Last. If the Episode is already an Entry it is moved. */
export const AddEntry = Schema.TaggedStruct("AddEntry", {
  playlistId: PlaylistId,
  episodeId: EpisodeId,
  placement: Schema.Literals(["now", "next", "last"])
})

/** Reorder: place the Entry directly after another Entry, or first when `after` is null. */
export const MoveEntry = Schema.TaggedStruct("MoveEntry", {
  playlistId: PlaylistId,
  episodeId: EpisodeId,
  after: Schema.NullOr(EpisodeId)
})

export const RemoveEntry = Schema.TaggedStruct("RemoveEntry", {
  playlistId: PlaylistId,
  episodeId: EpisodeId
})

export const SetCursor = Schema.TaggedStruct("SetCursor", {
  playlistId: PlaylistId,
  episodeId: Schema.NullOr(EpisodeId)
})

/** Where playback of an Entry got to. Conflicts resolve to the latest `listenedAt`. */
export const ReportPosition = Schema.TaggedStruct("ReportPosition", {
  playlistId: PlaylistId,
  episodeId: EpisodeId,
  position: Seconds,
  listenedAt: EpochMillis
})

export const MarkPlayed = Schema.TaggedStruct("MarkPlayed", {
  episodeId: EpisodeId,
  source: PlayedSource
})

export const MarkUnplayed = Schema.TaggedStruct("MarkUnplayed", { episodeId: EpisodeId })

/** Mark a Subscription's whole Back Catalogue Played (Q45). */
export const MarkSubscriptionPlayed = Schema.TaggedStruct("MarkSubscriptionPlayed", {
  subscriptionId: SubscriptionId
})

export const SetStar = Schema.TaggedStruct("SetStar", {
  episodeId: EpisodeId,
  starred: Schema.Boolean
})

export const CreatePlaylist = Schema.TaggedStruct("CreatePlaylist", {
  playlistId: PlaylistId,
  name: Schema.NonEmptyString,
  clearOnPlayed: Schema.Boolean
})

export const RenamePlaylist = Schema.TaggedStruct("RenamePlaylist", {
  playlistId: PlaylistId,
  name: Schema.NonEmptyString
})

export const SetClearOnPlayed = Schema.TaggedStruct("SetClearOnPlayed", {
  playlistId: PlaylistId,
  clearOnPlayed: Schema.Boolean
})

/** Moves the Playlist, with its History and Listening Timeline, to the Trash. */
export const DeletePlaylist = Schema.TaggedStruct("DeletePlaylist", { playlistId: PlaylistId })

/** Brings a Playlist back from the Trash while it is still kept there. */
export const RestorePlaylist = Schema.TaggedStruct("RestorePlaylist", { playlistId: PlaylistId })

/** How many days the Trash keeps a deleted Playlist (30 unless set). */
export const SetTrashDays = Schema.TaggedStruct("SetTrashDays", { days: PositiveInt })

export const SetActivePlaylist = Schema.TaggedStruct("SetActivePlaylist", {
  playlistId: PlaylistId
})

/** Undo what playback did in this Playlist since `to`; deliberate edits survive (ADR 0006). */
export const Rewind = Schema.TaggedStruct("Rewind", {
  playlistId: PlaylistId,
  to: EpochMillis
})

export const SaveView = Schema.TaggedStruct("SaveView", { view: View })

export const DeleteView = Schema.TaggedStruct("DeleteView", { viewId: ViewId })

export const SetDownloadRule = Schema.TaggedStruct("SetDownloadRule", { rule: DownloadRule })

export const SetPlaybackSettings = Schema.TaggedStruct("SetPlaybackSettings", {
  settings: PlaybackSettings
})

/** Per-Subscription overrides: Playback Settings and the Played threshold. */
export const SetSubscriptionOverrides = Schema.TaggedStruct("SetSubscriptionOverrides", {
  subscriptionId: SubscriptionId,
  playbackSettings: PlaybackSettingsOverride,
  playedThreshold: Schema.NullOr(Seconds)
})

export const Change = Schema.Union([
  AddEntry,
  MoveEntry,
  RemoveEntry,
  SetCursor,
  ReportPosition,
  MarkPlayed,
  MarkUnplayed,
  MarkSubscriptionPlayed,
  SetStar,
  CreatePlaylist,
  RenamePlaylist,
  SetClearOnPlayed,
  DeletePlaylist,
  RestorePlaylist,
  SetTrashDays,
  SetActivePlaylist,
  Rewind,
  SaveView,
  DeleteView,
  SetDownloadRule,
  SetPlaybackSettings,
  SetSubscriptionOverrides
])
export type Change = typeof Change.Type

/**
 * One recorded change, as queued on a Device and replayed on the server. `sequence`
 * orders a Device's own operations; `recordedAt` is that Device's clock.
 */
export class Operation extends Schema.Class<Operation>("@podlist/domain/Operation")({
  id: OperationId,
  deviceId: DeviceId,
  sequence: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
  recordedAt: EpochMillis,
  change: Change
}) {}
