import Foundation

/// Stable Library destinations. Resolving a link never changes playback or subscribes.
public enum PodListLink: Equatable, Sendable {
    case episode(String), playlist(String), view(String), podcast(String)

    public init?(url: URL) {
        guard let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
              parts.scheme?.lowercased() == "podlist", parts.user == nil, parts.password == nil,
              parts.port == nil, parts.query == nil, parts.fragment == nil,
              parts.percentEncodedPath.hasPrefix("/"),
              let value = String(parts.percentEncodedPath.dropFirst()).removingPercentEncoding,
              !value.isEmpty else { return nil }
        switch parts.host?.lowercased() {
        case "episode" where !value.contains("/"): self = .episode(value)
        case "playlist" where !value.contains("/"): self = .playlist(value)
        case "view" where !value.contains("/"): self = .view(value)
        case "podcast" where Self.feedSelection(value) != nil: self = .podcast(value)
        default: return nil
        }
    }
    public var url: URL {
        let kind: String, value: String
        switch self {
        case let .episode(id): kind = "episode"; value = id
        case let .playlist(id): kind = "playlist"; value = id
        case let .view(id): kind = "view"; value = id
        case let .podcast(feed): kind = "podcast"; value = feed
        }
        var parts = URLComponents()
        parts.scheme = "podlist"; parts.host = kind
        parts.percentEncodedPath = "/" + value.addingPercentEncoding(withAllowedCharacters: .alphanumerics)!
        return parts.url!
    }
    public var kindName: String {
        switch self { case .episode: "Episode"; case .playlist: "Playlist"; case .view: "View"; case .podcast: "Subscription" }
    }
    public func exists(in library: LibraryModel) -> Bool {
        switch self {
        case let .episode(id): library.libraryEpisodes.contains { $0.id == id }
        case let .playlist(id): library.state.playlists.contains { $0.id == id }
        case let .view(id): library.state.views.contains { $0.id == id }
        case let .podcast(feed): library.subscriptions.contains { $0.feedUrl == feed }
        }
    }
    public static func feedSelection(_ text: String) -> URL? {
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.contains(where: { $0.isWhitespace }), let url = ShareLinks.web(value),
              url.user == nil, url.password == nil else { return nil }
        return url
    }
}

/// A complete, testable projection used for index replacement and stale-item deletion.
public struct SpotlightRecord: Equatable, Sendable {
    public let link: PodListLink
    public let title: String
    public let podcast: String?
    public let published: Date?
    public let keywords: [String]
    public var id: String { link.url.absoluteString }

    public static func library(_ library: LibraryModel) -> [Self] {
        let episodes = library.libraryEpisodes
        let latest = Dictionary(grouping: episodes, by: \.subscriptionId).mapValues { $0.map(\.published).max() ?? 0 }
        return episodes.map { episode in
            let row = library.row(episode.id)
            return Self(link: .episode(episode.id), title: row.title, podcast: row.podcast,
                        published: row.publishedDate, keywords: ["PodList", "Episode", "Podcast", row.podcast])
        } + library.subscriptions.map { subscription in
            Self(link: .podcast(subscription.feedUrl), title: subscription.title, podcast: subscription.title,
                 published: latest[subscription.id].map { Date(timeIntervalSince1970: Double($0) / 1000) },
                 keywords: ["PodList", "Podcast", "Subscription", subscription.author ?? ""])
        } + library.state.playlists.map {
            Self(link: .playlist($0.id), title: $0.name, podcast: nil, published: nil,
                 keywords: ["PodList", "Playlist", "Episodes"])
        }
    }
}

extension WindowModel {
    /// Only browsing state changes. An unavailable link preserves the current context.
    @discardableResult func open(_ link: PodListLink, in library: LibraryModel) -> Bool {
        guard link.exists(in: library) else { return false }
        switch link {
        case let .episode(id):
            navigate(to: .search); selection = [id]
            let ids = rows(in: library).map(\.id)
            scrollAnchor = RowAnchor(id: id, index: ids.firstIndex(of: id) ?? 0)
        case let .playlist(id): navigate(to: .playlist(id))
        case let .view(id): navigate(to: .view(id))
        case let .podcast(feed):
            guard let subscription = library.subscriptions.first(where: { $0.feedUrl == feed }) else { return false }
            navigate(to: .subscription(subscription.id))
        }
        return true
    }
}
