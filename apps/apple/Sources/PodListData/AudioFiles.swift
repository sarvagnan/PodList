import Foundation
import CryptoKit

/// IDs never become paths; only validated complete transfers become playable.
public struct AudioFiles: Sendable {
    public let directory: URL
    public init(directory: URL) throws {
        self.directory = directory
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }
    public func target(_ id: String) -> URL {
        let digest = SHA256.hash(data: Data(id.utf8)).map { String(format: "%02x", $0) }.joined()
        return directory.appendingPathComponent(digest + ".audio")
    }
    public func stored(_ id: String, bytes: Int64) -> URL? {
        let file = target(id)
        guard bytes > 0, let size = try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize, Int64(size) == bytes else { return nil }
        return file
    }
    public func commit(_ partial: URL, id: String, expected: Int64) throws -> Int64 {
        let bytes = Int64(try partial.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0)
        guard bytes > 0, expected <= 0 || bytes == expected else { throw SyncResponseFailure("Incomplete audio transfer") }
        // POSIX rename atomically replaces a file on the same Application Support volume.
        let staging = directory.appendingPathComponent(UUID().uuidString + ".part")
        try FileManager.default.moveItem(at: partial, to: staging)
        defer { try? FileManager.default.removeItem(at: staging) }
        guard rename(staging.path, target(id).path) == 0 else { throw CocoaError(.fileWriteUnknown) }
        return bytes
    }
    public func remove(_ id: String) throws {
        let file = target(id)
        if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
    }
}
