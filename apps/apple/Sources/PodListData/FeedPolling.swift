import Foundation
import PodListDomain

public struct FeedPollState: Sendable, Equatable {
    public static let interval: Int64 = 30 * 60 * 1000
    public let etag: String?
    public let lastModified: String?
    public let checkedAt: Int64?
    public let failures: Int64
    public let lastError: String?
    /// Same policy as the server: 30 minutes, one hour, two hours … at most a day.
    public var backoff: Int64 { failures <= 0 ? 0 : min(Self.interval * (1 << min(failures - 1, 6)), 86_400_000) }
}

extension LocalDatabase {
    public func feedPollState(_ id: String) throws -> FeedPollState {
        let row = try query("SELECT * FROM feed_state WHERE subscription_id = ?", [.text(id)]).first
        return FeedPollState(etag: row?["etag"]?.string, lastModified: row?["last_modified"]?.string,
            checkedAt: row?["checked_at"]?.int, failures: row?["failures"]?.int ?? 0, lastError: row?["last_error"]?.string)
    }
    func subscribePolledFeed(_ feed: String, parsed: ParsedFeed, response: PublisherResponse, at: Int64) throws -> Subscription {
        try storage.transaction {
            let sub = try storePodcast(feed, parsed: parsed, subscribe: true, guid: nil)
            try commitFeedPoll(sub, parsed: nil, etag: response.etag, lastModified: response.lastModified, at: at)
            return sub
        }
    }
    func commitFeedPoll(_ subscription: PodListDomain.Subscription, parsed: ParsedFeed?, etag: String?, lastModified: String?, at: Int64) throws {
        try storage.transaction {
            // storePodcast re-reads Subscription metadata in this turn, preserving concurrent Unsubscribe.
            if let parsed { _ = try storePodcast(subscription.feedUrl, parsed: parsed, subscribe: false, guid: nil) }
            try execute("INSERT INTO feed_state (subscription_id, etag, last_modified, checked_at, failures, last_error) VALUES (?, ?, ?, ?, 0, NULL) ON CONFLICT (subscription_id) DO UPDATE SET etag = excluded.etag, last_modified = excluded.last_modified, checked_at = excluded.checked_at, failures = 0, last_error = NULL",
                [.text(subscription.id), .optional(etag), .optional(lastModified), .integer(at)])
        }
    }
    func failFeedPoll(_ id: String, at: Int64, error: String) throws {
        try execute("INSERT INTO feed_state (subscription_id, checked_at, failures, last_error) VALUES (?, ?, 1, ?) ON CONFLICT (subscription_id) DO UPDATE SET checked_at = excluded.checked_at, failures = feed_state.failures + 1, last_error = excluded.last_error", [.text(id), .integer(at), .text(error)])
    }
}
