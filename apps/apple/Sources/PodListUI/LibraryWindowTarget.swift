import Foundation

/// A fresh identity opens another browsing window, even for the same destination.
public struct LibraryWindowTarget: Codable, Hashable, Sendable {
    public let destination: Destination
    public let id: UUID

    public init(destination: Destination) {
        self.destination = destination
        id = UUID()
    }
}
