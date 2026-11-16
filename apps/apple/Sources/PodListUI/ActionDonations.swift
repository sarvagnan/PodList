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
    public let isEnabled: Bool

    /// Development builds must not contribute to Spotlight or Siri suggestions.
    nonisolated public static var isReleaseBuild: Bool {
        #if DEBUG
        false
        #else
        true
        #endif
    }

    public init(bundleIdentifier: String? = Bundle.main.bundleIdentifier,
                environment: [String: String] = ProcessInfo.processInfo.environment,
                isReleaseBuild: Bool = ActionDonations.isReleaseBuild) {
        isEnabled = Self.isEnabled(bundleIdentifier: bundleIdentifier, environment: environment, isReleaseBuild: isReleaseBuild)
    }
    nonisolated public static func isEnabled(bundleIdentifier: String?, environment: [String: String],
                                            isReleaseBuild: Bool = ActionDonations.isReleaseBuild) -> Bool {
        isReleaseBuild && !(bundleIdentifier?.hasPrefix("app.podlist.uitour.") ?? false)
            && environment["PODLIST_UI_DATA_DIRECTORY"] == nil
    }
    public func record(_ action: ActionDonation) {
        guard isEnabled else { return }
        handler?(action)
    }
}
