import Foundation
import PodListDomain

public struct DirectoryPodcast: Codable, Equatable, Identifiable, Sendable {
    public let title: String
    public let author: String?
    public let feedUrl: String
    public let artworkUrl: String?
    public var id: String { feedUrl }
}

public protocol PublisherReader: Sendable {
    func read(_ url: URL) async throws -> Data
}
public struct PublisherHTTP: PublisherReader {
    public init() {}
    public func read(_ url: URL) async throws -> Data {
        guard ["http", "https"].contains(url.scheme?.lowercased() ?? ""), url.host != nil,
              url.user == nil, url.password == nil else { throw SyncResponseFailure("Enter an HTTP or HTTPS feed address") }
        var request = URLRequest(url: url); request.timeoutInterval = 30
        request.setValue("PodList Apple", forHTTPHeaderField: "User-Agent")
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil; configuration.urlCredentialStorage = nil
        let session = URLSession(configuration: configuration)
        defer { session.finishTasksAndInvalidate() }
        // Bound publisher responses while reading; a feed never allocates unbounded memory.
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { throw SyncResponseFailure("Could not read the feed. Try again") }
        var data = Data()
        for try await byte in bytes {
            guard data.count < FeedParser.sizeLimit else { throw SyncResponseFailure("Feed is too large") }
            data.append(byte)
        }
        return data
    }
}

/// Discovery and subscription changes are requests, never queued State intentions.
public actor PodcastLibrary {
    private let db: LocalDatabase
    private let transport: (any SyncTransport)?
    private let publisher: any PublisherReader
    public init(database: LocalDatabase, transport: (any SyncTransport)? = nil, publisher: any PublisherReader = PublisherHTTP()) {
        db = database; self.transport = transport; self.publisher = publisher
    }
    private func json(_ values: [String: String]) throws -> String { String(decoding: try JSONEncoder().encode(values), as: UTF8.self) }
    private func escaped(_ text: String) -> String { text.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? "" }
    public func search(_ query: String) async throws -> [DirectoryPodcast] {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return [] }
        if let transport {
            return try ProtocolJSON.decode([DirectoryPodcast].self, from: await transport.request(method: "GET", path: "/api/directory/search?q=" + escaped(text), body: nil))
        }
        if text.lowercased().hasPrefix("http://") || text.lowercased().hasPrefix("https://") {
            let feed = try await readPodcast(text)
            return [DirectoryPodcast(title: feed.title, author: feed.author, feedUrl: text, artworkUrl: feed.artworkUrl)]
        }
        struct Result: Decodable { let collectionName: String?; let artistName: String?; let feedUrl: String?; let artworkUrl600: String? }
        struct Response: Decodable { let results: [Result] }
        let url = URL(string: "https://itunes.apple.com/search?media=podcast&entity=podcast&limit=30&term=" + escaped(text))!
        return try JSONDecoder().decode(Response.self, from: await publisher.read(url)).results.compactMap { result in
            result.feedUrl.map { DirectoryPodcast(title: result.collectionName ?? $0, author: result.artistName, feedUrl: $0, artworkUrl: result.artworkUrl600) }
        }
    }
    public func readPodcast(_ feed: String) async throws -> ParsedFeed {
        if let transport { return try ProtocolJSON.decode(ParsedFeed.self, from: await transport.request(method: "POST", path: "/api/podcasts/read", body: json(["feedUrl": feed]))) }
        guard let url = URL(string: feed) else { throw SyncResponseFailure("Invalid feed address") }
        let data = try await publisher.read(url)
        guard let xml = String(data: data, encoding: .utf8) else { throw SyncResponseFailure("Feed is not UTF-8") }
        return try FeedParser.parse(xml)
    }
    public func subscribe(_ feed: String) async throws -> Subscription {
        if let transport {
            let sub = try ProtocolJSON.decode(Subscription.self, from: await transport.request(method: "POST", path: "/api/subscriptions", body: json(["feedUrl": feed])))
            try await db.upsertLibrary(subscriptions: [sub], episodes: []); return sub
        }
        if var existing = try await db.readLibrary().subscriptions.first(where: { $0.feedUrl == feed }) {
            let complete = try await db.getMeta("feedComplete:" + existing.id) == "true"
            if existing.unsubscribedAt == nil || complete {
                existing.unsubscribedAt = nil
                try await db.upsertLibrary(subscriptions: [existing], episodes: [])
                return existing
            }
        }
        let parsed = try await readPodcast(feed)
        return try await db.storePodcast(feed, parsed: parsed, subscribe: true, guid: nil)
    }
    public func unsubscribe(_ id: String) async throws {
        if let transport {
            let sub = try ProtocolJSON.decode(Subscription.self, from: await transport.request(method: "DELETE", path: "/api/subscriptions/" + escaped(id), body: nil))
            try await db.upsertLibrary(subscriptions: [sub], episodes: [])
        } else {
            try await db.execute("UPDATE subscription SET unsubscribed_at = COALESCE(unsubscribed_at, ?) WHERE id = ?", [.integer(Int64(Date().timeIntervalSince1970 * 1000)), .text(id)])
        }
    }
    public func bringEpisode(_ feed: String, guid: String) async throws -> String {
        if let transport {
            struct Brought: Decodable { let episodeId: String }
            let result = try ProtocolJSON.decode(Brought.self, from: await transport.request(method: "POST", path: "/api/podcasts/episodes", body: json(["feedUrl": feed, "guid": guid])))
            try await SyncClient(db: db, transport: transport).sync()
            guard try await db.readLibrary().episodes.contains(where: { $0.id == result.episodeId }) else { throw SyncResponseFailure("Episode details are still loading. Try again") }
            return result.episodeId
        }
        let parsed = try await readPodcast(feed)
        guard parsed.episodes.contains(where: { $0.guid == guid }) else { throw SyncResponseFailure("Episode is no longer in the feed") }
        let sub = try await db.storePodcast(feed, parsed: parsed, subscribe: false, guid: guid)
        return try await db.readLibrary().episodes.first { $0.subscriptionId == sub.id && $0.guid == guid }!.id
    }
    public func refresh() async throws {
        var failures: [String] = []
        for sub in try await db.readLibrary().subscriptions where sub.unsubscribedAt == nil {
            do {
                let parsed = try await readPodcast(sub.feedUrl)
                _ = try await db.storePodcast(sub.feedUrl, parsed: parsed, subscribe: false, guid: nil)
            } catch { failures.append(sub.title) }
        }
        if !failures.isEmpty { throw SyncResponseFailure("Could not refresh: " + failures.joined(separator: ", ") + ". Try again") }
    }
}

extension LocalDatabase {
    /// One actor turn preserves feed/guid identities when Subscribe overlaps a one-Episode import.
    func storePodcast(_ feed: String, parsed: ParsedFeed, subscribe: Bool, guid: String?) throws -> Subscription {
        let snapshot = try readLibrary(), now = Int64(Date().timeIntervalSince1970 * 1000)
        let existing = snapshot.subscriptions.first { $0.feedUrl == feed }
        var sub = existing ?? Subscription(id: UUID().uuidString, feedUrl: feed, title: parsed.title, author: parsed.author, description: parsed.description, artwork: parsed.artworkUrl.map(Artwork.init), subscribedAt: now, unsubscribedAt: subscribe ? nil : now, playedThreshold: nil, playbackSettings: .init())
        sub.title = parsed.title; sub.author = parsed.author; sub.description = parsed.description; sub.artwork = parsed.artworkUrl.map(Artwork.init)
        if subscribe { sub.unsubscribedAt = nil }
        let guids = Set(parsed.episodes.map(\.guid))
        let episodes = parsed.episodes.filter { guid == nil || $0.guid == guid }.reduce(into: [String: Episode]()) { result, e in
            let alternatives = snapshot.episodes.filter {
                $0.subscriptionId == sub.id && !guids.contains($0.guid) && ($0.audioUrl == e.audioUrl || ($0.title == e.title && $0.published == e.published))
            }
            let old = snapshot.episodes.first { $0.subscriptionId == sub.id && $0.guid == e.guid } ?? (guid == nil && alternatives.count == 1 ? alternatives.first : nil)
            let replaced = old?.duration.flatMap { previous in e.duration.map { abs(previous - $0) > 30 } } == true
            result[e.guid] = Episode(id: old?.id ?? UUID().uuidString, subscriptionId: sub.id, guid: e.guid, title: e.title, description: e.description, published: e.published, duration: e.duration, audioUrl: e.audioUrl, artwork: e.artworkUrl.map(Artwork.init), chapters: replaced ? [] : old?.chapters ?? [], audioUpdatedAt: replaced ? now : old?.audioUpdatedAt)
        }
        try upsertLibrary(subscriptions: [sub], episodes: Array(episodes.values))
        for e in parsed.episodes where guid == nil || e.guid == guid {
            if let id = episodes[e.guid]?.id { try execute("UPDATE episode SET chapters_url = ? WHERE id = ?", [e.chaptersUrl.map(SQLValue.text) ?? .null, .text(id)]) }
        }
        if guid == nil { try setMeta("feedComplete:" + sub.id, "true") }
        return sub
    }
}

public enum OPML {
    public static func generate(_ subscriptions: [Subscription]) -> String {
        func escape(_ value: String) -> String {
            value.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;").replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "'", with: "&apos;")
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><opml version=\"2.0\"><head><title>PodList subscriptions</title></head><body>" + subscriptions.filter { $0.unsubscribedAt == nil }.map { "<outline type=\"rss\" text=\"\(escape($0.title))\" xmlUrl=\"\(escape($0.feedUrl))\"/>" }.joined() + "</body></opml>"
    }
    public static func parse(_ xml: String) throws -> [String] {
        guard xml.utf8.count <= 8 * 1024 * 1024, !xml.uppercased().contains("<!DOCTYPE"), !xml.uppercased().contains("<!ENTITY") else { throw SyncResponseFailure("Unsafe or oversized OPML") }
        let delegate = OPMLReader(), parser = XMLParser(data: Data(xml.utf8))
        parser.shouldResolveExternalEntities = false; parser.delegate = delegate
        guard parser.parse(), delegate.root == "opml", delegate.hasBody else { throw SyncResponseFailure("Choose a valid OPML document") }
        return delegate.feeds
    }
}
private final class OPMLReader: NSObject, XMLParserDelegate {
    var root: String?; var hasBody = false; var feeds: [String] = []; var bodyDepth = 0
    func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String]) {
        if root == nil { root = name }
        if name == "body" { hasBody = true; bodyDepth += 1 }
        if bodyDepth > 0, name == "outline", let feed = attributes["xmlUrl"], !feed.isEmpty, !feeds.contains(feed) { feeds.append(feed) }
    }
    func parser(_ parser: XMLParser, didEndElement name: String, namespaceURI: String?, qualifiedName: String?) { if name == "body" { bodyDepth -= 1 } }
}
