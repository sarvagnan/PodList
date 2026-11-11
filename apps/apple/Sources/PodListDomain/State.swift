import Foundation

public struct State: Codable, Equatable, Sendable {
    public var playlists: [Playlist]
    public var activePlaylistId: String
    public var episodeStates: [String: EpisodeState]
    public var views: [View]
    public var downloadRules: [DownloadRule]
    public var playbackSettings: PlaybackSettings
    public var trash: [TrashedPlaylist]?
    public var trashDays: Int64?
    public var listeningLog: ListeningLog?

    public init(playlists: [Playlist], activePlaylistId: String, episodeStates: [String: EpisodeState], views: [View], downloadRules: [DownloadRule], playbackSettings: PlaybackSettings, trash: [TrashedPlaylist]? = nil, trashDays: Int64? = nil, listeningLog: ListeningLog? = nil) {
        self.playlists = playlists
        self.activePlaylistId = activePlaylistId
        self.episodeStates = episodeStates
        self.views = views
        self.downloadRules = downloadRules
        self.playbackSettings = playbackSettings
        self.trash = trash
        self.trashDays = trashDays
        self.listeningLog = listeningLog
    }
}

public let defaultPlaylistId = "default"
public typealias ListeningLog = [String: [String: Double]]

extension State {
    public static func initial(settings: PlaybackSettings = .init(speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: false)) -> State {
        State(playlists: [Playlist(id: defaultPlaylistId, name: "Default", isDefault: true, clearOnPlayed: true,
            entries: [], cursor: nil, history: [], timeline: [])], activePlaylistId: defaultPlaylistId,
            episodeStates: [:], views: [], downloadRules: [], playbackSettings: settings)
    }
}
