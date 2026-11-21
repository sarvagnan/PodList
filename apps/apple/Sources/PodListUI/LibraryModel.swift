import Foundation
import Observation
import PodListData
import PodListDomain
import Synchronization

public enum Destination: Hashable, Sendable, Codable {
    case view(String), playlist(String), views, subscriptions, subscription(String), search, trash
}

public struct SidebarItem: Identifiable, Equatable, Sendable {
    public let destination: Destination
    public let name: String
    public let count: Int
    public var active = false
    public var clearOnPlayed: Bool? = nil
    public var id: Destination { destination }
}

public struct SidebarSection: Identifiable, Equatable, Sendable {
    public let name: String
    public let items: [SidebarItem]
    public var id: String { name }
}

public struct EpisodeRow: Identifiable, Sendable {
    public let id: String
    public let episode: Episode?
    public let title: String
    public let podcast: String
    public let artworkURL: URL?
    public let published: Int64
    public let length: Double
    public let stateText: String
    public let position: Double?
    public let isCursor: Bool
    public let ordinal: Int?
    public var durationText: String { episode?.duration.map(Presentation.time) ?? "—" }
    public var publishedDate: Date { Date(timeIntervalSince1970: Double(published) / 1000) }
}

/// Missing publisher lengths must not make an incomplete sum look like a total.
struct EpisodeSelectionSummary {
    let ids: [String]
    let knownLength: Double
    let unknownLengths: Int
    let allAvailable: Bool

    init(ids: [String], library: LibraryModel) {
        var seen = Set<String>()
        self.ids = ids.filter { seen.insert($0).inserted }
        let episodes = self.ids.map { library.row($0).episode }
        let lengths = episodes.compactMap { $0?.duration }.filter { $0.isFinite && $0 >= 0 }
        knownLength = lengths.reduce(0, +)
        unknownLengths = self.ids.count - lengths.count
        allAvailable = episodes.allSatisfy { $0 != nil }
    }
    var title: String { "\(CountText.format(ids.count, .episode)) selected" }
    var lengthText: String {
        if unknownLengths == ids.count { return "Unavailable" }
        let time = Presentation.time(knownLength)
        return unknownLengths == 0 ? time : "\(time) known · \(unknownLengths) unavailable"
    }
}

public struct SubscriptionGroup: Identifiable, Sendable {
    public let mode: DownloadMode
    public let subscriptions: [Subscription]
    public var id: String { mode.rawValue }
    public var name: String {
        switch mode {
        case .never: "Stream"
        case .onEntry: "When Episodes become an Entry"
        case .allNew: "As Episodes are published"
        }
    }
}

public struct PlayerPresentation: Sendable {
    public let row: EpisodeRow
    public let artworkURL: URL?
    public let playlistID: String
    public let playlistName: String
    public let entriesAfter: Int
    public let speed: Double
    /// Full-width centred headings, in visual and VoiceOver order; the view truncates only when needed.
    public var headingLines: [String] { [row.title, row.podcast] }
    public var elapsed: String { Presentation.time(row.position ?? 0) }
    public var remaining: String {
        row.episode?.duration.map { "−" + Presentation.time(max(0, $0 - (row.position ?? 0))) } ?? "—"
    }
    public var fraction: Double {
        guard let duration = row.episode?.duration, duration > 0 else { return 0 }
        return min(1, max(0, (row.position ?? 0) / duration))
    }
    public var queueText: String { "\(playlistName) · \(entriesAfter) \(entriesAfter == 1 ? "Entry" : "Entries") after current" }
}

public enum Presentation {
    static func timelineDate(_ milliseconds: Int64) -> String {
        Date(timeIntervalSince1970: Double(milliseconds) / 1000).formatted(date: .abbreviated, time: .shortened)
    }

    /// Keep tooltip copy brief; full publisher text remains in the visible/accessible content.
    static func tooltip(_ text: String) -> String {
        text.count <= 75 ? text : String(text.prefix(74)) + "…"
    }

    public static func initials(_ title: String) -> String {
        title.split(whereSeparator: { $0.isWhitespace }).prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
    }

    public static func time(_ seconds: Double) -> String {
        guard seconds.isFinite else { return "—" }
        let total = Int(min(Double(Int.max / 2), max(0, seconds)))
        if total >= 3600 { return String(format: "%d:%02d:%02d", total / 3600, total / 60 % 60, total % 60) }
        return String(format: "%d:%02d", total / 60, total % 60)
    }

    /// Publisher markup is displayed as text, never as an embedded web document.
    public static func plainShowNotes(_ input: String) -> String {
        let stripped = input
            .replacingOccurrences(of: "(?is)<(script|style)[^>]*>.*?</\\1\\s*>", with: "", options: .regularExpression)
            .replacingOccurrences(of: "(?i)<(?:br\\s*/?|/p|/div|/h[1-6]|/li)\\s*>", with: "\n", options: .regularExpression)
            .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        var result = ""
        var index = stripped.startIndex
        let entities = ["amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'", "nbsp": " "]
        while index < stripped.endIndex {
            if stripped[index] == "&", let end = stripped[index...].firstIndex(of: ";"), stripped.distance(from: index, to: end) < 16 {
                let key = String(stripped[stripped.index(after: index)..<end])
                let number: UInt32? = key.hasPrefix("#x") ? UInt32(key.dropFirst(2), radix: 16) : key.hasPrefix("#") ? UInt32(key.dropFirst()) : nil
                if let value = entities[key] ?? number.flatMap(Unicode.Scalar.init).map(String.init) {
                    result += value; index = stripped.index(after: end); continue
                }
            }
            result.append(stripped[index]); index = stripped.index(after: index)
        }
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

/// Immutable projections can be shared between windows; browsing state stays in each window.
public struct LibraryModel: Sendable {
    private final class SnapshotCache: Sendable {
        let sidebar = Mutex<[SidebarSection]?>(nil)
        let views = Mutex<[String: [Episode]]>([:])
        let libraryEpisodes = Mutex<[Episode]?>(nil)
        let positions = Mutex<[String: Double]?>(nil)
        let unfilteredRows = Mutex<[Destination: [EpisodeRow]]>([:])
        let searchFields = Mutex<[String: [String]]>([:])
    }

    public let snapshot: LibrarySnapshot
    public let deviceID: String
    public let now: Int64
    private let episodesByID: [String: Episode]
    private let subscriptionsByID: [String: Subscription]
    private let viewsByID: [String: PodListDomain.View]
    private let cache = SnapshotCache()

    public init(snapshot: LibrarySnapshot, deviceID: String, now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        self.snapshot = snapshot; self.deviceID = deviceID; self.now = now
        episodesByID = Dictionary(uniqueKeysWithValues: snapshot.episodes.map { ($0.id, $0) })
        subscriptionsByID = Dictionary(uniqueKeysWithValues: snapshot.subscriptions.map { ($0.id, $0) })
        viewsByID = Dictionary(snapshot.state.views.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    }
    public var state: State { snapshot.state }
    public var subscriptions: [Subscription] { snapshot.subscriptions.filter { $0.unsubscribedAt == nil } }
    public var trash: [TrashedPlaylist] { PlaylistRules.availableTrash(state, at: now) }
    public var sidebar: [SidebarSection] {
        cache.sidebar.withLock { cached in
            if let cached { return cached }
            let sections = [SidebarSection(name: "Views", items: state.views.map {
                SidebarItem(destination: .view($0.id), name: $0.name, count: viewEpisodes($0).count)
            }), SidebarSection(name: "Playlists", items: state.playlists.map {
                SidebarItem(destination: .playlist($0.id), name: $0.name, count: $0.entries.count, active: $0.id == state.activePlaylistId, clearOnPlayed: $0.clearOnPlayed)
            } + [SidebarItem(destination: .trash, name: "Trash", count: trash.count)]),
            SidebarSection(name: "Library", items: [SidebarItem(destination: .subscriptions, name: "Subscriptions", count: subscriptions.count),
                                                   SidebarItem(destination: .search, name: "Search", count: libraryEpisodes.count)])]
            cached = sections
            return sections
        }
    }
    public func title(_ destination: Destination?) -> String {
        switch destination {
        case let .view(id): viewsByID[id]?.name ?? "View unavailable"
        case let .playlist(id): state.playlists.first { $0.id == id }?.name ?? "Playlist unavailable"
        case let .subscription(id): subscriptionsByID[id]?.title ?? "Subscription unavailable"
        case .views: "Views"
        case .subscriptions: "Subscriptions"
        case .search: "Search"
        case .trash: "Trash"
        case nil: "PodList"
        }
    }
    public func viewEpisodes(_ view: PodListDomain.View) -> [Episode] {
        // An editor draft can share the saved View's ID while its rules change.
        guard viewsByID[view.id] == view else { return evaluate(view) }
        return cache.views.withLock { cached in
            if let episodes = cached[view.id] { return episodes }
            let episodes = evaluate(view)
            cached[view.id] = episodes
            return episodes
        }
    }
    private func evaluate(_ view: PodListDomain.View) -> [Episode] {
        ViewRules.evaluate(view, subscriptions: snapshot.subscriptions, episodes: snapshot.episodes, state: state, now: now)
    }
    public var libraryEpisodes: [Episode] {
        cache.libraryEpisodes.withLock { cached in
            if let cached { return cached }
            let episodes = evaluate(.init(id: "library", name: "Library", filter: .init(), sort: .publishedDesc, limit: nil))
            cached = episodes
            return episodes
        }
    }
    public func rows(for destination: Destination?, search: String = "") -> [EpisodeRow] {
        guard let destination else { return [] }
        let rows = cache.unfilteredRows.withLock { cached in
            if let rows = cached[destination] { return rows }
            guard let rows = makeRows(for: destination) else { return [] }
            cached[destination] = rows
            return rows
        }
        return matchingSearch(rows, search: search)
    }

    /// The Settings sheet can preview a Playlist from Trash using the same Entry projection.
    func rows(forTrashedPlaylist playlist: Playlist, search: String) -> [EpisodeRow] {
        matchingSearch(makePlaylistRows(playlist), search: search)
    }

    private func matchingSearch(_ rows: [EpisodeRow], search: String) -> [EpisodeRow] {
        guard !search.isEmpty, !rows.isEmpty else { return rows }
        let words = Mentions.words(search)
        guard !words.isEmpty else { return rows }
        return cache.searchFields.withLock { cached in
            rows.filter { row in
                let fields: [String]
                if let folded = cached[row.id] {
                    fields = folded
                } else {
                    fields = [row.title, row.podcast, row.episode?.description ?? ""].map(Mentions.fold)
                    cached[row.id] = fields
                }
                return words.allSatisfy { word in fields.contains { $0.contains(word) } }
            }
        }
    }
    private func makeRows(for destination: Destination) -> [EpisodeRow]? {
        switch destination {
        case let .view(id):
            return viewsByID[id].map { viewEpisodes($0).map { row($0.id) } }
        case let .playlist(id):
            return state.playlists.first { $0.id == id }.map(makePlaylistRows)
        case let .subscription(id):
            guard subscriptionsByID[id] != nil else { return nil }
            return libraryEpisodes.filter { $0.subscriptionId == id }.map { row($0.id) }
        case .search: return libraryEpisodes.map { row($0.id) }
        default: return nil
        }
    }

    private func makePlaylistRows(_ playlist: Playlist) -> [EpisodeRow] {
        playlist.entries.enumerated().map {
            row($0.element.episodeId, entry: $0.element, cursor: playlist.cursor, ordinal: $0.offset + 1)
        }
    }

    public enum EmptyEpisodes: Equatable, Sendable { case loading, noSubscriptions, noMatches }
    public func emptyEpisodes(syncing: Bool) -> EmptyEpisodes {
        if syncing { return .loading }
        return subscriptions.isEmpty ? .noSubscriptions : .noMatches
    }
    public func subscriptionGroups(search: String = "") -> [SubscriptionGroup] {
        DownloadMode.allCases.compactMap { mode in
            let subscriptions = subscriptions.filter { subscription in
                let rule = state.downloadRules.first { $0.subscriptionId == subscription.id && $0.deviceId == deviceID }
                return (rule?.mode ?? .never) == mode && Mentions.words(search).allSatisfy { Mentions.fold(subscription.title).contains($0) }
            }.sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
            return subscriptions.isEmpty ? nil : SubscriptionGroup(mode: mode, subscriptions: subscriptions)
        }
    }
    public func row(_ id: String, entry: Entry? = nil, cursor: String? = nil, ordinal: Int? = nil) -> EpisodeRow {
        let episode = episodesByID[id]
        let subscription = episode.flatMap { subscriptionsByID[$0.subscriptionId] }
        let fact = state.episodeStates[id]
        let position = entry?.position ?? positionsByEpisodeID[id]
        var labels = [fact?.played != nil ? "Played" : (position ?? 0) > 0 ? "In progress" : "Unplayed"]
        if fact?.starred == true { labels.append("Starred") }
        return EpisodeRow(id: id, episode: episode, title: episode?.title ?? "Episode details pending sync", podcast: subscription?.title ?? "Podcast details pending sync",
            artworkURL: (episode?.artwork ?? subscription?.artwork).flatMap { URL(string: $0.url) },
            published: episode?.published ?? 0, length: episode?.duration ?? .infinity,
            stateText: labels.joined(separator: " · "), position: position, isCursor: cursor == id, ordinal: ordinal)
    }
    private var positionsByEpisodeID: [String: Double] {
        cache.positions.withLock { cached in
            if let cached { return cached }
            var positions: [String: Double] = [:]
            for playlist in state.playlists {
                for entry in playlist.entries {
                    if let previous = positions[entry.episodeId], !(previous < entry.position) { continue }
                    positions[entry.episodeId] = entry.position
                }
            }
            cached = positions
            return positions
        }
    }
    public func episodeShareURL(_ id: String) -> URL? {
        ShareLinks.episode(page: snapshot.episodeLinks[id], enclosure: episodesByID[id]?.audioUrl)
    }
    public var player: PlayerPresentation? {
        guard let playlist = state.playlists.first(where: { $0.id == state.activePlaylistId }),
              let index = playlist.entries.firstIndex(where: { $0.episodeId == playlist.cursor }) else { return nil }
        let entry = playlist.entries[index]
        let row = row(entry.episodeId, entry: entry, cursor: playlist.cursor)
        let subscription = row.episode.flatMap { subscriptionsByID[$0.subscriptionId] }
        let speed = subscription?.playbackSettings.speed ?? state.playbackSettings.speed
        return PlayerPresentation(row: row, artworkURL: subscription?.artwork.flatMap { URL(string: $0.url) },
            playlistID: playlist.id, playlistName: playlist.name, entriesAfter: playlist.entries.count - index - 1, speed: speed)
    }
    public func memberships(_ id: String) -> [(id: String, name: String, position: Double)] {
        state.playlists.compactMap { playlist in
            playlist.entries.first { $0.episodeId == id }.map { (playlist.id, playlist.name, $0.position) }
        }
    }
}

@MainActor @Observable
public final class WindowModel {
    enum ListID: Hashable {
        case destination(Destination?)
        case playlist(String, PlaylistTab)
        case podcast(String)
    }
    private struct ListPosition {
        var selection = Set<String>()
        var sortOrder: [KeyPathComparator<EpisodeRow>] = []
        var podcastSort = WindowModel.defaultPodcastSort
        var timelineSelection: String?
        var scrollAnchor: RowAnchor?
    }
    nonisolated private static let defaultPodcastSort: [WindowSort] = [.init(column: .published, reversed: true)]
    private var listPositions: [ListID: ListPosition] = [:]
    private var playlistTabs: [String: PlaylistTab] = [:]

    public var destination: Destination? = .subscriptions
    public var search = ""
    public var selection = Set<String>()
    public var sortOrder: [KeyPathComparator<EpisodeRow>] = []
    var podcastSort = WindowModel.defaultPodcastSort
    var podcastFeed: String?
    var playlistTab = PlaylistTab.entries
    var subscriptionSelection = Set<String>()
    var timelineSelection: String?
    var scrollAnchor: RowAnchor?
    var collapsedSidebarSections = Set<SidebarSection.ID>()
    var listID: ListID {
        if let podcastFeed { return .podcast(podcastFeed) }
        if case let .playlist(id) = destination { return .playlist(id, playlistTab) }
        return .destination(destination)
    }
    /// Measured widths, saved for the next launch. Never drives layout during a session.
    var paneWidths = PaneWidths()
    /// The widths the columns open at: set once on restore. Feeding live measurements back
    /// into the columns' ideal width shrank the sidebar below its minimum.
    var initialPaneWidths = PaneWidths()
    var hasRestoredPaneWidths = false
    var pendingDropSelections: [String: [String]] = [:]
    var podcastOrigin: PodcastOrigin?

    func didDrop(_ ids: [String], into playlistID: String, reveal: Bool = true, scroll: Bool = true) {
        pendingDropSelections[playlistID] = ids
        if reveal, listID == .playlist(playlistID, .entries) { revealDrop(in: playlistID, scroll: scroll) }
    }
    func revealDrop(in playlistID: String, scroll: Bool = true) {
        // A drop can finish after the person has started filtering this list.
        guard let ids = pendingDropSelections.removeValue(forKey: playlistID),
              search.isEmpty, let first = ids.first else { return }
        selection = Set(ids)
        if scroll { scrollAnchor = RowAnchor(id: first, index: 0) }
    }

    /// A window-local completion, never an app-wide selection notification.
    @discardableResult
    func revealRestoredEntries(_ restored: [RestoredEntries]) -> Bool {
        let current = restored.first { destination == .playlist($0.playlistID) }
        guard let target = current ?? restored.first, let first = target.episodeIDs.first else { return false }
        navigate(to: .playlist(target.playlistID))
        showPlaylistTab(.entries)
        selection = Set(target.episodeIDs); scrollAnchor = RowAnchor(id: first, index: 0)
        return true
    }

    public init() {}
    /// Podcast pages belong to Subscriptions even though they have no sidebar row.
    public var sidebarSelection: Destination? {
        if case .subscription = destination { return .subscriptions }
        if destination == .views { return nil }
        return destination
    }
    private func rememberList() {
        if case let .playlist(id, tab) = listID { playlistTabs[id] = tab }
        listPositions[listID] = ListPosition(selection: selection, sortOrder: sortOrder,
            podcastSort: podcastSort, timelineSelection: timelineSelection, scrollAnchor: scrollAnchor)
    }
    private func restoreList() {
        let position = listPositions[listID] ?? ListPosition()
        selection = position.selection; sortOrder = position.sortOrder; podcastSort = position.podcastSort
        timelineSelection = position.timelineSelection; scrollAnchor = position.scrollAnchor
    }
    func clearListMemory() {
        listPositions.removeAll()
        playlistTabs.removeAll()
    }
    /// Only a row interaction can open the Inspector. Restoring or reconciling a list
    /// assigns its selection directly.
    func selectEpisodes(_ ids: Set<String>, in list: ListID, episodeIDs: Set<String>, openInspector: () -> Void) {
        guard listID == list else { return }
        if selection != ids { selection = ids }
        if !ids.isDisjoint(with: episodeIDs) { openInspector() }
    }
    func showPlaylistTab(_ tab: PlaylistTab) {
        guard podcastFeed == nil, case let .playlist(id) = destination, playlistTab != tab else { return }
        rememberList()
        playlistTab = tab
        search = ""
        restoreList()
        if tab == .entries { revealDrop(in: id) }
    }
    var isPodcastPage: Bool {
        if podcastFeed != nil { return true }
        if case .subscription = destination { return true }
        return false
    }
    private func rememberPodcastOrigin() {
        if !isPodcastPage {
            podcastOrigin = PodcastOrigin(destination: destination, search: search, selection: selection,
                sort: sortOrder.compactMap(WindowSort.init), podcastSort: podcastSort,
                timelineSelection: timelineSelection, scrollAnchor: scrollAnchor, playlistTab: playlistTab)
        }
    }
    /// Feed discovery overlays the current destination; its browsing state is keyed by feed.
    func beginPodcastPage(_ feed: String) {
        guard podcastFeed != feed else { return }
        rememberPodcastOrigin()
        rememberList()
        podcastFeed = feed
        search = ""
        restoreList()
    }
    func backFromPodcast() {
        guard let origin = podcastOrigin else { navigate(to: .subscriptions); return }
        rememberList()
        podcastOrigin = nil; podcastFeed = nil
        destination = origin.destination; search = origin.search; selection = origin.selection
        playlistTab = origin.playlistTab ?? .entries
        sortOrder = origin.sort.map(\.comparator); podcastSort = origin.podcastSort
        timelineSelection = origin.timelineSelection; scrollAnchor = origin.scrollAnchor
    }
    public func navigate(to destination: Destination?) {
        guard self.destination != destination || podcastFeed != nil else {
            search = ""
            return
        }
        if case .subscription = destination {
            rememberPodcastOrigin()
        } else { podcastOrigin = nil }
        rememberList()
        self.destination = destination; podcastFeed = nil; search = ""
        if case let .playlist(id) = destination { playlistTab = playlistTabs[id] ?? .entries }
        else { playlistTab = .entries }
        restoreList()
        if case let .playlist(id, .entries) = listID {
            revealDrop(in: id)
        }
    }
    public func rows(in library: LibraryModel) -> [EpisodeRow] {
        let rows = library.rows(for: destination, search: search)
        if case .playlist = destination { return rows }
        return sortOrder.isEmpty ? rows : rows.sorted(using: sortOrder)
    }
    public func reconcile(in library: LibraryModel) {
        if case let .view(id) = destination, !library.state.views.contains(where: { $0.id == id }) { navigate(to: .views) }
        if case let .playlist(id) = destination, !library.state.playlists.contains(where: { $0.id == id }) { navigate(to: .subscriptions) }
        if case let .subscription(id) = destination, !library.subscriptions.contains(where: { $0.id == id }) { navigate(to: .subscriptions) }
        selection.formIntersection(Set(destination == .views ? library.state.views.map(\.id) : rows(in: library).map(\.id)))
    }
}
