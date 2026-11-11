import Foundation

public struct Artwork: Codable, Equatable, Sendable {
    public var url: String

    public init(url: String) {
        self.url = url
    }
}

public struct Chapter: Codable, Equatable, Sendable {
    public var start: Double
    public var title: String
    public var artwork: Artwork?
    public var url: String?

    public init(start: Double, title: String, artwork: Artwork?, url: String?) {
        self.start = start
        self.title = title
        self.artwork = artwork
        self.url = url
    }

    private enum CodingKeys: String, CodingKey {
        case start, title, artwork, url
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        start = try c.decode(Double.self, forKey: .start)
        title = try c.decode(String.self, forKey: .title)
        artwork = try c.decode(Artwork?.self, forKey: .artwork)
        url = try c.decode(String?.self, forKey: .url)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(start, forKey: .start)
        try c.encode(title, forKey: .title)
        try c.encode(artwork, forKey: .artwork)
        try c.encode(url, forKey: .url)
    }
}

public struct Subscription: Codable, Equatable, Sendable {
    public var id: String
    public var feedUrl: String
    public var title: String
    public var author: String?
    public var description: String?
    public var artwork: Artwork?
    public var subscribedAt: Int64
    public var unsubscribedAt: Int64?
    public var playedThreshold: Double?
    public var playbackSettings: PlaybackSettingsOverride

    public init(id: String, feedUrl: String, title: String, author: String?, description: String?, artwork: Artwork?, subscribedAt: Int64, unsubscribedAt: Int64?, playedThreshold: Double?, playbackSettings: PlaybackSettingsOverride) {
        self.id = id
        self.feedUrl = feedUrl
        self.title = title
        self.author = author
        self.description = description
        self.artwork = artwork
        self.subscribedAt = subscribedAt
        self.unsubscribedAt = unsubscribedAt
        self.playedThreshold = playedThreshold
        self.playbackSettings = playbackSettings
    }

    private enum CodingKeys: String, CodingKey {
        case id, feedUrl, title, author, description, artwork, subscribedAt, unsubscribedAt, playedThreshold, playbackSettings
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        feedUrl = try c.decode(String.self, forKey: .feedUrl)
        title = try c.decode(String.self, forKey: .title)
        author = try c.decode(String?.self, forKey: .author)
        description = try c.decode(String?.self, forKey: .description)
        artwork = try c.decode(Artwork?.self, forKey: .artwork)
        subscribedAt = try c.decode(Int64.self, forKey: .subscribedAt)
        unsubscribedAt = try c.decode(Int64?.self, forKey: .unsubscribedAt)
        playedThreshold = try c.decode(Double?.self, forKey: .playedThreshold)
        playbackSettings = try c.decode(PlaybackSettingsOverride.self, forKey: .playbackSettings)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(feedUrl, forKey: .feedUrl)
        try c.encode(title, forKey: .title)
        try c.encode(author, forKey: .author)
        try c.encode(description, forKey: .description)
        try c.encode(artwork, forKey: .artwork)
        try c.encode(subscribedAt, forKey: .subscribedAt)
        try c.encode(unsubscribedAt, forKey: .unsubscribedAt)
        try c.encode(playedThreshold, forKey: .playedThreshold)
        try c.encode(playbackSettings, forKey: .playbackSettings)
    }
}

public struct Episode: Codable, Equatable, Sendable {
    public var id: String
    public var subscriptionId: String
    public var guid: String
    public var title: String
    public var description: String
    public var published: Int64
    public var duration: Double?
    public var audioUrl: String
    public var artwork: Artwork?
    public var chapters: [Chapter]
    public var audioUpdatedAt: Int64?

    public init(id: String, subscriptionId: String, guid: String, title: String, description: String, published: Int64, duration: Double?, audioUrl: String, artwork: Artwork?, chapters: [Chapter], audioUpdatedAt: Int64?) {
        self.id = id
        self.subscriptionId = subscriptionId
        self.guid = guid
        self.title = title
        self.description = description
        self.published = published
        self.duration = duration
        self.audioUrl = audioUrl
        self.artwork = artwork
        self.chapters = chapters
        self.audioUpdatedAt = audioUpdatedAt
    }

    private enum CodingKeys: String, CodingKey {
        case id, subscriptionId, guid, title, description, published, duration, audioUrl, artwork, chapters, audioUpdatedAt
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        subscriptionId = try c.decode(String.self, forKey: .subscriptionId)
        guid = try c.decode(String.self, forKey: .guid)
        title = try c.decode(String.self, forKey: .title)
        description = try c.decode(String.self, forKey: .description)
        published = try c.decode(Int64.self, forKey: .published)
        duration = try c.decode(Double?.self, forKey: .duration)
        audioUrl = try c.decode(String.self, forKey: .audioUrl)
        artwork = try c.decode(Artwork?.self, forKey: .artwork)
        chapters = try c.decode([Chapter].self, forKey: .chapters)
        audioUpdatedAt = try c.decode(Int64?.self, forKey: .audioUpdatedAt)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(subscriptionId, forKey: .subscriptionId)
        try c.encode(guid, forKey: .guid)
        try c.encode(title, forKey: .title)
        try c.encode(description, forKey: .description)
        try c.encode(published, forKey: .published)
        try c.encode(duration, forKey: .duration)
        try c.encode(audioUrl, forKey: .audioUrl)
        try c.encode(artwork, forKey: .artwork)
        try c.encode(chapters, forKey: .chapters)
        try c.encode(audioUpdatedAt, forKey: .audioUpdatedAt)
    }
}
