import Foundation
import Testing
import PodListDomain
@testable import PodListData

private struct FeedHTTP: PublisherReader {
    func read(_ url: URL) async throws -> Data {
        Data("<rss><channel><title>A &amp; B</title><item><guid>one</guid><title>Episode</title><enclosure url='https://example.com/audio.mp3'/></item><item><guid>two</guid><title>Another</title><enclosure url='https://example.com/2.mp3'/></item></channel></rss>".utf8)
    }
}
@Test func podcastCanBeReadAndOneEpisodeBroughtBeforeSubscribing() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true); try await db.ensureState()
    let library = PodcastLibrary(database: db, publisher: FeedHTTP())
    let feed = "https://example.com/rss"
    #expect(try await library.readPodcast(feed).episodes.count == 2)
    #expect(try await db.readLibrary().episodes.isEmpty)
    #expect(try await library.search(feed).first?.title == "A & B")
    let id = try await library.bringEpisode(feed, guid: "one")
    #expect(try await db.readLibrary().episodes.count == 1)
    #expect(try await db.readLibrary().subscriptions.first?.unsubscribedAt != nil)
    try await db.record(.addEntry(playlistId: defaultPlaylistId, episodeId: id, placement: .last), at: 1)
    let sub = try await library.subscribe(feed)
    #expect(sub.unsubscribedAt == nil)
    #expect(try await db.readLibrary().episodes.count == 2)
    #expect(try await library.bringEpisode(feed, guid: "one") == id)
    try await library.refresh()
    #expect(try await db.readLibrary().episodes.count == 2)
    try await library.unsubscribe(sub.id)
    _ = try await library.subscribe(feed)
    #expect(try await db.readLibrary().subscriptions.first?.id == sub.id)
    #expect(try await db.outbox().isEmpty)
}
@Test func opmlRoundTripNestedOutlinesDeduplicatesAndEscapes() throws {
    let sub = Subscription(id: "s", feedUrl: "https://example.com/feed?a=1&b=2", title: "A < B & ‘C’ \"D\"", author: nil, description: nil, artwork: nil, subscribedAt: 0, unsubscribedAt: nil, playedThreshold: nil, playbackSettings: .init())
    var removed = sub; removed.id = "r"; removed.feedUrl = "https://removed"; removed.unsubscribedAt = 2
    #expect(try OPML.parse(OPML.generate([sub, removed])) == [sub.feedUrl])
    #expect(try OPML.parse("<opml><body><outline text='Folder'><outline xmlUrl='https://a'/><outline xmlUrl='https://a'/></outline></body></opml>") == ["https://a"])
    for xml in ["<rss/>", "<opml>", "<!DOCTYPE opml [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><opml><body/></opml>"] { #expect(throws: (any Error).self) { try OPML.parse(xml) } }
}

private actor LibraryHTTPFixture: SyncTransport {
    var paths: [String] = []
    let sub = Subscription(id: "server-s", feedUrl: "https://example.com/rss", title: "Podcast", author: nil, description: nil, artwork: nil, subscribedAt: 1, unsubscribedAt: nil, playedThreshold: nil, playbackSettings: .init())
    var episode: Episode { Episode(id: "server-e", subscriptionId: sub.id, guid: "one", title: "Episode", description: "", published: 0, duration: nil, audioUrl: "https://example.com/audio.mp3", artwork: nil, chapters: [], audioUpdatedAt: nil) }
    func request(method: String, path: String, body: String?) async throws -> String {
        paths.append(method + " " + path)
        if path.hasPrefix("/api/directory/search") { return #"[{"title":"Podcast","author":null,"feedUrl":"https://example.com/rss","artworkUrl":null,"source":"feed"}]"# }
        switch path {
        case "/api/podcasts/read":
            return try ProtocolJSON.encode(FeedParser.parse("<rss><channel><title>Podcast</title><item><guid>one</guid><title>Episode</title><enclosure url='https://example.com/audio.mp3'/></item></channel></rss>"))
        case "/api/subscriptions": return try ProtocolJSON.encode(sub)
        case "/api/subscriptions/server%2Ds":
            var removed = sub; removed.unsubscribedAt = 2; return try ProtocolJSON.encode(removed)
        case "/api/podcasts/episodes": return #"{"subscriptionId":"server-s","episodeId":"server-e"}"#
        case "/api/devices": return body!
        case let p where p.hasPrefix("/api/sync/pull"):
            return try ProtocolJSON.encode(PullPage(cursor: 1, snapshot: .initial(), operations: []))
        case let p where p.hasPrefix("/api/library/changes"):
            return try ProtocolJSON.encode(LibraryPage(cursor: 1, subscriptions: [sub], episodes: [episode], more: false))
        default: throw SyncResponseFailure("Unexpected request: " + path)
        }
    }
}
@Test func serverLibraryUsesExistingEndpointsAndBringsMetadataBeforeStateEdits() async throws {
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState()
    let http = LibraryHTTPFixture(), source = PodcastLibrary(database: db, transport: http, publisher: FeedHTTP())
    #expect(try await source.search("science & stories").count == 1)
    #expect(try await source.readPodcast("https://example.com/rss").episodes.count == 1)
    let sub = try await source.subscribe("https://example.com/rss")
    #expect(sub.id == "server-s")
    let id = try await source.bringEpisode(sub.feedUrl, guid: "one")
    let imported = try await db.readLibrary()
    #expect(id == "server-e" && imported.episodes.first?.id == id)
    try await source.unsubscribe(sub.id)
    #expect(try await db.readLibrary().subscriptions.first?.unsubscribedAt == 2)
    #expect(try await db.outbox().isEmpty)
    let paths = await http.paths
    #expect(paths.contains("GET /api/directory/search?q=science%20%26%20stories"))
    #expect(paths.contains("POST /api/podcasts/episodes"))
}

private actor PausedPublisher: PublisherReader {
    private var shouldPause = false
    private var suspended: CheckedContinuation<Void, Never>?
    private var waiter: CheckedContinuation<Void, Never>?
    func holdNext() { shouldPause = true }
    func waitForRead() async { if suspended != nil { return }; await withCheckedContinuation { waiter = $0 } }
    func release() { suspended?.resume(); suspended = nil }
    func read(_ url: URL) async throws -> Data {
        if shouldPause {
            shouldPause = false
            await withCheckedContinuation { continuation in suspended = continuation; waiter?.resume(); waiter = nil }
        }
        return try await FeedHTTP().read(url)
    }
}
@Test func standaloneRefreshDoesNotReactivateAnUnsubscribedPodcast() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true); try await db.ensureState()
    let publisher = PausedPublisher()
    let library = PodcastLibrary(database: db, publisher: publisher)
    let sub = try await library.subscribe("https://example.com/rss")
    await publisher.holdNext()
    let refreshing = Task { try await library.refresh() }
    await publisher.waitForRead()
    try await library.unsubscribe(sub.id)
    await publisher.release(); try await refreshing.value
    #expect(try await db.readLibrary().subscriptions.first?.unsubscribedAt != nil)
    #expect(try await db.readLibrary().episodes.count == 2)
}
