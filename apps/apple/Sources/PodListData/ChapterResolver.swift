import Foundation
import PodListDomain

public enum ChapterResolver {
    /// The existing endpoint resolves publisher JSON then bounded ID3 Chapters. Cache locally;
    /// it is an HTTP read, never a queued Operation. Stored ID3 works without the server.
    public static func resolve(episodeID: String, origin: URL, database: LocalDatabase, stored: URL? = nil, transport: (any SyncTransport)? = nil) async throws -> [Chapter] {
        let transport = try transport ?? HttpTransport(address: ServerAddress(origin.absoluteString, allowInsecureLocalhost: true))
        var allowed = CharacterSet.urlPathAllowed; allowed.remove(charactersIn: "/?#%")
        let encoded = episodeID.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""
        var chapters: [Chapter] = []
        if let text = try? await transport.request(method: "GET", path: "/api/episodes/\(encoded)/chapters", body: nil),
           let resolved = try? ProtocolJSON.decode([Chapter].self, from: text) {
            chapters = resolved.filter { $0.start.isFinite && $0.start >= 0 }.sorted { $0.start < $1.start }
        }
        if chapters.isEmpty, let stored {
            let handle = try FileHandle(forReadingFrom: stored)
            defer { try? handle.close() }
            chapters = ID3Chapters.parse(try handle.read(upToCount: ID3Chapters.probeBytes) ?? Data())
        }
        if !chapters.isEmpty {
            try await database.execute("UPDATE episode SET chapters = ? WHERE id = ?", [.text(try ProtocolJSON.encode(chapters)), .text(episodeID)])
        }
        return chapters
    }
}
