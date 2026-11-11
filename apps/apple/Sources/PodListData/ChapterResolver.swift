import Foundation
import PodListDomain

public enum ChapterResolver {
    /// Both paths use the Episode cache. Failed publisher reads remain retryable after going online.
    public static func resolve(episodeID: String, origin: URL?, database: LocalDatabase, stored: URL? = nil,
                               transport: (any SyncTransport)? = nil, publisher: any PublisherReader = PublisherHTTP()) async throws -> [Chapter] {
        let row = try await database.query("SELECT chapters, chapters_url, chapters_fetched_at, audio_url FROM episode WHERE id = ?", [.text(episodeID)]).first
        let cached = try row?["chapters"]?.string.map { try ProtocolJSON.decode([Chapter].self, from: $0) } ?? []
        if row?["chapters_fetched_at"]?.int != nil { return cached }
        var chapters: [Chapter] = [], failed = false
        let transport = try transport ?? origin.map { try HttpTransport(address: ServerAddress($0.absoluteString, allowInsecureLocalhost: true)) }
        if let transport {
            var allowed = CharacterSet.urlPathAllowed; allowed.remove(charactersIn: "/?#%")
            let encoded = episodeID.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""
            do { chapters = try ProtocolJSON.decode([Chapter].self, from: await transport.request(method: "GET", path: "/api/episodes/\(encoded)/chapters", body: nil)) }
            catch { failed = true }
        } else if let raw = row?["chapters_url"]?.string, let url = URL(string: raw) {
            do { chapters = try publisherChapters(await publisher.read(url)) }
            catch { failed = true }
        }
        if chapters.isEmpty, let stored {
            do {
                let handle = try FileHandle(forReadingFrom: stored)
                defer { try? handle.close() }
                chapters = ID3Chapters.parse(try handle.read(upToCount: ID3Chapters.probeBytes) ?? Data())
            } catch { failed = true }
        }
        if chapters.isEmpty, transport == nil, let raw = row?["audio_url"]?.string, let url = URL(string: raw) {
            do { chapters = ID3Chapters.parse(try await publisher.readPrefix(url, bytes: ID3Chapters.probeBytes)) }
            catch { failed = true }
        }
        chapters = chapters.filter { $0.start.isFinite && $0.start >= 0 }.sorted { $0.start < $1.start }
        if chapters.isEmpty && !cached.isEmpty { return cached }
        if !failed || !chapters.isEmpty {
            try await database.execute("UPDATE episode SET chapters = ?, chapters_fetched_at = ? WHERE id = ? AND chapters_url IS ? AND audio_url IS ?", [
                .text(try ProtocolJSON.encode(chapters)), failed ? .null : .integer(Int64(Date().timeIntervalSince1970 * 1000)), .text(episodeID),
                .optional(row?["chapters_url"]?.string), .optional(row?["audio_url"]?.string)])
        }
        return chapters
    }
    public static func publisherChapters(_ data: Data) throws -> [Chapter] {
        struct Item: Decodable { let startTime: Double; let title: String?; let img: String?; let url: String?; let toc: Bool? }
        struct Document: Decodable { let chapters: [Item] }
        return try JSONDecoder().decode(Document.self, from: data).chapters.filter { $0.toc != false && $0.startTime.isFinite }
            .sorted { $0.startTime < $1.startTime }.map { Chapter(start: max(0, $0.startTime), title: $0.title ?? "", artwork: $0.img.map(Artwork.init), url: $0.url) }
    }
}
