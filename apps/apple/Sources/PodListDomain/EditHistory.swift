import Foundation

/// Only successful reversals move between stacks. The caller serializes execution.
public struct EditHistory<Step> {
    private var past: [Step] = []
    private var future: [Step] = []
    private var group: String?
    public init() {}
    public var undo: Step? { past.last }
    public var redo: Step? { future.last }
    public mutating func record(_ step: Step, typingGroup: String? = nil) {
        if typingGroup == nil || group != typingGroup || past.isEmpty { past.append(step) }
        group = typingGroup
        future.removeAll()
    }
    public mutating func endTyping() { group = nil }
    public mutating func clear() { past.removeAll(); future.removeAll(); endTyping() }
    public func contains(where predicate: (Step) -> Bool) -> Bool {
        past.contains(where: predicate) || future.contains(where: predicate)
    }
    /// Drop a cancelled editor's steps without disturbing edits from other windows.
    public mutating func removeAll(where predicate: (Step) -> Bool) {
        past.removeAll(where: predicate); future.removeAll(where: predicate); endTyping()
    }
    /// Call after the inverse has committed durably; failure leaves both stacks untouched.
    public mutating func completeReverse(with inverse: Step, redo: Bool = false) {
        if redo {
            guard !future.isEmpty else { return }
            future.removeLast(); past.append(inverse)
        } else {
            guard !past.isEmpty else { return }
            past.removeLast(); future.append(inverse)
        }
        endTyping()
    }
}

extension EditHistory: Sendable where Step: Sendable {}

public enum PlaylistNames {
    public static func problem(_ name: String, playlists: [Playlist], excluding: String? = nil) -> String? {
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if name.isEmpty { return "Enter a Playlist name." }
        if let taken = playlists.first(where: { $0.id != excluding && matches($0.name, name) }) {
            return "A Playlist named “\(taken.name)” already exists."
        }
        return nil
    }
    public static func matches(_ left: String, _ right: String) -> Bool {
        left.trimmingCharacters(in: .whitespacesAndNewlines).caseInsensitiveCompare(right.trimmingCharacters(in: .whitespacesAndNewlines)) == .orderedSame
    }
    public static func nextFreeName(_ base: String, playlists: [Playlist]) -> String {
        let name = base.trimmingCharacters(in: .whitespacesAndNewlines)
        if !playlists.contains(where: { matches($0.name, name) }) { return name }
        var suffix = 2
        while playlists.contains(where: { matches($0.name, "\(name) \(suffix)") }) { suffix += 1 }
        return "\(name) \(suffix)"
    }
    /// Expand local restores into existing wire Changes. Replay keeps remote duplicates.
    public static func restoreChanges(_ state: State, id: String, at: Int64) -> [Change] {
        let restore = Change.restorePlaylist(playlistId: id)
        guard !state.playlists.contains(where: { $0.id == id }),
              let playlist = PlaylistRules.availableTrash(state, at: at).first(where: { $0.playlist.id == id })?.playlist else { return [restore] }
        let name = nextFreeName(playlist.name, playlists: state.playlists)
        return name == playlist.name ? [restore] : [restore, .renamePlaylist(playlistId: id, name: name)]
    }
}

public enum EpisodeActions {
    /// Keep a multi-selection in displayed order, including an empty or past-end target.
    public static func addMany(_ ids: [String], playlist: Playlist, placement: Placement) -> [Change] {
        var seen = Set<String>()
        let unique = ids.filter { seen.insert($0).inserted }
        let hasCursor = playlist.entries.contains { $0.episodeId == playlist.cursor }
        let order = placement != .next ? unique : hasCursor ? Array(unique.reversed()) : Array(unique.prefix(1)) + unique.dropFirst().reversed()
        var changes = order.map { Change.addEntry(playlistId: playlist.id, episodeId: $0, placement: placement) }
        var result = playlist
        for id in order { result = PlaylistRules.addEntry(result, episodeId: id, placement: placement, at: 0) }
        if result.entries.filter({ unique.contains($0.episodeId) }).map(\.episodeId) != unique,
           let first = result.entries.firstIndex(where: { unique.contains($0.episodeId) }) {
            var anchor = first > 0 ? result.entries[first - 1].episodeId : nil
            for id in unique { changes.append(.moveEntry(playlistId: playlist.id, episodeId: id, after: anchor)); anchor = id }
        }
        // Play Now starts the first selected Episode.
        if placement == .now, let first = unique.first { changes.append(.setCursor(playlistId: playlist.id, episodeId: first)) }
        return changes
    }
    public static func undoAdd(_ before: Playlist, ids: [String]) -> [Change] {
        var changes = ids.filter { id in !before.entries.contains { $0.episodeId == id } }.map { Change.removeEntry(playlistId: before.id, episodeId: $0) }
        for (index, entry) in before.entries.enumerated() where ids.contains(entry.episodeId) {
            changes.append(.moveEntry(playlistId: before.id, episodeId: entry.episodeId, after: index > 0 ? before.entries[index - 1].episodeId : nil))
        }
        changes.append(.setCursor(playlistId: before.id, episodeId: before.cursor))
        return changes
    }
    public static func undoPlayed(_ before: State, ids: [String], at: Int64) -> [Change] {
        var changes = ids.map { id in before.episodeStates[id]?.played.map { Change.markPlayed(episodeId: id, source: $0.source) } ?? .markUnplayed(episodeId: id) }
        for playlist in before.playlists {
            for (index, entry) in playlist.entries.enumerated() where ids.contains(entry.episodeId) {
                changes += [.addEntry(playlistId: playlist.id, episodeId: entry.episodeId, placement: .last),
                    .moveEntry(playlistId: playlist.id, episodeId: entry.episodeId, after: index > 0 ? playlist.entries[index - 1].episodeId : nil),
                    .reportPosition(playlistId: playlist.id, episodeId: entry.episodeId, position: entry.position, listenedAt: at)]
            }
            if let cursor = playlist.cursor, ids.contains(cursor) { changes.append(.setCursor(playlistId: playlist.id, episodeId: cursor)) }
        }
        return changes
    }
    /// Native drag/drop and discrete moves share this ordered block operation.
    public static func move(_ ids: Set<String>, in playlist: Playlist, to boundary: Int) -> [Change] {
        let selected = playlist.entries.map(\.episodeId).filter { ids.contains($0) }
        let boundary = min(max(0, boundary), playlist.entries.count)
        var anchor = playlist.entries.prefix(boundary).last { !ids.contains($0.episodeId) }?.episodeId
        var changes: [Change] = []
        for id in selected { changes.append(.moveEntry(playlistId: playlist.id, episodeId: id, after: anchor)); anchor = id }
        return changes
    }
}

/// Reversals are protocol Operations, never State replacement or Listening log subtraction.
public enum EditUndo {
    public static func inverse(_ before: State, change: Change, at: Int64) -> [Change] {
        func playlist(_ id: String) -> Playlist? { before.playlists.first { $0.id == id } }
        switch change {
        case let .setStar(id, _): return [.setStar(episodeId: id, starred: before.episodeStates[id]?.starred == true)]
        case let .markPlayed(id, _), let .markUnplayed(id): return EpisodeActions.undoPlayed(before, ids: [id], at: at)
        case let .renamePlaylist(id, _): return playlist(id).map { [.renamePlaylist(playlistId: id, name: $0.name)] } ?? []
        case .setPlaybackSettings: return [.setPlaybackSettings(settings: before.playbackSettings)]
        case .setTrashDays: return [.setTrashDays(days: before.trashDays ?? 30)]
        case let .setDownloadRule(rule): return [.setDownloadRule(rule: before.downloadRules.first { $0.subscriptionId == rule.subscriptionId && $0.deviceId == rule.deviceId } ?? DownloadRule(subscriptionId: rule.subscriptionId, deviceId: rule.deviceId, mode: .never, keepAtMost: nil))]
        case let .saveView(view): return [before.views.first { $0.id == view.id }.map { .saveView(view: $0) } ?? .deleteView(viewId: view.id)]
        case let .deleteView(id): return before.views.first { $0.id == id }.map { [.saveView(view: $0)] } ?? []
        case let .createPlaylist(id, _, _): return [.deletePlaylist(playlistId: id)]
        case let .deletePlaylist(id): return [.restorePlaylist(playlistId: id)] + (before.activePlaylistId == id ? [.setActivePlaylist(playlistId: id)] : [])
        case let .restorePlaylist(id):
            let original = before.trash?.first { $0.playlist.id == id }?.playlist
            let renamed = PlaylistNames.restoreChanges(before, id: id, at: at).count > 1
            return (renamed ? original.map { [Change.renamePlaylist(playlistId: id, name: $0.name)] } ?? [] : []) + [.deletePlaylist(playlistId: id)]
        case .setActivePlaylist: return [.setActivePlaylist(playlistId: before.activePlaylistId)]
        case let .setClearOnPlayed(id, _): return playlist(id).map { [.setClearOnPlayed(playlistId: id, clearOnPlayed: $0.clearOnPlayed)] } ?? []
        case let .addEntry(id, episode, _): return playlist(id).map { EpisodeActions.undoAdd($0, ids: [episode]) } ?? []
        case let .moveEntry(id, episode, _):
            guard let p = playlist(id), let index = p.entries.firstIndex(where: { $0.episodeId == episode }) else { return [] }
            return [.moveEntry(playlistId: id, episodeId: episode, after: index > 0 ? p.entries[index - 1].episodeId : nil)]
        case let .removeEntry(id, episode):
            guard let p = playlist(id), let index = p.entries.firstIndex(where: { $0.episodeId == episode }) else { return [] }
            return [.addEntry(playlistId: id, episodeId: episode, placement: .last),
                .moveEntry(playlistId: id, episodeId: episode, after: index > 0 ? p.entries[index - 1].episodeId : nil),
                .reportPosition(playlistId: id, episodeId: episode, position: p.entries[index].position, listenedAt: at), .setCursor(playlistId: id, episodeId: p.cursor)]
        case let .setCursor(id, _): return playlist(id).map { [.setCursor(playlistId: id, episodeId: $0.cursor)] } ?? []
        case let .reportPosition(id, episode, _, _, _): return playlist(id)?.entries.first { $0.episodeId == episode }.map { [.reportPosition(playlistId: id, episodeId: episode, position: $0.position, listenedAt: at)] } ?? []
        case let .rewind(id, to): return TimelinePresentation.undo(before: before, after: Rewind.apply(before, playlistId: id, to: to, at: at), playlistID: id, at: at)
        default: return []
        }
    }
}
