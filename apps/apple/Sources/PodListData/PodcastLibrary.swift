import Foundation
import PodListDomain

public struct DirectoryPodcast: Codable, Equatable, Identifiable, Sendable {
    public let title: String
    public let author: String?
    public let feedUrl: String
    public let artworkUrl: String?
    public var id: String { feedUrl }
}

public struct PublisherResponse: Sendable {
    public let data: Data
    public let status: Int
    public let etag: String?
    public let lastModified: String?
    public init(data: Data = Data(), status: Int = 200, etag: String? = nil, lastModified: String? = nil) {
        self.data = data; self.status = status; self.etag = etag; self.lastModified = lastModified
    }
}

public protocol PublisherReader: Sendable {
    func readFeed(_ url: URL, etag: String?, lastModified: String?) async throws -> PublisherResponse
    func read(_ url: URL) async throws -> Data
    func readPrefix(_ url: URL, bytes: Int) async throws -> Data
}
public extension PublisherReader {
    func readFeed(_ url: URL, etag: String?, lastModified: String?) async throws -> PublisherResponse {
        PublisherResponse(data: try await read(url))
    }
    func readPrefix(_ url: URL, bytes: Int) async throws -> Data { Data(try await read(url).prefix(bytes)) }
}
public struct PublisherHTTP: PublisherReader {
    public init() {}
    public func read(_ url: URL) async throws -> Data { try await fetch(url, limit: FeedParser.sizeLimit, prefix: false).data }
    public func readPrefix(_ url: URL, bytes: Int) async throws -> Data { try await fetch(url, limit: bytes, prefix: true).data }
    public func readFeed(_ url: URL, etag: String?, lastModified: String?) async throws -> PublisherResponse {
        try await fetch(url, limit: FeedParser.sizeLimit, prefix: false, etag: etag, lastModified: lastModified)
    }
    private func fetch(_ url: URL, limit: Int, prefix: Bool, etag: String? = nil, lastModified: String? = nil) async throws -> PublisherResponse {
        guard ["http", "https"].contains(url.scheme?.lowercased() ?? ""), url.host != nil,
              url.user == nil, url.password == nil else { throw SyncResponseFailure("Enter an HTTP or HTTPS feed address") }
        var request = URLRequest(url: url); request.timeoutInterval = 30
        if prefix { request.setValue("bytes=0-\(limit - 1)", forHTTPHeaderField: "Range") }
        request.setValue("PodList/1.0", forHTTPHeaderField: "User-Agent")
        request.setValue(etag, forHTTPHeaderField: "If-None-Match")
        request.setValue(lastModified, forHTTPHeaderField: "If-Modified-Since")
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil; configuration.urlCredentialStorage = nil
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        // Bound publisher responses while reading; a feed never allocates unbounded memory.
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse else { throw SyncResponseFailure("Invalid publisher response") }
        if http.statusCode == 304 { return PublisherResponse(status: 304) }
        guard (200...299).contains(http.statusCode) else { throw SyncResponseFailure("Could not read the feed. Try again") }
        var data = Data()
        for try await byte in bytes {
            if data.count >= limit { if prefix { break }; throw SyncResponseFailure("Publisher response is too large") }
            data.append(byte)
        }
        return PublisherResponse(data: data, status: http.statusCode, etag: http.value(forHTTPHeaderField: "ETag"), lastModified: http.value(forHTTPHeaderField: "Last-Modified"))
    }
}

/// Discovery and subscription changes are requests, never queued State intentions.
public actor PodcastLibrary {
    private let db: LocalDatabase
    private let transport: (any SyncTransport)?
    private let publisher: any PublisherReader
    private let now: @Sendable () -> Int64
    private var refreshing = false
    public init(database: LocalDatabase, transport: (any SyncTransport)? = nil, publisher: any PublisherReader = PublisherHTTP(),
                now: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }) {
        db = database; self.transport = transport; self.publisher = publisher; self.now = now
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
        if let transport {
            let parsed = try ProtocolJSON.decode(ParsedFeed.self, from: await transport.request(method: "POST", path: "/api/podcasts/read", body: json(["feedUrl": feed])))
            try await db.cachePublisherLinks(feed, parsed: parsed)
            return parsed
        }
        guard let url = URL(string: feed) else { throw SyncResponseFailure("Invalid feed address") }
        let data = try await publisher.read(url)
        guard let xml = String(data: data, encoding: .utf8) else { throw SyncResponseFailure("Feed is not UTF-8") }
        let parsed = try FeedParser.parse(xml)
        try await db.cachePublisherLinks(feed, parsed: parsed)
        return parsed
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
        guard let url = URL(string: feed) else { throw SyncResponseFailure("Invalid feed address") }
        let response = try await publisher.readFeed(url, etag: nil, lastModified: nil)
        guard (200...299).contains(response.status), let xml = String(data: response.data, encoding: .utf8) else { throw SyncResponseFailure("Could not read the feed. Try again") }
        let parsed = try FeedParser.parse(xml)
        return try await db.subscribePolledFeed(feed, parsed: parsed, response: response, at: now())
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
    /// Automatic passes respect persisted deadlines; Refresh now deliberately bypasses them.
    public func refresh(respectBackoff: Bool = false) async throws {
        guard !refreshing else { return }
        refreshing = true; defer { refreshing = false }
        var failures: [String] = []
        for sub in try await db.readLibrary().subscriptions where sub.unsubscribedAt == nil {
            try Task.checkCancellation()
            let state = try await db.feedPollState(sub.id)
            if respectBackoff, let checked = state.checkedAt,
               now() < checked + max(FeedPollState.interval, state.backoff) { continue }
            do {
                guard let url = URL(string: sub.feedUrl) else { throw SyncResponseFailure("Invalid feed address") }
                let result = try await publisher.readFeed(url, etag: state.etag, lastModified: state.lastModified)
                guard result.status == 304 || (200...299).contains(result.status) else { throw SyncResponseFailure("Feed answered HTTP \(result.status)") }
                let parsed: ParsedFeed?
                if result.status == 304 { parsed = nil }
                else {
                    guard let xml = String(data: result.data, encoding: .utf8) else { throw SyncResponseFailure("Feed is not UTF-8") }
                    parsed = try FeedParser.parse(xml)
                }
                try await db.commitFeedPoll(sub, parsed: parsed, etag: result.status == 304 ? state.etag : result.etag,
                                            lastModified: result.status == 304 ? state.lastModified : result.lastModified, at: now())
            } catch is CancellationError { throw CancellationError() }
            catch {
                try await db.failFeedPoll(sub.id, at: now(), error: String(describing: error))
                failures.append(sub.title)
            }
        }
        if !failures.isEmpty { throw SyncResponseFailure("Could not refresh: " + failures.joined(separator: ", ") + ". Try again") }
    }

}

extension LocalDatabase {
    func cachePublisherLinks(_ feed: String, parsed: ParsedFeed) throws {
        try execute("UPDATE subscription SET website_url = ? WHERE feed_url = ?", [.optional(parsed.link), .text(feed)])
        for episode in parsed.episodes {
            try execute("UPDATE episode SET website_url = ? WHERE subscription_id IN (SELECT id FROM subscription WHERE feed_url = ?) AND guid = ?", [.optional(episode.link), .text(feed), .text(episode.guid)])
        }
    }
    /// One actor turn preserves feed/guid identities when Subscribe overlaps a one-Episode import.
    func storePodcast(_ feed: String, parsed: ParsedFeed, subscribe: Bool, guid: String?) throws -> Subscription {
        let snapshot = try readLibrary(), now = Int64(Date().timeIntervalSince1970 * 1000)
        let existing = snapshot.subscriptions.first { $0.feedUrl == feed }
        let chapterSources = try query("SELECT id, chapters_url FROM episode").reduce(into: [String: String]()) { $0[$1["id"]!.string!] = $1["chapters_url"]?.string }
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
            result[e.guid] = Episode(id: old?.id ?? UUID().uuidString, subscriptionId: sub.id, guid: e.guid, title: e.title, description: e.description, published: e.published, duration: e.duration, audioUrl: e.audioUrl, artwork: e.artworkUrl.map(Artwork.init), chapters: replaced || chapterSources[old?.id ?? ""] != e.chaptersUrl ? [] : old?.chapters ?? [], audioUpdatedAt: replaced ? now : old?.audioUpdatedAt)
        }
        try upsertLibrary(subscriptions: [sub], episodes: Array(episodes.values))
        for e in parsed.episodes where guid == nil || e.guid == guid {
            if let episode = episodes[e.guid] {
                let old = snapshot.episodes.first { $0.id == episode.id }
                let reset = chapterSources[episode.id] != e.chaptersUrl || old?.audioUpdatedAt != episode.audioUpdatedAt
                try execute("UPDATE episode SET chapters_url = ?, chapters_fetched_at = CASE WHEN ? THEN NULL ELSE chapters_fetched_at END WHERE id = ?", [.optional(e.chaptersUrl), .integer(reset ? 1 : 0), .text(episode.id)])
            }
        }
        try cachePublisherLinks(feed, parsed: parsed)
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
