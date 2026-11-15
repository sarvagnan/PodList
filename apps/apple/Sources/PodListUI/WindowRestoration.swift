import Foundation
import PodListDomain

enum PlaylistTab: String, CaseIterable, Codable, Sendable {
    case entries = "Entries", history = "History", timeline = "Listening Timeline"
}

/// Stable column names rather than archiving implementation-specific key paths.
struct WindowSort: Codable, Equatable, Sendable {
    enum Column: String, Codable, CaseIterable { case title, published, length, state }
    var column: Column
    var reversed = false
    var order: SortOrder { reversed ? .reverse : .forward }

    init(column: Column, reversed: Bool = false) {
        self.column = column; self.reversed = reversed
    }
    init?(_ comparator: KeyPathComparator<EpisodeRow>) {
        switch comparator.keyPath {
        case \EpisodeRow.title: column = .title
        case \EpisodeRow.published: column = .published
        case \EpisodeRow.length: column = .length
        case \EpisodeRow.stateText: column = .state
        default: return nil
        }
        reversed = comparator.order == .reverse
    }
    var comparator: KeyPathComparator<EpisodeRow> {
        switch column {
        case .title: KeyPathComparator(\.title, order: order)
        case .published: KeyPathComparator(\.published, order: order)
        case .length: KeyPathComparator(\.length, order: order)
        case .state: KeyPathComparator(\.stateText, order: order)
        }
    }
}

/// Only browsing state: applying this value cannot edit the Library or start playback.
/// SwiftUI owns each scene's lifetime; a new WindowGroup scene has no saved value.
struct WindowContext: Codable, Equatable {
    enum Columns: String, Codable { case automatic, all, doubleColumn, detailOnly }
    var version = 1
    var libraryID = "standalone"
    var destination: Destination? = .subscriptions
    var search = ""
    var selection = Set<String>()
    var sort: [WindowSort] = []
    var podcastSort: [WindowSort] = [.init(column: .published, reversed: true)]
    var playlistTab = PlaylistTab.entries
    var timelineSelection: String?
    var columns = Columns.all
    // Podcast pages opened from discovery need not have a Subscription yet.
    var podcastFeed: String?
    var subscriptionSelection = Set<String>()

    private var isPodcastPage: Bool {
        if case .subscription = destination { return true }
        return podcastFeed != nil
    }

    var encoded: Data? { try? JSONEncoder().encode(self) }
    static func decode(_ data: Data?) -> Self? {
        guard let data, let value = try? JSONDecoder().decode(Self.self, from: data), value.version == 1 else { return nil }
        return value
    }

    func reconciled(in library: LibraryModel) -> Self {
        // Server State and catalogue arrive independently. Empty partial reads are not deletions.
        guard library.snapshot.isReady else { return self }
        var result = self
        switch destination {
        case let .playlist(id) where !library.state.playlists.contains(where: { $0.id == id }):
            result.destination = .subscriptions
        case let .view(id) where !library.state.views.contains(where: { $0.id == id }):
            result.destination = .views
        case let .subscription(id) where !library.subscriptions.contains(where: { $0.id == id }):
            result.destination = .subscriptions
        default: break
        }
        if result.destination != destination {
            result.search = ""; result.selection = []; result.sort = []
            result.playlistTab = .entries; result.timelineSelection = nil; result.podcastFeed = nil
        }
        result.subscriptionSelection.formIntersection(Set(library.subscriptions.map(\.id)))
        if result.isPodcastPage {
            // The publisher page reconciles local IDs and publisher GUIDs after its feed read.
            return result
        }
        let ids: Set<String>
        if case let .playlist(id) = result.destination,
           let playlist = library.state.playlists.first(where: { $0.id == id }) {
            switch result.playlistTab {
            case .entries: ids = Set(library.rows(for: result.destination, search: result.search).map(\.id))
            case .history: ids = Set(playlist.history.map(\.episodeId))
            case .timeline: ids = []
            }
            let events = TimelinePresentation.events(playlist, now: library.now)
            if !events.contains(where: { $0.id == result.timelineSelection }) { result.timelineSelection = nil }
        } else {
            ids = Set(library.rows(for: result.destination, search: result.search).map(\.id))
            result.timelineSelection = nil
        }
        result.selection.formIntersection(ids)
        return result
    }
}

extension WindowModel {
    func context(libraryID: String, playlistTab: PlaylistTab, columns: WindowContext.Columns,
                 podcastFeed: String?, subscriptionSelection: Set<String>) -> WindowContext {
        WindowContext(libraryID: libraryID, destination: destination, search: search, selection: selection,
                      sort: sortOrder.compactMap(WindowSort.init), podcastSort: podcastSort,
                      playlistTab: playlistTab, timelineSelection: timelineSelection, columns: columns,
                      podcastFeed: podcastFeed, subscriptionSelection: subscriptionSelection)
    }

    func restore(_ context: WindowContext) {
        destination = context.destination; search = context.search; selection = context.selection
        sortOrder = context.sort.map(\.comparator); podcastSort = context.podcastSort
        timelineSelection = context.timelineSelection
    }
}
