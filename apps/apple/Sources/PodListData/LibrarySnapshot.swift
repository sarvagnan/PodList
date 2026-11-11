import Foundation
import PodListDomain

/// A consistent read of State and Library, including retained metadata for Orphaned Entries.
public struct LibrarySnapshot: Equatable, Sendable {
    public let state: State
    public let subscriptions: [Subscription]
    public let episodes: [Episode]

    public init(state: State, subscriptions: [Subscription], episodes: [Episode]) {
        self.state = state; self.subscriptions = subscriptions; self.episodes = episodes
    }
}

extension LocalDatabase {
    /// No suspension between reads: all three collections belong to the same actor turn.
    public func readLibrary() throws -> LibrarySnapshot {
        let subscriptions = try query("SELECT * FROM subscription ORDER BY title, id").map { row in
            Subscription(id: row["id"]!.string!, feedUrl: row["feed_url"]!.string!, title: row["title"]!.string!,
                author: row["author"]?.string, description: row["description"]?.string,
                artwork: row["artwork_url"]?.string.map { Artwork(url: $0) },
                subscribedAt: row["subscribed_at"]!.int!, unsubscribedAt: row["unsubscribed_at"]?.int,
                playedThreshold: row["played_threshold"]?.double,
                playbackSettings: try ProtocolJSON.decode(PlaybackSettingsOverride.self, from: row["playback_settings"]!.string!))
        }
        let episodes = try query("SELECT * FROM episode ORDER BY published DESC, id").map { row in
            Episode(id: row["id"]!.string!, subscriptionId: row["subscription_id"]!.string!, guid: row["guid"]!.string!,
                title: row["title"]!.string!, description: row["description"]!.string!, published: row["published"]!.int!,
                duration: row["duration"]?.double, audioUrl: row["audio_url"]!.string!,
                artwork: row["artwork_url"]?.string.map { Artwork(url: $0) },
                chapters: try ProtocolJSON.decode([Chapter].self, from: row["chapters"]!.string!),
                audioUpdatedAt: row["audio_updated_at"]?.int)
        }
        return LibrarySnapshot(state: try loadState(), subscriptions: subscriptions, episodes: episodes)
    }
}
