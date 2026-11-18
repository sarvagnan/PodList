import * as Operation from "./Operation.ts"

/** Every wire or reducer change increments this version (ADR 0014). */
export const version = 7
export const legacyVersion = 4
export const versionHeader = "x-podlist-protocol-version"
export const websiteUrlsVersion = 6
export const referencedSubscriptionsVersion = 7

export const readerVersion = (declared: string | undefined): number => {
  if (declared === undefined) return legacyVersion
  const value = Number(declared)
  return Number.isSafeInteger(value) && value >= 1 ? value : 0
}

/** Frozen version boundaries, reconstructed from the version-bump commits. */
export const versions = [
  {
    version: 1,
    operations: [
      "AddEntry",
      "MoveEntry",
      "RemoveEntry",
      "SetCursor",
      "ReportPosition",
      "MarkPlayed",
      "MarkUnplayed",
      "MarkSubscriptionPlayed",
      "SetStar",
      "CreatePlaylist",
      "RenamePlaylist",
      "SetClearOnPlayed",
      "DeletePlaylist",
      "SetActivePlaylist",
      "Rewind",
      "SaveView",
      "DeleteView",
      "SetDownloadRule",
      "SetPlaybackSettings",
      "SetSubscriptionOverrides"
    ],
    added: "Initial Operation schema and conformance vectors"
  },
  {
    version: 2,
    operations: [
      "AddEntry",
      "MoveEntry",
      "RemoveEntry",
      "SetCursor",
      "ReportPosition",
      "MarkPlayed",
      "MarkUnplayed",
      "MarkSubscriptionPlayed",
      "SetStar",
      "CreatePlaylist",
      "RenamePlaylist",
      "SetClearOnPlayed",
      "DeletePlaylist",
      "RestorePlaylist",
      "SetTrashDays",
      "SetActivePlaylist",
      "Rewind",
      "SaveView",
      "DeleteView",
      "SetDownloadRule",
      "SetPlaybackSettings",
      "SetSubscriptionOverrides"
    ],
    added: "Trash, RestorePlaylist and SetTrashDays"
  },
  {
    version: 3,
    operations: [
      "AddEntry",
      "MoveEntry",
      "RemoveEntry",
      "SetCursor",
      "ReportPosition",
      "MarkPlayed",
      "MarkUnplayed",
      "MarkSubscriptionPlayed",
      "SetStar",
      "CreatePlaylist",
      "RenamePlaylist",
      "SetClearOnPlayed",
      "DeletePlaylist",
      "RestorePlaylist",
      "SetTrashDays",
      "SetActivePlaylist",
      "Rewind",
      "SaveView",
      "DeleteView",
      "SetDownloadRule",
      "SetPlaybackSettings",
      "SetSubscriptionOverrides"
    ],
    added: "Deliberate Timeline edits in State"
  },
  {
    version: 4,
    operations: [
      "AddEntry",
      "MoveEntry",
      "RemoveEntry",
      "SetCursor",
      "ReportPosition",
      "RecordListening",
      "MarkPlayed",
      "MarkUnplayed",
      "MarkSubscriptionPlayed",
      "SetStar",
      "CreatePlaylist",
      "RenamePlaylist",
      "SetClearOnPlayed",
      "DeletePlaylist",
      "RestorePlaylist",
      "SetTrashDays",
      "SetActivePlaylist",
      "Rewind",
      "SaveView",
      "DeleteView",
      "SetDownloadRule",
      "SetPlaybackSettings",
      "SetSubscriptionOverrides"
    ],
    added: "Permanent listening log and RecordListening; frozen deployed v4 baseline"
  },
  {
    version: 5,
    operations: [
      "AddEntry",
      "MoveEntry",
      "RemoveEntry",
      "SetCursor",
      "ReportPosition",
      "RecordListening",
      "MarkPlayed",
      "MarkUnplayed",
      "MarkSubscriptionPlayed",
      "SetStar",
      "CreatePlaylist",
      "RenamePlaylist",
      "SetClearOnPlayed",
      "DeletePlaylist",
      "RestorePlaylist",
      "PurgePlaylist",
      "SetTrashDays",
      "SetActivePlaylist",
      "Rewind",
      "SaveView",
      "DeleteView",
      "SetDownloadRule",
      "SetPlaybackSettings",
      "SetSubscriptionOverrides"
    ],
    added: "PurgePlaylist; version negotiation and typed sync refusals"
  },
  {
    version: 6,
    operations: [
      "AddEntry",
      "MoveEntry",
      "RemoveEntry",
      "SetCursor",
      "ReportPosition",
      "RecordListening",
      "MarkPlayed",
      "MarkUnplayed",
      "MarkSubscriptionPlayed",
      "SetStar",
      "CreatePlaylist",
      "RenamePlaylist",
      "SetClearOnPlayed",
      "DeletePlaylist",
      "RestorePlaylist",
      "PurgePlaylist",
      "SetTrashDays",
      "SetActivePlaylist",
      "Rewind",
      "SaveView",
      "DeleteView",
      "SetDownloadRule",
      "SetPlaybackSettings",
      "SetSubscriptionOverrides"
    ],
    added: "Podcast and Episode website links in Library and feed preview responses"
  },
  {
    version: 7,
    operations: [
      "AddEntry",
      "MoveEntry",
      "RemoveEntry",
      "SetCursor",
      "ReportPosition",
      "RecordListening",
      "MarkPlayed",
      "MarkUnplayed",
      "MarkSubscriptionPlayed",
      "SetStar",
      "CreatePlaylist",
      "RenamePlaylist",
      "SetClearOnPlayed",
      "DeletePlaylist",
      "RestorePlaylist",
      "PurgePlaylist",
      "SetTrashDays",
      "SetActivePlaylist",
      "Rewind",
      "SaveView",
      "DeleteView",
      "SetDownloadRule",
      "SetPlaybackSettings",
      "SetSubscriptionOverrides"
    ],
    added: "Library change pages include the Subscriptions their Episodes reference"
  }
] as const

export const supportedOperations = versions.at(-1)?.operations ?? []
export const minimumVersion = (operation: string): number | undefined =>
  versions.find((v) => (v.operations as readonly string[]).includes(operation))?.version
export const requiredVersion = (operations: readonly string[]): number =>
  Math.max(legacyVersion, ...operations.map((name) => minimumVersion(name) ?? version + 1))

/** Inspect discriminators before decoding a batch from an older server. Never skip one. */
export const unknownOperations = (operations: readonly unknown[]): string[] =>
  [
    ...new Set(
      operations.flatMap((operation) => {
        if (typeof operation !== "object" || operation === null || !("change" in operation))
          return []
        const change = operation.change
        if (
          typeof change !== "object" ||
          change === null ||
          !("_tag" in change) ||
          typeof change._tag !== "string"
        )
          return []
        return minimumVersion(change._tag) === undefined ? [change._tag] : []
      })
    )
  ].sort()

/** Completeness is verified against the actual Change schema in protocol tests. */
export const schemaOperations = () =>
  Operation.Change.members.map((member) => {
    const ast = member.fields._tag.ast
    if (ast._tag !== "Literal") throw new Error("Expected operation discriminator")
    return String(ast.literal)
  })
