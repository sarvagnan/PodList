import Foundation

public struct Replayed: Equatable, Sendable {
    public var state: State
    public var applied: Set<String>
    public init(state: State, applied: Set<String> = []) { self.state = state; self.applied = applied }
}

public enum StateRules {
    /// Arrival order is authoritative. Persist the applied ids between incremental replays.
    public static func replay(_ state: State, operations: [Operation], applied: Set<String> = []) -> Replayed {
        var result = Replayed(state: state, applied: applied)
        for operation in operations where result.applied.insert(operation.id).inserted {
            result.state = apply(result.state, change: operation.change, at: operation.recordedAt)
        }
        return result
    }

    public static func apply(_ state: State, change: Change, at: Int64) -> State {
        var next = state
        func withPlaylist(_ id: String, _ transform: (Playlist) -> Playlist) {
            if let index = next.playlists.firstIndex(where: { $0.id == id }) { next.playlists[index] = transform(next.playlists[index]) }
        }
        switch change {
        case let .addEntry(id, episodeId, placement):
            withPlaylist(id) { playlist in
                guard placement != .now || playlist.cursor != episodeId else { return playlist }
                // A valid edit is recorded even when its resulting order is unchanged.
                return TimelineRules.recordEdit(PlaylistRules.addEntry(playlist, episodeId: episodeId, placement: placement, at: at),
                                                kind: "added", episodeId: episodeId, at: at)
            }
        case let .moveEntry(id, episodeId, after):
            withPlaylist(id) { playlist in
                guard playlist.entries.contains(where: { $0.episodeId == episodeId }), after != episodeId,
                      after == nil || playlist.entries.contains(where: { $0.episodeId == after }) else { return playlist }
                return TimelineRules.recordEdit(PlaylistRules.moveEntry(playlist, episodeId: episodeId, after: after),
                                                kind: "moved", episodeId: episodeId, at: at)
            }
        case let .removeEntry(id, episodeId):
            withPlaylist(id) { playlist in
                guard playlist.entries.contains(where: { $0.episodeId == episodeId }) else { return playlist }
                return TimelineRules.recordEdit(PlaylistRules.removeEntry(playlist, episodeId: episodeId), kind: "removed", episodeId: episodeId, at: at)
            }
        case let .setCursor(id, episodeId): withPlaylist(id) { PlaylistRules.setCursor($0, episodeId: episodeId) }
        case let .createPlaylist(id, name, clearOnPlayed):
            if !next.playlists.contains(where: { $0.id == id }) {
                next.playlists.append(Playlist(id: id, name: name, isDefault: false, clearOnPlayed: clearOnPlayed, entries: [], cursor: nil, history: [], timeline: []))
            }
        case let .renamePlaylist(id, name): withPlaylist(id) { var p = $0; if !p.isDefault { p.name = name }; return p }
        case let .setClearOnPlayed(id, enabled): withPlaylist(id) { var p = $0; p.clearOnPlayed = enabled; return p }
        case let .deletePlaylist(id):
            if let p = next.playlists.first(where: { $0.id == id }), !p.isDefault {
                next.playlists.removeAll { $0.id == id }
                if next.activePlaylistId == id { next.activePlaylistId = defaultPlaylistId }
                next.trash = (next.trash ?? []).filter { $0.playlist.id != id } + [TrashedPlaylist(playlist: p, deletedAt: at)]
            }
        case let .restorePlaylist(id):
            if let p = PlaylistRules.availableTrash(next, at: at).first(where: { $0.playlist.id == id }), !next.playlists.contains(where: { $0.id == id }) {
                next.playlists.append(p.playlist); next.trash?.removeAll { $0.playlist.id == id }
            }
        case let .setTrashDays(days): next.trashDays = days
        case let .setActivePlaylist(id): if next.playlists.contains(where: { $0.id == id }) { next.activePlaylistId = id }
        case let .setStar(id, starred): next.setEpisodeFacts(id, played: next.episodeStates[id]?.played, starred: starred)
        case let .markPlayed(id, source):
            next.setEpisodeFacts(id, played: Played(at: at, source: source), starred: next.episodeStates[id]?.starred ?? false)
            next.playlists = next.playlists.map { p in
                let after = PlayedRules.onPlayed(p, episodeId: id, finishedHere: source == .playback(playlistId: p.id), at: at)
                return source == .user && p.entries.contains(where: { $0.episodeId == id }) ? TimelineRules.recordEdit(after, kind: "markedPlayed", episodeId: id, at: at) : after
            }
        case let .markUnplayed(id): next.setEpisodeFacts(id, played: nil, starred: next.episodeStates[id]?.starred ?? false)
        case let .saveView(view):
            if let i = next.views.firstIndex(where: { $0.id == view.id }) { next.views[i] = view } else { next.views.append(view) }
        case let .deleteView(id): next.views.removeAll { $0.id == id }
        case let .setDownloadRule(rule):
            var rule = rule
            let previous = next.downloadRules.first { $0.subscriptionId == rule.subscriptionId && $0.deviceId == rule.deviceId }
            rule.since = rule.mode == .allNew ? (previous?.mode == .allNew ? previous?.since : at) : nil
            next.downloadRules.removeAll { $0.subscriptionId == rule.subscriptionId && $0.deviceId == rule.deviceId }
            next.downloadRules.append(rule)
        case let .setPlaybackSettings(settings): next.playbackSettings = settings
        case let .recordListening(amounts):
            if !amounts.isEmpty { next.listeningLog = Listening.add(next.listeningLog ?? [:], amounts: amounts) }
        case let .reportPosition(id, episodeId, position, listenedAt, listening):
            if let listening, !listening.isEmpty { next.listeningLog = Listening.add(next.listeningLog ?? [:], amounts: listening) }
            withPlaylist(id) { p in
                guard let i = p.entries.firstIndex(where: { $0.episodeId == episodeId }) else { return p }
                var recorded = TimelineRules.record(p, episodeId: episodeId, position: position, at: listenedAt)
                if listenedAt >= p.entries[i].positionAt { recorded.entries[i].position = position; recorded.entries[i].positionAt = listenedAt }
                return recorded
            }
        case let .rewind(id, to): next = Rewind.apply(next, playlistId: id, to: to, at: at)
        // Intentions requiring the Library are expanded by the server or Standalone Device.
        case .markSubscriptionPlayed, .setSubscriptionOverrides: break
        }
        if next.trash != nil { next.trash = PlaylistRules.availableTrash(next, at: at) }
        return next
    }
}

extension State {
    mutating func setEpisodeFacts(_ id: String, played: Played?, starred: Bool) {
        episodeStates[id] = played == nil && !starred ? nil : EpisodeState(episodeId: id, played: played, starred: starred)
    }
}
