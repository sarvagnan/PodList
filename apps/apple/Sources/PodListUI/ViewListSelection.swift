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

/// SwiftUI hosts custom rows, so supply their names for incremental type selection.
/// Arrow navigation and primary actions remain owned by the native List.
struct ViewTypeSelection {
    private var query = ""
    private var lastInput = -Double.infinity

    mutating func select(_ text: String, in views: [PodListDomain.View], selected: String?, at now: TimeInterval) -> String? {
        let cycling = now - lastInput < 1 && query == text
        query = now - lastInput < 1 && !cycling ? query + text : text
        lastInput = now
        func matches(_ prefix: String) -> [PodListDomain.View] {
            views.filter { $0.name.range(of: prefix, options: [.anchored, .caseInsensitive, .diacriticInsensitive]) != nil }
        }
        var candidates = matches(query)
        if candidates.isEmpty { query = text; candidates = matches(query) }
        if cycling, let index = candidates.firstIndex(where: { $0.id == selected }) {
            return candidates[(index + 1) % candidates.count].id
        }
        return candidates.first?.id
    }
}
