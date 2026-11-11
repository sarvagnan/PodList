import Foundation
import Testing
import PodListDomain
@testable import PodListData

private func id3Tag(version: UInt8 = 3) -> Data {
    func big(_ n: Int) -> [UInt8] { [UInt8((n >> 24) & 255), UInt8((n >> 16) & 255), UInt8((n >> 8) & 255), UInt8(n & 255)] }
    func safe(_ n: Int) -> [UInt8] { [UInt8((n >> 21) & 127), UInt8((n >> 14) & 127), UInt8((n >> 7) & 127), UInt8(n & 127)] }
    func frame(_ name: String, _ body: [UInt8]) -> [UInt8] { Array(name.utf8) + (version == 4 ? safe(body.count) : big(body.count)) + [0, 0] + body }
    let title = frame("TIT2", [3] + Array("Chapter Two".utf8))
    let body = Array("id".utf8) + [0] + big(60_000) + big(120_000) + big(0) + big(0) + title
    let chapter = frame("CHAP", body)
    return Data(Array("ID3".utf8) + [version, 0, 0] + safe(chapter.count) + chapter)
}
@Test func id3ChapterProbeSupportsV23V24AndRejectsMalformedOrTruncatedTags() {
    for version: UInt8 in [3, 4] {
        let data = id3Tag(version: version)
        #expect(ID3Chapters.parse(data) == [.init(start: 60, title: "Chapter Two", artwork: nil, url: nil)])
        #expect(ID3Chapters.parse(data.prefix(20)).isEmpty)
    }
    #expect(ID3Chapters.parse(Data()).isEmpty)
    #expect(ID3Chapters.parse(Data(repeating: 255, count: 20)).isEmpty)
}
private struct ChapterTransport: SyncTransport {
    var offline: Bool
    func request(method: String, path: String, body: String?) async throws -> String {
        if offline { throw URLError(.notConnectedToInternet) }
        #expect(path == "/api/episodes/e/chapters")
        return #"[{"start":0,"title":"Server chapter","artwork":null,"url":null}]"#
    }
}
@Test func chapterResolutionUsesServerThenLocalID3Offline() async throws {
    let db = try LocalDatabase(path: ":memory:")
    let origin = URL(string: "https://server")!
    let server = try await ChapterResolver.resolve(episodeID: "e", origin: origin, database: db, transport: ChapterTransport(offline: false))
    #expect(server.first?.title == "Server chapter")
    let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: file) }
    try id3Tag().write(to: file)
    let local = try await ChapterResolver.resolve(episodeID: "e", origin: origin, database: db, stored: file, transport: ChapterTransport(offline: true))
    #expect(local.first?.start == 60)
    #expect(AudioSource.proxy(origin, episodeID: "a/b").absoluteString == "https://server/api/episodes/a%2Fb/audio")
}

private actor PublisherChaptersFixture: PublisherReader {
    var offline = false
    var reads: [String] = []
    var json = #"{"chapters":[{"startTime":60,"title":"Second","img":"https://publisher/art.png"},{"startTime":-1,"title":"First"},{"startTime":20,"toc":false}]}"#
    func setOffline(_ value: Bool) { offline = value }
    func setJSON(_ value: String) { json = value }
    func read(_ url: URL) async throws -> Data {
        reads.append(url.absoluteString)
        if offline { throw URLError(.notConnectedToInternet) }
        return url.path.hasSuffix("json") ? Data(json.utf8) : id3Tag()
    }
    func readPrefix(_ url: URL, bytes: Int) async throws -> Data {
        #expect(bytes == ID3Chapters.probeBytes)
        return try await read(url)
    }
}
private func chapterDatabase() async throws -> LocalDatabase {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    try await db.ensureState()
    let sub = Subscription(id: "s", feedUrl: "https://publisher/rss", title: "Podcast", author: nil, description: nil, artwork: nil, subscribedAt: 0, unsubscribedAt: nil, playedThreshold: nil, playbackSettings: .init())
    let ep = Episode(id: "e", subscriptionId: "s", guid: "g", title: "Episode", description: "", published: 0, duration: 100,
                     audioUrl: "https://publisher/audio.mp3", artwork: nil, chapters: [], audioUpdatedAt: nil)
    try await db.upsertLibrary(subscriptions: [sub], episodes: [ep])
    try await db.execute("UPDATE episode SET chapters_url = 'https://publisher/chapters.json' WHERE id = 'e'")
    return db
}
@Test func standalonePublisherJSONChaptersCacheAndWorkOffline() async throws {
    let db = try await chapterDatabase(), publisher = PublisherChaptersFixture()
    let chapters = try await ChapterResolver.resolve(episodeID: "e", origin: nil, database: db, publisher: publisher)
    #expect(chapters.map(\.start) == [0, 60])
    #expect(chapters.last?.artwork?.url == "https://publisher/art.png")
    #expect(await publisher.reads.count == 1)
    await publisher.setOffline(true)
    #expect(try await ChapterResolver.resolve(episodeID: "e", origin: nil, database: db, publisher: publisher) == chapters)
    #expect(await publisher.reads.count == 1)
}
@Test func standaloneStreamedID3FallbackAndFailedLookupsRetry() async throws {
    let db = try await chapterDatabase(), publisher = PublisherChaptersFixture()
    await publisher.setOffline(true)
    #expect(try await ChapterResolver.resolve(episodeID: "e", origin: nil, database: db, publisher: publisher).isEmpty)
    #expect(try await db.query("SELECT chapters_fetched_at FROM episode").first?["chapters_fetched_at"] == .null)
    await publisher.setOffline(false); await publisher.setJSON(#"{"chapters":[]}"#)
    let chapters = try await ChapterResolver.resolve(episodeID: "e", origin: nil, database: db, publisher: publisher)
    #expect(chapters.first?.title == "Chapter Two")
    let count = await publisher.reads.count
    #expect(try await ChapterResolver.resolve(episodeID: "e", origin: nil, database: db, publisher: publisher) == chapters)
    #expect(await publisher.reads.count == count)
}

@Test func catalogueRefreshKeepsChapterCacheUntilAudioIsReplaced() async throws {
    let db = try LocalDatabase(path: ":memory:")
    try await db.ensureState()
    let source = try await chapterDatabase().readLibrary()
    try await db.upsertLibrary(subscriptions: source.subscriptions, episodes: source.episodes)
    let chapters = try await ChapterResolver.resolve(episodeID: "e", origin: URL(string: "https://server"), database: db, transport: ChapterTransport(offline: false))
    try await db.upsertLibrary(subscriptions: source.subscriptions, episodes: source.episodes)
    #expect(try await db.readLibrary().episodes.first?.chapters == chapters)
    #expect(try await ChapterResolver.resolve(episodeID: "e", origin: URL(string: "https://server"), database: db, transport: ChapterTransport(offline: true)) == chapters)
    var replaced = source.episodes[0]; replaced.audioUpdatedAt = 100
    try await db.upsertLibrary(subscriptions: [], episodes: [replaced])
    #expect(try await db.readLibrary().episodes.first?.chapters.isEmpty == true)
    #expect(try await db.query("SELECT chapters_fetched_at FROM episode").first?["chapters_fetched_at"] == .null)
}
