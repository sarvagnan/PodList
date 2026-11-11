import Foundation

public struct Played: Codable, Equatable, Sendable {
    public var at: Int64
    public var source: PlayedSource

    public init(at: Int64, source: PlayedSource) {
        self.at = at
        self.source = source
    }
}

public struct EpisodeState: Codable, Equatable, Sendable {
    public var episodeId: String
    public var played: Played?
    public var starred: Bool

    public init(episodeId: String, played: Played?, starred: Bool) {
        self.episodeId = episodeId
        self.played = played
        self.starred = starred
    }

    private enum CodingKeys: String, CodingKey {
        case episodeId, played, starred
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        episodeId = try c.decode(String.self, forKey: .episodeId)
        played = try c.decode(Played?.self, forKey: .played)
        starred = try c.decode(Bool.self, forKey: .starred)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(episodeId, forKey: .episodeId)
        try c.encode(played, forKey: .played)
        try c.encode(starred, forKey: .starred)
    }
}

public enum PlayedSource: Codable, Equatable, Sendable {
    case user
    case playback(playlistId: String)

    private enum CodingKeys: String, CodingKey {
        case _tag, playlistId
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: ._tag) {
        case "User": self = .user
        case "Playback": self = .playback(playlistId: try c.decode(String.self, forKey: .playlistId))
        default: throw DecodingError.dataCorruptedError(forKey: ._tag, in: c, debugDescription: "Unknown PlayedSource tag")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .user:
            try c.encode("User", forKey: ._tag)
        case let .playback(playlistId):
            try c.encode("Playback", forKey: ._tag)
            try c.encode(playlistId, forKey: .playlistId)
        }
    }
}
