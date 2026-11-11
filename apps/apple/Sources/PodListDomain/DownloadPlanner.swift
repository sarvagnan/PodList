import Foundation

public struct DownloadEpisode: Sendable {
    public let id: String, subscriptionId: String
    public let published: Int64
    public let entry: Bool, played: Bool, starred: Bool
    public init(id: String, subscriptionId: String, published: Int64, entry: Bool, played: Bool, starred: Bool) {
        self.id = id; self.subscriptionId = subscriptionId; self.published = published
        self.entry = entry; self.played = played; self.starred = starred
    }
}
public struct StoredDownload: Sendable {
    public let episodeId: String
    public let manual: Bool
    public init(episodeId: String, manual: Bool) { self.episodeId = episodeId; self.manual = manual }
}
public struct DownloadPlan: Equatable, Sendable {
    public let fetch: [String], discard: [String]
    public let legacySince: [String: Int64]
}
public enum DownloadPlanner {
    public static func plan(deviceId: String, rules: [DownloadRule], episodes: [DownloadEpisode],
                            stored: [StoredDownload], legacySince: [String: Int64], now: Int64) -> DownloadPlan {
        let mine = rules.filter { $0.deviceId == deviceId }
        let legacy = Dictionary(uniqueKeysWithValues: mine.filter { $0.mode == .allNew && $0.since == nil }
            .map { ($0.subscriptionId, legacySince[$0.subscriptionId] ?? now) })
        var wanted: [String] = []
        for rule in mine where rule.mode != .never {
            let own = episodes.filter { $0.subscriptionId == rule.subscriptionId && !$0.played }
            wanted += own.filter(\.entry).map(\.id)
            if rule.mode == .allNew {
                let fresh = own.filter { !$0.entry && $0.published >= (rule.since ?? legacy[rule.subscriptionId] ?? now) }
                    .sorted { $0.published > $1.published }
                wanted += fresh.prefix(rule.keepAtMost.map { Int(clamping: max(0, $0)) } ?? fresh.count).map(\.id)
            }
        }
        let storedIDs = Set(stored.map(\.episodeId)), wantedIDs = Set(wanted)
        let stars = Set(episodes.filter(\.starred).map(\.id))
        return DownloadPlan(fetch: wanted.filter { !storedIDs.contains($0) },
            discard: stored.filter { !$0.manual && !wantedIDs.contains($0.episodeId) && !stars.contains($0.episodeId) }.map(\.episodeId), legacySince: legacy)
    }
}
public struct DownloadProgress: Equatable, Sendable {
    public let received: Int64, total: Int64
    public init(received: Int64, total: Int64) { self.received = received; self.total = total }
    public var fraction: Double? { total > 0 ? min(1, max(0, Double(received) / Double(total))) : nil }
}
