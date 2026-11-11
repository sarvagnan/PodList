import Foundation
import PodListDomain

/// A consistent read of State and Library, including retained metadata for Orphaned Entries.
public struct LibrarySnapshot: Equatable, Sendable {
    public let isReady: Bool
    public let state: State
    public let subscriptions: [Subscription]
    public let episodes: [Episode]
    public let episodeLinks: [String: String]
    public let podcastLinks: [String: String]

    public init(state: State, subscriptions: [Subscription], episodes: [Episode], episodeLinks: [String: String] = [:], podcastLinks: [String: String] = [:], isReady: Bool = true) {
        self.isReady = isReady
        self.state = state; self.subscriptions = subscriptions; self.episodes = episodes; self.episodeLinks = episodeLinks; self.podcastLinks = podcastLinks
    }
}

extension LocalDatabase {
    /// No suspension between reads: all three collections belong to the same actor turn.
    public func readLibrary() throws -> LibrarySnapshot {
        var subscriptions = try query("SELECT * FROM subscription ORDER BY title, id").map { row in
            Subscription(id: row["id"]!.string!, feedUrl: row["feed_url"]!.string!, title: row["title"]!.string!,
                author: row["author"]?.string, description: row["description"]?.string,
                artwork: row["artwork_url"]?.string.map { Artwork(url: $0) },
                subscribedAt: row["subscribed_at"]!.int!, unsubscribedAt: row["unsubscribed_at"]?.int,
                playedThreshold: row["played_threshold"]?.double,
                playbackSettings: try ProtocolJSON.decode(PlaybackSettingsOverride.self, from: row["playback_settings"]!.string!))
        }
        // Overrides are metadata intentions. Replay the pending replacement documents in outbox order.
        for operation in try outbox() {
            if case let .setSubscriptionOverrides(id, settings, threshold) = operation.change,
               let index = subscriptions.firstIndex(where: { $0.id == id }) {
                subscriptions[index].playbackSettings = settings
                subscriptions[index].playedThreshold = threshold
            }
        }
        let episodes = try query("SELECT * FROM episode ORDER BY published DESC, id").map { row in
            Episode(id: row["id"]!.string!, subscriptionId: row["subscription_id"]!.string!, guid: row["guid"]!.string!,
                title: row["title"]!.string!, description: row["description"]!.string!, published: row["published"]!.int!,
                duration: row["duration"]?.double, audioUrl: row["audio_url"]!.string!,
                artwork: row["artwork_url"]?.string.map { Artwork(url: $0) },
                chapters: try ProtocolJSON.decode([Chapter].self, from: row["chapters"]!.string!),
                audioUpdatedAt: row["audio_updated_at"]?.int)
        }
        let episodeLinks = try query("SELECT id, website_url FROM episode WHERE website_url IS NOT NULL").reduce(into: [String: String]()) { $0[$1["id"]!.string!] = $1["website_url"]!.string! }
        let podcastLinks = try query("SELECT id, website_url FROM subscription WHERE website_url IS NOT NULL").reduce(into: [String: String]()) { $0[$1["id"]!.string!] = $1["website_url"]!.string! }
        return LibrarySnapshot(state: try loadState(), subscriptions: subscriptions, episodes: episodes, episodeLinks: episodeLinks, podcastLinks: podcastLinks, isReady: try hasLoadedLibrary())
    }
}
