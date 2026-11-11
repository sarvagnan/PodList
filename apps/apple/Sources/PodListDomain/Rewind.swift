import Foundation

public enum Rewind {
    public static func apply(_ state: State, playlistId: String, to: Int64, at: Int64) -> State {
        guard let index = state.playlists.firstIndex(where: { $0.id == playlistId }),
              let point = TimelineRules.pointAt(state.playlists[index], to: to) else { return state }
        let playlist = state.playlists[index]
        let finished = Array(playlist.history.filter { $0.finishedAt > to }.reversed())
        var next = state
        for history in finished {
            if let fact = next.episodeStates[history.episodeId], let played = fact.played,
               played.source == .playback(playlistId: playlistId), played.at > to {
                next.setEpisodeFacts(history.episodeId, played: nil, starred: fact.starred)
            }
        }
        var entries = playlist.entries
        func restore(_ episodeId: String, followedBy: String?) {
            guard !entries.contains(where: { $0.episodeId == episodeId }) else { return }
            let anchor = entries.firstIndex { $0.episodeId == followedBy } ?? entries.firstIndex { $0.episodeId == playlist.cursor } ?? entries.count
            entries.insert(Entry(episodeId: episodeId, position: 0, positionAt: at), at: anchor)
        }
        for history in finished.reversed() { restore(history.episodeId, followedBy: history.followedBy ?? nil) }
        restore(point.episodeId, followedBy: nil)
        let movedSince = Set(playlist.timeline.filter { $0.at > to }.map(\.episodeId))
        next.playlists[index].entries = entries.map { entry in
            var result = entry
            if entry.episodeId == point.episodeId { result.position = point.position; result.positionAt = at }
            else if movedSince.contains(entry.episodeId) {
                result.position = playlist.timeline.last { $0.episodeId == entry.episodeId && $0.at <= to }?.position ?? 0
                result.positionAt = at
            }
            return result
        }
        next.playlists[index].cursor = point.episodeId
        next.playlists[index].history.removeAll { $0.finishedAt > to }
        return next
    }
}
