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

/// A Podcast page returns to the originating list without losing its query or selection.
struct PodcastOrigin: Codable, Equatable {
    var destination: Destination?
    var search: String
    var selection: Set<String>
    var sort: [WindowSort]
    var podcastSort: [WindowSort]
    var timelineSelection: String?
    var scrollAnchor: RowAnchor?
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
    var podcastOrigin: PodcastOrigin?
    var subscriptionSelection = Set<String>()

    var scrollAnchor: RowAnchor?
    var paneWidths: PaneWidths?

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
        result.paneWidths = paneWidths?.reconciled
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
            result.podcastOrigin = nil
            result.scrollAnchor = nil
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
        } else if result.destination == .views {
            ids = Set(library.state.views.map(\.id))
            result.timelineSelection = nil
        } else {
            ids = Set(library.rows(for: result.destination, search: result.search).map(\.id))
            result.timelineSelection = nil
        }
        let scrollIDs: [String]
        switch result.destination {
        case .subscriptions: scrollIDs = library.subscriptionGroups(search: result.search).flatMap { $0.subscriptions.map(\.id) }
        case .views: scrollIDs = library.state.views.map(\.id)
        case .trash: scrollIDs = library.trash.filter { result.search.isEmpty || $0.playlist.name.localizedStandardContains(result.search) }.map { $0.playlist.id }
        case let .playlist(id) where result.playlistTab == .timeline:
            scrollIDs = library.state.playlists.first { $0.id == id }.map { TimelinePresentation.events($0, now: library.now).map(\.id) } ?? []
        case let .playlist(id) where result.playlistTab == .history:
            scrollIDs = library.state.playlists.first { $0.id == id }?.history.reversed().map(\.episodeId) ?? []
        default:
            let rows = library.rows(for: result.destination, search: result.search)
            if case .playlist = result.destination { scrollIDs = rows.map(\.id) }
            else { scrollIDs = result.sort.isEmpty ? rows.map(\.id) : rows.sorted(using: result.sort.map(\.comparator)).map(\.id) }
        }
        result.scrollAnchor = result.scrollAnchor?.reconciled(with: scrollIDs)
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
                      podcastFeed: podcastFeed, podcastOrigin: podcastOrigin, subscriptionSelection: subscriptionSelection,
                      scrollAnchor: scrollAnchor, paneWidths: paneWidths)
    }

    func restore(_ context: WindowContext) {
        podcastOrigin = context.podcastOrigin
        destination = context.destination; search = context.search; selection = context.selection
        sortOrder = context.sort.map(\.comparator); podcastSort = context.podcastSort
        timelineSelection = context.timelineSelection
        scrollAnchor = context.scrollAnchor; paneWidths = (context.paneWidths ?? PaneWidths()).reconciled
        if !hasRestoredPaneWidths {
            initialPaneWidths = paneWidths
            hasRestoredPaneWidths = true
        }
    }
}

/// A stable row plus its old ordinal supplies a nearby fallback when that row disappears.
struct RowAnchor: Codable, Equatable {
    var id: String
    var index: Int
    func reconciled(with ids: [String]) -> Self? {
        guard !ids.isEmpty else { return nil }
        if let index = ids.firstIndex(of: id) { return Self(id: id, index: index) }
        let index = min(max(0, self.index), ids.count - 1)
        return Self(id: ids[index], index: index)
    }
}

struct PaneWidths: Codable, Equatable {
    var sidebar: Double = 225
    var inspector: Double = 340
    var reconciled: Self {
        Self(sidebar: sidebar.isFinite ? min(max(sidebar, 180), 320) : 225,
             inspector: inspector.isFinite ? min(max(inspector, 260), 440) : 340)
    }
}

/// Coalesce divider movement before writing scene storage. Invalid/collapsed geometry
/// is ignored rather than replacing a valid preference with the minimum width.
@MainActor
final class SidebarWidthRecorder {
    var changed: ((Double) -> Void)?
    private var pending: Double?
    private var task: Task<Void, Never>?

    func record(_ width: Double) {
        guard width.isFinite, (180...320).contains(width) else { return }
        pending = width
        task?.cancel()
        task = Task { [weak self] in
            do { try await Task.sleep(for: .milliseconds(250)) } catch { return }
            self?.flush()
        }
    }

    func flush() {
        task?.cancel(); task = nil
        guard let pending else { return }
        self.pending = nil
        changed?(pending)
    }

    deinit { task?.cancel() }
}
