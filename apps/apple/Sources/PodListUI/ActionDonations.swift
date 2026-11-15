import Foundation
import PodListDomain

/// Semantic user actions emitted once by the shared edit/transport paths.
public enum ActionDonation: Equatable, Sendable {
    case play
    case playEpisode(String, playlist: String)
    case playInPlaylist(String, playlist: String)
    case add([String], playlist: String, placement: Placement)
    case star([String], starred: Bool)
    case markPlayed([String], played: Bool)
}

@MainActor
public final class ActionDonations {
    public var handler: (@MainActor (ActionDonation) -> Void)?
    private let enabled: Bool

    public init(bundleIdentifier: String? = Bundle.main.bundleIdentifier,
                environment: [String: String] = ProcessInfo.processInfo.environment) {
        enabled = Self.isEnabled(bundleIdentifier: bundleIdentifier, environment: environment)
    }
    nonisolated public static func isEnabled(bundleIdentifier: String?, environment: [String: String]) -> Bool {
        !(bundleIdentifier?.hasPrefix("app.podlist.uitour.") ?? false)
            && environment["PODLIST_UI_DATA_DIRECTORY"] == nil
    }
    public func record(_ action: ActionDonation) {
        guard enabled else { return }
        handler?(action)
    }
}
