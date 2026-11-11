import Foundation

public enum Change: Codable, Equatable, Sendable {
    case addEntry(playlistId: String, episodeId: String, placement: Placement)
    case moveEntry(playlistId: String, episodeId: String, after: String?)
    case removeEntry(playlistId: String, episodeId: String)
    case setCursor(playlistId: String, episodeId: String?)
    case reportPosition(playlistId: String, episodeId: String, position: Double, listenedAt: Int64, listening: [ListeningAmount]? = nil)
    case recordListening(amounts: [ListeningAmount])
    case markPlayed(episodeId: String, source: PlayedSource)
    case markUnplayed(episodeId: String)
    case markSubscriptionPlayed(subscriptionId: String)
    case setStar(episodeId: String, starred: Bool)
    case createPlaylist(playlistId: String, name: String, clearOnPlayed: Bool)
    case renamePlaylist(playlistId: String, name: String)
    case setClearOnPlayed(playlistId: String, clearOnPlayed: Bool)
    case deletePlaylist(playlistId: String)
    case restorePlaylist(playlistId: String)
    case setTrashDays(days: Int64)
    case setActivePlaylist(playlistId: String)
    case rewind(playlistId: String, to: Int64)
    case saveView(view: View)
    case deleteView(viewId: String)
    case setDownloadRule(rule: DownloadRule)
    case setPlaybackSettings(settings: PlaybackSettings)
    case setSubscriptionOverrides(subscriptionId: String, playbackSettings: PlaybackSettingsOverride, playedThreshold: Double?)

    private enum CodingKeys: String, CodingKey {
        case _tag, playlistId, episodeId, placement, after, position, listenedAt, listening, amounts, source, subscriptionId, starred, name, clearOnPlayed, days, to, view, viewId, rule, settings, playbackSettings, playedThreshold
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: ._tag) {
        case "AddEntry": self = .addEntry(playlistId: try c.decode(String.self, forKey: .playlistId), episodeId: try c.decode(String.self, forKey: .episodeId), placement: try c.decode(Placement.self, forKey: .placement))
        case "MoveEntry": self = .moveEntry(playlistId: try c.decode(String.self, forKey: .playlistId), episodeId: try c.decode(String.self, forKey: .episodeId), after: try c.decode(String?.self, forKey: .after))
        case "RemoveEntry": self = .removeEntry(playlistId: try c.decode(String.self, forKey: .playlistId), episodeId: try c.decode(String.self, forKey: .episodeId))
        case "SetCursor": self = .setCursor(playlistId: try c.decode(String.self, forKey: .playlistId), episodeId: try c.decode(String?.self, forKey: .episodeId))
        case "ReportPosition": self = .reportPosition(playlistId: try c.decode(String.self, forKey: .playlistId), episodeId: try c.decode(String.self, forKey: .episodeId), position: try c.decode(Double.self, forKey: .position), listenedAt: try c.decode(Int64.self, forKey: .listenedAt), listening: try c.decodeIfPresent([ListeningAmount].self, forKey: .listening))
        case "RecordListening": self = .recordListening(amounts: try c.decode([ListeningAmount].self, forKey: .amounts))
        case "MarkPlayed": self = .markPlayed(episodeId: try c.decode(String.self, forKey: .episodeId), source: try c.decode(PlayedSource.self, forKey: .source))
        case "MarkUnplayed": self = .markUnplayed(episodeId: try c.decode(String.self, forKey: .episodeId))
        case "MarkSubscriptionPlayed": self = .markSubscriptionPlayed(subscriptionId: try c.decode(String.self, forKey: .subscriptionId))
        case "SetStar": self = .setStar(episodeId: try c.decode(String.self, forKey: .episodeId), starred: try c.decode(Bool.self, forKey: .starred))
        case "CreatePlaylist": self = .createPlaylist(playlistId: try c.decode(String.self, forKey: .playlistId), name: try c.decode(String.self, forKey: .name), clearOnPlayed: try c.decode(Bool.self, forKey: .clearOnPlayed))
        case "RenamePlaylist": self = .renamePlaylist(playlistId: try c.decode(String.self, forKey: .playlistId), name: try c.decode(String.self, forKey: .name))
        case "SetClearOnPlayed": self = .setClearOnPlayed(playlistId: try c.decode(String.self, forKey: .playlistId), clearOnPlayed: try c.decode(Bool.self, forKey: .clearOnPlayed))
        case "DeletePlaylist": self = .deletePlaylist(playlistId: try c.decode(String.self, forKey: .playlistId))
        case "RestorePlaylist": self = .restorePlaylist(playlistId: try c.decode(String.self, forKey: .playlistId))
        case "SetTrashDays": self = .setTrashDays(days: try c.decode(Int64.self, forKey: .days))
        case "SetActivePlaylist": self = .setActivePlaylist(playlistId: try c.decode(String.self, forKey: .playlistId))
        case "Rewind": self = .rewind(playlistId: try c.decode(String.self, forKey: .playlistId), to: try c.decode(Int64.self, forKey: .to))
        case "SaveView": self = .saveView(view: try c.decode(View.self, forKey: .view))
        case "DeleteView": self = .deleteView(viewId: try c.decode(String.self, forKey: .viewId))
        case "SetDownloadRule": self = .setDownloadRule(rule: try c.decode(DownloadRule.self, forKey: .rule))
        case "SetPlaybackSettings": self = .setPlaybackSettings(settings: try c.decode(PlaybackSettings.self, forKey: .settings))
        case "SetSubscriptionOverrides": self = .setSubscriptionOverrides(subscriptionId: try c.decode(String.self, forKey: .subscriptionId), playbackSettings: try c.decode(PlaybackSettingsOverride.self, forKey: .playbackSettings), playedThreshold: try c.decode(Double?.self, forKey: .playedThreshold))
        default: throw DecodingError.dataCorruptedError(forKey: ._tag, in: c, debugDescription: "Unknown Change tag")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .addEntry(playlistId, episodeId, placement):
            try c.encode("AddEntry", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(episodeId, forKey: .episodeId)
            try c.encode(placement, forKey: .placement)
        case let .moveEntry(playlistId, episodeId, after):
            try c.encode("MoveEntry", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(episodeId, forKey: .episodeId)
            try c.encode(after, forKey: .after)
        case let .removeEntry(playlistId, episodeId):
            try c.encode("RemoveEntry", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(episodeId, forKey: .episodeId)
        case let .setCursor(playlistId, episodeId):
            try c.encode("SetCursor", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(episodeId, forKey: .episodeId)
        case let .reportPosition(playlistId, episodeId, position, listenedAt, listening):
            try c.encode("ReportPosition", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(episodeId, forKey: .episodeId)
            try c.encode(position, forKey: .position)
            try c.encode(listenedAt, forKey: .listenedAt)
            try c.encodeIfPresent(listening, forKey: .listening)
        case let .recordListening(amounts):
            try c.encode("RecordListening", forKey: ._tag)
            try c.encode(amounts, forKey: .amounts)
        case let .markPlayed(episodeId, source):
            try c.encode("MarkPlayed", forKey: ._tag)
            try c.encode(episodeId, forKey: .episodeId)
            try c.encode(source, forKey: .source)
        case let .markUnplayed(episodeId):
            try c.encode("MarkUnplayed", forKey: ._tag)
            try c.encode(episodeId, forKey: .episodeId)
        case let .markSubscriptionPlayed(subscriptionId):
            try c.encode("MarkSubscriptionPlayed", forKey: ._tag)
            try c.encode(subscriptionId, forKey: .subscriptionId)
        case let .setStar(episodeId, starred):
            try c.encode("SetStar", forKey: ._tag)
            try c.encode(episodeId, forKey: .episodeId)
            try c.encode(starred, forKey: .starred)
        case let .createPlaylist(playlistId, name, clearOnPlayed):
            try c.encode("CreatePlaylist", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(name, forKey: .name)
            try c.encode(clearOnPlayed, forKey: .clearOnPlayed)
        case let .renamePlaylist(playlistId, name):
            try c.encode("RenamePlaylist", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(name, forKey: .name)
        case let .setClearOnPlayed(playlistId, clearOnPlayed):
            try c.encode("SetClearOnPlayed", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(clearOnPlayed, forKey: .clearOnPlayed)
        case let .deletePlaylist(playlistId):
            try c.encode("DeletePlaylist", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
        case let .restorePlaylist(playlistId):
            try c.encode("RestorePlaylist", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
        case let .setTrashDays(days):
            try c.encode("SetTrashDays", forKey: ._tag)
            try c.encode(days, forKey: .days)
        case let .setActivePlaylist(playlistId):
            try c.encode("SetActivePlaylist", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
        case let .rewind(playlistId, to):
            try c.encode("Rewind", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
            try c.encode(to, forKey: .to)
        case let .saveView(view):
            try c.encode("SaveView", forKey: ._tag)
            try c.encode(view, forKey: .view)
        case let .deleteView(viewId):
            try c.encode("DeleteView", forKey: ._tag)
            try c.encode(viewId, forKey: .viewId)
        case let .setDownloadRule(rule):
            try c.encode("SetDownloadRule", forKey: ._tag)
            try c.encode(rule, forKey: .rule)
        case let .setPlaybackSettings(settings):
            try c.encode("SetPlaybackSettings", forKey: ._tag)
            try c.encode(settings, forKey: .settings)
        case let .setSubscriptionOverrides(subscriptionId, playbackSettings, playedThreshold):
            try c.encode("SetSubscriptionOverrides", forKey: ._tag)
            try c.encode(subscriptionId, forKey: .subscriptionId)
            try c.encode(playbackSettings, forKey: .playbackSettings)
            try c.encode(playedThreshold, forKey: .playedThreshold)
        }
    }
}
