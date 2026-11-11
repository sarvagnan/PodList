import Foundation
import PodListDomain

public struct CompiledQuery: Sendable {
    public let sql: String
    public let params: [SQLValue]
}

public enum ViewQuery {
    private static let inEntry = "EXISTS (SELECT 1 FROM entry_index x WHERE x.episode_id = e.id)"
    public static func compile(_ view: View, now: Int64) -> CompiledQuery {
        compile(filter: view.filter, sort: view.sort, limit: view.limit, now: now)
    }
    public static func compile(filter: ViewFilter, sort: ViewSort, limit: Int64?, now: Int64) -> CompiledQuery {
        var conditions = ["(s.unsubscribed_at IS NULL OR COALESCE(st.starred, 0) = 1 OR \(inEntry))"]
        var params: [SQLValue] = []
        switch filter.published {
        case let .lastDays(days): conditions.append("e.published >= ?"); params.append(.real(Double(now) - Double(days) * 86_400_000))
        case let .between(from, to):
            if let from { conditions.append("e.published >= ?"); params.append(.integer(from)) }
            if let to { conditions.append("e.published <= ?"); params.append(.integer(to)) }
        case nil: break
        }
        if let podcasts = filter.podcasts {
            let mode = podcasts.mode == .include ? "IN" : "NOT IN"
            conditions.append("e.subscription_id \(mode) (\(podcasts.subscriptionIds.map { _ in "?" }.joined(separator: ", ")))")
            params += podcasts.subscriptionIds.map(SQLValue.text)
        }
        if let text = filter.text {
            // Empty text is unrestricted, just as the contract's LIKE '%%'.
            for word in Mentions.words(text) {
                conditions.append("(e.title_folded LIKE ? ESCAPE '\\' OR e.description_folded LIKE ? ESCAPE '\\' OR s.title_folded LIKE ? ESCAPE '\\')")
                let escaped = word.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "%", with: "\\%").replacingOccurrences(of: "_", with: "\\_")
                params += Array(repeating: .text("%\(escaped)%"), count: 3)
            }
        }
        switch filter.played {
        case .unplayed: conditions.append("st.played_at IS NULL")
        case .played: conditions.append("st.played_at IS NOT NULL")
        case .inProgress: conditions.append("st.played_at IS NULL AND EXISTS (SELECT 1 FROM entry_index x WHERE x.episode_id = e.id AND x.position > 0)")
        case nil: break
        }
        if let starred = filter.starred { conditions.append("COALESCE(st.starred, 0) = \(starred ? 1 : 0)") }
        if filter.notInAnyPlaylist == true { conditions.append("NOT \(inEntry)") }
        if let duration = filter.minDuration { conditions.append("e.duration >= ?"); params.append(.real(duration)) }
        if let duration = filter.maxDuration { conditions.append("e.duration <= ?"); params.append(.real(duration)) }
        let order: String = switch sort {
        case .publishedAsc: "e.published ASC, e.id"
        case .publishedDesc: "e.published DESC, e.id"
        case .durationAsc: "e.duration ASC NULLS LAST, e.id"
        case .durationDesc: "e.duration DESC NULLS LAST, e.id"
        }
        var sql = """
        SELECT e.id, e.subscription_id, e.title, e.published, e.duration, e.artwork_url,
        s.title AS podcast, s.artwork_url AS podcast_artwork_url, s.website_url AS podcast_website_url, s.feed_url,
        st.played_at, COALESCE(st.starred, 0) AS starred
        FROM episode e JOIN subscription s ON s.id = e.subscription_id
        LEFT JOIN episode_state st ON st.episode_id = e.id
        WHERE \(conditions.joined(separator: "\nAND "))
        ORDER BY \(order)
        """
        if let limit { sql += "\nLIMIT ?"; params.append(.integer(limit)) }
        return CompiledQuery(sql: sql, params: params)
    }
}
