import Foundation

public enum TimelineRules {
    public static let retentionMillis: Int64 = 30 * 86_400_000
    public static let spacingMillis: Int64 = 60_000
    public static let editLimit = 300

    public static func record(_ playlist: Playlist, episodeId: String, position: Double, at: Int64) -> Playlist {
        let newest = max(at, playlist.timeline.map(\.at).max() ?? at)
        guard at >= newest - retentionMillis,
              !playlist.timeline.contains(where: { $0.episodeId == episodeId && abs(Double($0.at) - Double(at)) < Double(spacingMillis) }) else { return playlist }
        var next = playlist
        next.timeline = (playlist.timeline.filter { $0.at >= newest - retentionMillis } + [TimelinePoint(at: at, episodeId: episodeId, position: position)]).sorted { $0.at < $1.at }
        return next
    }

    public static func pointAt(_ playlist: Playlist, to: Int64) -> TimelinePoint? {
        playlist.timeline.last { $0.at <= to }
    }

    public static func recordEdit(_ playlist: Playlist, kind: String, episodeId: String, at: Int64) -> Playlist {
        var next = playlist
        next.edits = Array(((playlist.edits ?? []) + [PlaylistEdit(at: at, kind: kind, episodeId: episodeId)])
            .filter { $0.at >= at - retentionMillis }.sorted { $0.at < $1.at }.suffix(editLimit))
        return next
    }
}
