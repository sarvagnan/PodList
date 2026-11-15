import Foundation
import PodListDomain

enum ViewSelectionAction {
    static func view(in library: LibraryModel, destination: Destination?, selection: Set<String>) -> PodListDomain.View? {
        let id: String?
        switch destination {
        case let .view(value): id = value
        case .views: id = selection.count == 1 ? selection.first : nil
        default: id = nil
        }
        return library.state.views.first { $0.id == id }
    }
}

/// Titles and IDs in display order, independent of the domain represented by a row.
struct TypeSelectionRow: Equatable {
    let id: String
    let title: String
}

/// Native-style incremental matching, including repeated-letter cycling.
struct RowTypeSelection {
    static let resetInterval: TimeInterval = 1
    private var query = ""
    private var lastInput = -Double.infinity

    mutating func select(_ text: String, in rows: [TypeSelectionRow], selected: String?, at now: TimeInterval) -> String? {
        guard !text.isEmpty else { return nil }
        let continuing = now - lastInput < Self.resetInterval
        let cycling = continuing && query.compare(text, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
        query = continuing && !cycling ? query + text : text
        lastInput = now
        func matches(_ prefix: String) -> [TypeSelectionRow] {
            rows.filter { $0.title.range(of: prefix, options: [.anchored, .caseInsensitive, .diacriticInsensitive]) != nil }
        }
        var candidates = matches(query)
        if candidates.isEmpty { query = text; candidates = matches(query) }
        if cycling, let index = candidates.firstIndex(where: { $0.id == selected }) {
            return candidates[(index + 1) % candidates.count].id
        }
        return candidates.first?.id
    }
}
