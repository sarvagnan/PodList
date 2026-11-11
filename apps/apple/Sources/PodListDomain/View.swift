import Foundation

public struct PodcastFilter: Codable, Equatable, Sendable {
    public var mode: PodcastMode
    public var subscriptionIds: [String]

    public init(mode: PodcastMode, subscriptionIds: [String]) {
        self.mode = mode
        self.subscriptionIds = subscriptionIds
    }
}

public struct ViewFilter: Codable, Equatable, Sendable {
    public var published: PublishedFilter?
    public var podcasts: PodcastFilter?
    public var text: String?
    public var played: PlayedFilter?
    public var starred: Bool?
    public var notInAnyPlaylist: Bool?
    public var minDuration: Double?
    public var maxDuration: Double?

    public init(published: PublishedFilter? = nil, podcasts: PodcastFilter? = nil, text: String? = nil, played: PlayedFilter? = nil, starred: Bool? = nil, notInAnyPlaylist: Bool? = nil, minDuration: Double? = nil, maxDuration: Double? = nil) {
        self.published = published
        self.podcasts = podcasts
        self.text = text
        self.played = played
        self.starred = starred
        self.notInAnyPlaylist = notInAnyPlaylist
        self.minDuration = minDuration
        self.maxDuration = maxDuration
    }
}

public struct View: Codable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var filter: ViewFilter
    public var sort: ViewSort
    public var limit: Int64?

    public init(id: String, name: String, filter: ViewFilter, sort: ViewSort, limit: Int64?) {
        self.id = id
        self.name = name
        self.filter = filter
        self.sort = sort
        self.limit = limit
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, filter, sort, limit
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        filter = try c.decode(ViewFilter.self, forKey: .filter)
        sort = try c.decode(ViewSort.self, forKey: .sort)
        limit = try c.decode(Int64?.self, forKey: .limit)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(name, forKey: .name)
        try c.encode(filter, forKey: .filter)
        try c.encode(sort, forKey: .sort)
        try c.encode(limit, forKey: .limit)
    }
}

public enum PodcastMode: String, Codable, CaseIterable, Sendable {
    case include, exclude
}

public enum PlayedFilter: String, Codable, CaseIterable, Sendable {
    case unplayed, inProgress, played
}

public enum ViewSort: String, Codable, CaseIterable, Sendable {
    case publishedDesc, publishedAsc, durationAsc, durationDesc
}

public enum PublishedFilter: Codable, Equatable, Sendable {
    case lastDays(days: Int64)
    case between(from: Int64?, to: Int64?)

    private enum CodingKeys: String, CodingKey {
        case _tag, days, from, to
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        switch try c.decode(String.self, forKey: ._tag) {
        case "LastDays": self = .lastDays(days: try c.decode(Int64.self, forKey: .days))
        case "Between": self = .between(from: try c.decode(Int64?.self, forKey: .from), to: try c.decode(Int64?.self, forKey: .to))
        default: throw DecodingError.dataCorruptedError(forKey: ._tag, in: c, debugDescription: "Unknown PublishedFilter tag")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .lastDays(days):
            try c.encode("LastDays", forKey: ._tag)
            try c.encode(days, forKey: .days)
        case let .between(from, to):
            try c.encode("Between", forKey: ._tag)
            try c.encode(from, forKey: .from)
            try c.encode(to, forKey: .to)
        }
    }
}
