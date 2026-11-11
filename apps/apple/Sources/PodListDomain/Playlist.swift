import Foundation

public struct Entry: Codable, Equatable, Sendable {
    public var episodeId: String
    public var position: Double
    public var positionAt: Int64

    public init(episodeId: String, position: Double, positionAt: Int64) {
        self.episodeId = episodeId
        self.position = position
        self.positionAt = positionAt
    }
}

public struct TimelinePoint: Codable, Equatable, Sendable {
    public var at: Int64
    public var episodeId: String
    public var position: Double

    public init(at: Int64, episodeId: String, position: Double) {
        self.at = at
        self.episodeId = episodeId
        self.position = position
    }
}

public struct PlaylistEdit: Codable, Equatable, Sendable {
    public var at: Int64
    public var kind: String
    public var episodeId: String

    public init(at: Int64, kind: String, episodeId: String) {
        self.at = at
        self.kind = kind
        self.episodeId = episodeId
    }
}

public struct Playlist: Codable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var isDefault: Bool
    public var clearOnPlayed: Bool
    public var entries: [Entry]
    public var cursor: String?
    public var history: [HistoryItem]
    public var timeline: [TimelinePoint]
    public var edits: [PlaylistEdit]?

    public init(id: String, name: String, isDefault: Bool, clearOnPlayed: Bool, entries: [Entry], cursor: String?, history: [HistoryItem], timeline: [TimelinePoint], edits: [PlaylistEdit]? = nil) {
        self.id = id
        self.name = name
        self.isDefault = isDefault
        self.clearOnPlayed = clearOnPlayed
        self.entries = entries
        self.cursor = cursor
        self.history = history
        self.timeline = timeline
        self.edits = edits
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, isDefault, clearOnPlayed, entries, cursor, history, timeline, edits
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        isDefault = try c.decode(Bool.self, forKey: .isDefault)
        clearOnPlayed = try c.decode(Bool.self, forKey: .clearOnPlayed)
        entries = try c.decode([Entry].self, forKey: .entries)
        cursor = try c.decode(String?.self, forKey: .cursor)
        history = try c.decode([HistoryItem].self, forKey: .history)
        timeline = try c.decode([TimelinePoint].self, forKey: .timeline)
        edits = try c.decodeIfPresent([PlaylistEdit].self, forKey: .edits)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(name, forKey: .name)
        try c.encode(isDefault, forKey: .isDefault)
        try c.encode(clearOnPlayed, forKey: .clearOnPlayed)
        try c.encode(entries, forKey: .entries)
        try c.encode(cursor, forKey: .cursor)
        try c.encode(history, forKey: .history)
        try c.encode(timeline, forKey: .timeline)
        try c.encodeIfPresent(edits, forKey: .edits)
    }
}

public struct TrashedPlaylist: Codable, Equatable, Sendable {
    public var playlist: Playlist
    public var deletedAt: Int64

    public init(playlist: Playlist, deletedAt: Int64) {
        self.playlist = playlist
        self.deletedAt = deletedAt
    }
}

public enum Placement: String, Codable, CaseIterable, Sendable {
    case now, next, last
}

/// `nil` is absent; `.some(nil)` is an explicitly null successor in the wire protocol.
public struct HistoryItem: Codable, Equatable, Sendable {
    public var episodeId: String
    public var finishedAt: Int64
    public var followedBy: String??
    public init(episodeId: String, finishedAt: Int64, followedBy: String?? = nil) {
        self.episodeId = episodeId; self.finishedAt = finishedAt; self.followedBy = followedBy
    }
    private enum CodingKeys: String, CodingKey { case episodeId, finishedAt, followedBy }
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        episodeId = try c.decode(String.self, forKey: .episodeId)
        finishedAt = try c.decode(Int64.self, forKey: .finishedAt)
        followedBy = c.contains(.followedBy) ? .some(try c.decode(String?.self, forKey: .followedBy)) : nil
    }
    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(episodeId, forKey: .episodeId)
        try c.encode(finishedAt, forKey: .finishedAt)
        if let following = followedBy { try c.encode(following, forKey: .followedBy) }
    }
}
