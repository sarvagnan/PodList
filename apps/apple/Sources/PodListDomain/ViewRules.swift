import Foundation

public enum ViewRules {
    /// The same View semantics as the SQL compiler, for callers holding a Library in memory.
    public static func evaluate(_ view: View, subscriptions: [Subscription], episodes: [Episode], state: State, now: Int64) -> [Episode] {
        let subscriptions = Dictionary(uniqueKeysWithValues: subscriptions.map { ($0.id, $0) })
        let entries = state.playlists.flatMap(\.entries)
        let inEntry = Set(entries.map(\.episodeId))
        let inProgress = Set(entries.filter { $0.position > 0 }.map(\.episodeId))
        let f = view.filter
        var result = episodes.filter { e in
            guard let s = subscriptions[e.subscriptionId] else { return false }
            let fact = state.episodeStates[e.id]
            if s.unsubscribedAt != nil && fact?.starred != true && !inEntry.contains(e.id) { return false }
            switch f.published {
            case let .lastDays(days): if Double(e.published) < Double(now) - Double(days) * 86_400_000 { return false }
            case let .between(from, to):
                if let from, e.published < from { return false }; if let to, e.published > to { return false }
            case nil: break
            }
            if let podcasts = f.podcasts, podcasts.subscriptionIds.contains(e.subscriptionId) != (podcasts.mode == .include) { return false }
            if let text = f.text {
                let fields = [e.title, e.description, s.title].map(Mentions.fold)
                if !Mentions.words(text).allSatisfy({ word in fields.contains { $0.range(of: word, options: .literal) != nil } }) { return false }
            }
            switch f.played {
            case .played: if fact?.played == nil { return false }
            case .unplayed: if fact?.played != nil { return false }
            case .inProgress: if fact?.played != nil || !inProgress.contains(e.id) { return false }
            case nil: break
            }
            if let starred = f.starred, (fact?.starred ?? false) != starred { return false }
            if f.notInAnyPlaylist == true && inEntry.contains(e.id) { return false }
            if let min = f.minDuration, e.duration == nil || e.duration! < min { return false }
            if let max = f.maxDuration, e.duration == nil || e.duration! > max { return false }
            return true
        }
        result.sort { a, b in
            // SQLite's BINARY tie order is UTF-8, not Swift's canonically equivalent String order.
            let tie = a.id.utf8.lexicographicallyPrecedes(b.id.utf8)
            switch view.sort {
            case .publishedAsc: return a.published == b.published ? tie : a.published < b.published
            case .publishedDesc: return a.published == b.published ? tie : a.published > b.published
            case .durationAsc, .durationDesc:
                if a.duration == b.duration { return tie }
                guard let ad = a.duration else { return false }; guard let bd = b.duration else { return true }
                return view.sort == .durationAsc ? ad < bd : ad > bd
            }
        }
        if let limit = view.limit, limit >= 0 { return Array(result.prefix(Int(clamping: limit))) }
        return result
    }
}
