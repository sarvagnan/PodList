import Foundation

public enum PlayedRules {
    public static let defaultPlayedThreshold = 30.0
    public static let historyLimit = 500

    public static func isFinished(position: Double, duration: Double?, threshold: Double?) -> Bool {
        guard let duration else { return false }
        return position >= max(0, duration - (threshold ?? defaultPlayedThreshold))
    }

    public static func onPlayed(_ playlist: Playlist, episodeId: String, finishedHere: Bool, at: Int64) -> Playlist {
        guard let index = playlist.entries.firstIndex(where: { $0.episodeId == episodeId }) else { return playlist }
        var next = playlist
        if finishedHere {
            let following = playlist.entries[safe: index + 1]?.episodeId
            next.history = Array(([HistoryItem(episodeId: episodeId, finishedAt: at, followedBy: .some(following))] + playlist.history).prefix(historyLimit))
            if !playlist.clearOnPlayed {
                next.entries[index].position = 0; next.entries[index].positionAt = at
                if next.cursor == episodeId { next.cursor = following }
            }
        }
        return playlist.clearOnPlayed ? PlaylistRules.removeEntry(next, episodeId: episodeId) : next
    }
}
