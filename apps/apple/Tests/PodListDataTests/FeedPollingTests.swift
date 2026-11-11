import Foundation
import Synchronization
import Testing
import PodListDomain
@testable import PodListData

private let pollXML = "<rss><channel><title>Podcast</title><item><guid>one</guid><title>Episode</title><enclosure url='https://example.com/audio.mp3'/></item></channel></rss>"
private final class PollClock: Sendable {
    let value = Mutex<Int64>(1_000)
    func now() -> Int64 { value.withLock { $0 } }
    func advance(_ milliseconds: Int64) { value.withLock { $0 += milliseconds } }
}
private actor ConditionalPublisher: PublisherReader {
    struct Request: Equatable { let feed: String; let etag: String?; let modified: String? }
    var requests: [Request] = []
    var responses: [PublisherResponse] = []
    var failHosts: Set<String> = []
    func configure(_ responses: [PublisherResponse] = [], failHosts: Set<String> = []) { self.responses = responses; self.failHosts = failHosts }
    func read(_ url: URL) async throws -> Data { Data(pollXML.utf8) }
    func readFeed(_ url: URL, etag: String?, lastModified: String?) async throws -> PublisherResponse {
        requests.append(Request(feed: url.absoluteString, etag: etag, modified: lastModified))
        if failHosts.contains(url.host ?? "") { throw URLError(.cannotConnectToHost) }
        return responses.isEmpty ? PublisherResponse(data: Data(pollXML.utf8)) : responses.removeFirst()
    }
}

@Test func conditional304PreservesEpisodesAndValidatorsAndClearsFailures() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true); try await db.ensureState()
    let http = ConditionalPublisher(), clock = PollClock()
    let library = PodcastLibrary(database: db, publisher: http, now: { clock.now() })
    let sub = try await library.subscribe("https://feed.example/rss")
    await http.configure([PublisherResponse(data: Data(pollXML.utf8), etag: "\"version-1\"", lastModified: "Mon, 09 Nov 2026 10:00:00 GMT")])
    try await library.refresh()
    let before = try await db.readLibrary().episodes
    try await db.failFeedPoll(sub.id, at: clock.now(), error: "temporary")
    await http.configure([PublisherResponse(data: Data("not XML".utf8), status: 304)])
    clock.advance(100)
    try await library.refresh() // Explicit refresh bypasses the persisted failure deadline.
    #expect(try await db.readLibrary().episodes == before)
    let state = try await db.feedPollState(sub.id)
    #expect(state.etag == "\"version-1\"" && state.lastModified == "Mon, 09 Nov 2026 10:00:00 GMT")
    #expect(state.failures == 0 && state.lastError == nil && state.checkedAt == clock.now())
    #expect(await http.requests.last?.etag == state.etag)
    #expect(await http.requests.last?.modified == state.lastModified)
    // A replacement 200 with no validators clears old values, rather than reusing stale validators.
    await http.configure([PublisherResponse(data: Data(pollXML.utf8))])
    try await library.refresh()
    #expect(try await db.feedPollState(sub.id).etag == nil)
    #expect(try await db.feedPollState(sub.id).lastModified == nil)
}

@Test func pollingBackoffAndConditionalHeadersSurviveDatabaseAndClientRestart() async throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let path = directory.appendingPathComponent("standalone.sqlite").path
    let clock = PollClock(), http = ConditionalPublisher()
    let id: String
    do {
        let db = try LocalDatabase(path: path, standalone: true); try await db.ensureState()
        let library = PodcastLibrary(database: db, publisher: http, now: { clock.now() })
        id = try await library.subscribe("https://bad.example/rss").id
        await http.configure([PublisherResponse(data: Data(pollXML.utf8), etag: "v1", lastModified: "date")])
        try await library.refresh()
        clock.advance(FeedPollState.interval)
        await http.configure(failHosts: ["bad.example"])
        await #expect(throws: (any Error).self) { try await library.refresh(respectBackoff: true) }
        #expect(try await db.feedPollState(id).failures == 1)
    }
    let db = try LocalDatabase(path: path, standalone: true)
    let restarted = PodcastLibrary(database: db, publisher: http, now: { clock.now() })
    let attempts = await http.requests.count
    clock.advance(FeedPollState.interval - 1)
    try await restarted.refresh(respectBackoff: true)
    #expect(await http.requests.count == attempts)
    clock.advance(1)
    await #expect(throws: (any Error).self) { try await restarted.refresh(respectBackoff: true) }
    #expect(try await db.feedPollState(id).failures == 2)
    #expect(try await db.feedPollState(id).backoff == FeedPollState.interval * 2)
    #expect(await http.requests.last?.etag == "v1")
    #expect(await http.requests.last?.modified == "date")
    clock.advance(FeedPollState.interval)
    try await restarted.refresh(respectBackoff: true)
    #expect(await http.requests.count == attempts + 1)
    // Explicit Refresh now bypasses backoff and clears failure state on success.
    await http.configure([PublisherResponse(status: 304)])
    try await restarted.refresh()
    #expect(try await db.feedPollState(id).failures == 0)
    #expect(try await db.readLibrary().episodes.count == 1)
    let successAttempts = await http.requests.count
    try await restarted.refresh(respectBackoff: true)
    #expect(await http.requests.count == successAttempts)
    #expect(FeedPollState(etag: nil, lastModified: nil, checkedAt: nil, failures: 100, lastError: nil).backoff == 86_400_000)
}

@Test func failedFeedKeepsCachedEpisodesAndDoesNotBlockOtherFeeds() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true); try await db.ensureState()
    let http = ConditionalPublisher(), clock = PollClock()
    let library = PodcastLibrary(database: db, publisher: http, now: { clock.now() })
    let bad = try await library.subscribe("https://bad.example/rss")
    let good = try await library.subscribe("https://good.example/rss")
    let before = try await db.readLibrary().episodes
    await http.configure(failHosts: ["bad.example"])
    await #expect(throws: (any Error).self) { try await library.refresh() }
    #expect(try await db.readLibrary().episodes == before)
    #expect(try await db.feedPollState(bad.id).failures == 1)
    #expect(try await db.feedPollState(good.id).failures == 0)
    #expect(try await db.feedPollState(good.id).checkedAt == clock.now())
    #expect(await http.requests.count == 4)
}
