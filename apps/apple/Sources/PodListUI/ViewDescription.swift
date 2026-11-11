import Foundation
import PodListDomain

public enum ViewDescription {
    public static func text(_ view: PodListDomain.View, library: LibraryModel) -> String {
        var parts: [String] = []
        let filter = view.filter
        switch filter.published {
        case let .lastDays(days): parts.append("Published in the last \(days) days")
        case let .between(from, to):
            func date(_ value: Int64) -> String { Date(timeIntervalSince1970: Double(value) / 1000).formatted(date: .abbreviated, time: .omitted) }
            if let from { parts.append("Published from \(date(from))") }
            if let to { parts.append("Published through \(date(to))") }
        case nil: break
        }
        if let podcasts = filter.podcasts {
            let names = podcasts.subscriptionIds.map { id in library.snapshot.subscriptions.first { $0.id == id }?.title ?? "Subscription pending sync" }
            parts.append("\(podcasts.mode == .include ? "Podcasts" : "Excluding"): \(names.isEmpty ? "None" : names.joined(separator: ", "))")
        }
        if let text = filter.text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { parts.append("Mentions “\(text)”") }
        if let played = filter.played {
            parts.append(played == .inProgress ? "In progress" : played == .played ? "Played" : "Unplayed")
        }
        if let starred = filter.starred { parts.append(starred ? "Starred" : "Not Starred") }
        if filter.notInAnyPlaylist == true { parts.append("Not in any Playlist") }
        if let min = filter.minDuration { parts.append("At least \(Presentation.time(min))") }
        if let max = filter.maxDuration { parts.append("At most \(Presentation.time(max))") }
        if parts.isEmpty { parts.append("All Episodes") }
        let ordering = switch view.sort {
        case .publishedDesc: "Newest Published first"
        case .publishedAsc: "Oldest Published first"
        case .durationAsc: "Shortest first"
        case .durationDesc: "Longest first"
        }
        parts.append(ordering)
        if let limit = view.limit { parts.append("Show \(limit)") }
        return parts.joined(separator: " · ")
    }
}
