import Foundation

public enum PlaylistRules {
    public static func hasNoCurrentEntry(_ playlist: Playlist) -> Bool {
        !playlist.entries.contains { $0.episodeId == playlist.cursor }
    }

    public static func availableTrash(_ state: State, at: Int64) -> [TrashedPlaylist] {
        (state.trash ?? []).filter { Double($0.deletedAt) >= Double(at) - Double(state.trashDays ?? 30) * 86_400_000 }
    }

    public static func addEntry(_ playlist: Playlist, episodeId: String, placement: Placement, at: Int64) -> Playlist {
        if placement == .now && playlist.cursor == episodeId { return playlist }
        let oldIndex = playlist.entries.firstIndex { $0.episodeId == episodeId }
        let entry = oldIndex.map { playlist.entries[$0] } ?? Entry(episodeId: episodeId, position: 0, positionAt: at)
        var next = playlist
        let cursor = playlist.cursor == episodeId ? oldIndex.flatMap { playlist.entries[safe: $0 + 1]?.episodeId } : playlist.cursor
        next.entries.removeAll { $0.episodeId == episodeId }
        guard let cursorIndex = next.entries.firstIndex(where: { $0.episodeId == cursor }) else {
            next.entries.append(entry); next.cursor = episodeId; return next
        }
        let index = placement == .now ? cursorIndex : placement == .next ? cursorIndex + 1 : next.entries.count
        next.entries.insert(entry, at: index)
        next.cursor = placement == .now ? episodeId : cursor
        return next
    }

    public static func moveEntry(_ playlist: Playlist, episodeId: String, after: String?) -> Playlist {
        guard let entry = playlist.entries.first(where: { $0.episodeId == episodeId }), after != episodeId else { return playlist }
        var next = playlist
        next.entries.removeAll { $0.episodeId == episodeId }
        let index: Int
        if let after {
            guard let anchor = next.entries.firstIndex(where: { $0.episodeId == after }) else { return playlist }
            index = anchor + 1
        } else { index = 0 }
        next.entries.insert(entry, at: index)
        return next
    }

    public static func removeEntry(_ playlist: Playlist, episodeId: String) -> Playlist {
        guard let index = playlist.entries.firstIndex(where: { $0.episodeId == episodeId }) else { return playlist }
        var next = playlist
        if playlist.cursor == episodeId { next.cursor = playlist.entries[safe: index + 1]?.episodeId }
        next.entries.remove(at: index)
        return next
    }

    public static func setCursor(_ playlist: Playlist, episodeId: String?) -> Playlist {
        guard episodeId == nil || playlist.entries.contains(where: { $0.episodeId == episodeId }) else { return playlist }
        var next = playlist; next.cursor = episodeId; return next
    }
}

extension Array {
    subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}
