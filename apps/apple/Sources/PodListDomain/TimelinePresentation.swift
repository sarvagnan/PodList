import Foundation

public struct TimelineEvent: Identifiable, Equatable, Sendable {
    public let kind: String
    public let episodeID: String
    public let at: Int64
    public var end: Int64
    public let from: Double
    public var to: Double
    public var moment: Int64 { kind == "finished" ? at - 1 : at }
    public var id: String { "\(kind)/\(episodeID)/\(at)" }
}
public struct RewindPreview: Equatable, Sendable {
    public let cursor: String?
    public let position: Double
    public let unplayed: [String]
    public let restored: [String]
}
public enum TimelinePresentation {
    public static func events(_ playlist: Playlist) -> [TimelineEvent] {
        var events: [TimelineEvent] = []
        var run: TimelineEvent?
        for point in playlist.timeline {
            if var current = run, current.episodeID == point.episodeId, point.at - current.end <= 600_000 {
                current.end = point.at; current.to = point.position; run = current
            } else {
                if let run { events.append(run) }
                run = TimelineEvent(kind: "listened", episodeID: point.episodeId, at: point.at, end: point.at, from: point.position, to: point.position)
            }
        }
        if let run { events.append(run) }
        events += playlist.history.map { TimelineEvent(kind: "finished", episodeID: $0.episodeId, at: $0.finishedAt, end: $0.finishedAt, from: 0, to: 0) }
        var seen = Set<String>()
        for edit in playlist.edits ?? [] {
            let event = TimelineEvent(kind: edit.kind, episodeID: edit.episodeId, at: edit.at, end: edit.at, from: 0, to: 0)
            if seen.insert(event.id).inserted { events.append(event) }
        }
        return events.enumerated().sorted { $0.element.at == $1.element.at ? $0.offset > $1.offset : $0.element.at > $1.element.at }.map(\.element)
    }
    public static func preview(_ state: State, playlistID: String, to: Int64, at: Int64) -> RewindPreview? {
        guard let before = state.playlists.first(where: { $0.id == playlistID }), TimelineRules.pointAt(before, to: to) != nil else { return nil }
        let afterState = Rewind.apply(state, playlistId: playlistID, to: to, at: at)
        guard let after = afterState.playlists.first(where: { $0.id == playlistID }) else { return nil }
        return RewindPreview(cursor: after.cursor, position: after.entries.first { $0.episodeId == after.cursor }?.position ?? 0,
            unplayed: state.episodeStates.keys.filter { state.episodeStates[$0]?.played != nil && afterState.episodeStates[$0]?.played == nil }.sorted(),
            restored: after.entries.map(\.episodeId).filter { id in !before.entries.contains { $0.episodeId == id } })
    }
    public static func undo(before: State, after: State, playlistID: String, at: Int64) -> [Change] {
        guard let was = before.playlists.first(where: { $0.id == playlistID }), let now = after.playlists.first(where: { $0.id == playlistID }) else { return [] }
        var changes: [Change] = []
        for entry in was.entries where now.entries.contains(where: { $0.episodeId == entry.episodeId && $0.position != entry.position }) {
            changes.append(.reportPosition(playlistId: playlistID, episodeId: entry.episodeId, position: entry.position, listenedAt: at))
        }
        changes.append(.setCursor(playlistId: playlistID, episodeId: was.cursor))
        for id in before.episodeStates.keys.sorted() {
            if let played = before.episodeStates[id]?.played, after.episodeStates[id]?.played == nil { changes.append(.markPlayed(episodeId: id, source: played.source)) }
        }
        for entry in now.entries where !was.entries.contains(where: { $0.episodeId == entry.episodeId }) {
            changes.append(.removeEntry(playlistId: playlistID, episodeId: entry.episodeId))
        }
        return changes
    }
}
