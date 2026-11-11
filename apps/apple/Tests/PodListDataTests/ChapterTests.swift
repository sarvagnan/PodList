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
