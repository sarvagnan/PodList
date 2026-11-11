import Foundation
import Observation
import PodListData
import PodListDomain

public enum Destination: Hashable, Sendable {
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
    public let snapshot: LibrarySnapshot
    public let deviceID: String
    public let now: Int64
    private let episodesByID: [String: Episode]
    private let subscriptionsByID: [String: Subscription]

    public init(snapshot: LibrarySnapshot, deviceID: String, now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        self.snapshot = snapshot; self.deviceID = deviceID; self.now = now
        episodesByID = Dictionary(uniqueKeysWithValues: snapshot.episodes.map { ($0.id, $0) })
        subscriptionsByID = Dictionary(uniqueKeysWithValues: snapshot.subscriptions.map { ($0.id, $0) })
    }
    public var state: State { snapshot.state }
    public var subscriptions: [Subscription] { snapshot.subscriptions.filter { $0.unsubscribedAt == nil } }
    public var trash: [TrashedPlaylist] { PlaylistRules.availableTrash(state, at: now) }
    public var sidebar: [SidebarSection] {
        [SidebarSection(name: "Views", items: state.views.map {
            SidebarItem(destination: .view($0.id), name: $0.name, count: viewEpisodes($0).count)
        }), SidebarSection(name: "Playlists", items: state.playlists.map {
            SidebarItem(destination: .playlist($0.id), name: $0.name, count: $0.entries.count, active: $0.id == state.activePlaylistId, clearOnPlayed: $0.clearOnPlayed)
        } + [SidebarItem(destination: .trash, name: "Trash", count: trash.count)]),
        SidebarSection(name: "Library", items: [SidebarItem(destination: .subscriptions, name: "Subscriptions", count: subscriptions.count),
                                               SidebarItem(destination: .search, name: "Search", count: libraryEpisodes.count)])]
    }
    public func title(_ destination: Destination?) -> String {
        switch destination {
        case let .view(id): state.views.first { $0.id == id }?.name ?? "View unavailable"
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
        ViewRules.evaluate(view, subscriptions: snapshot.subscriptions, episodes: snapshot.episodes, state: state, now: now)
    }
    public var libraryEpisodes: [Episode] {
        viewEpisodes(.init(id: "library", name: "Library", filter: .init(), sort: .publishedDesc, limit: nil))
    }
    public func rows(for destination: Destination?, search: String = "") -> [EpisodeRow] {
        let rows: [EpisodeRow]
        switch destination {
        case let .view(id):
            rows = state.views.first { $0.id == id }.map { viewEpisodes($0).map { row($0.id) } } ?? []
        case let .playlist(id):
            rows = state.playlists.first { $0.id == id }.map { playlist in
                playlist.entries.enumerated().map { row($0.element.episodeId, entry: $0.element, cursor: playlist.cursor, ordinal: $0.offset + 1) }
            } ?? []
        case let .subscription(id): rows = libraryEpisodes.filter { $0.subscriptionId == id }.map { row($0.id) }
        case .search: rows = libraryEpisodes.map { row($0.id) }
        default: rows = []
        }
        let words = Mentions.words(search)
        return rows.filter { row in
            let fields = [row.title, row.podcast, row.episode?.description ?? ""].map(Mentions.fold)
            return words.allSatisfy { word in fields.contains { $0.contains(word) } }
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
        let position = entry?.position ?? state.playlists.flatMap(\.entries).filter { $0.episodeId == id }.map(\.position).max()
        var labels = [fact?.played != nil ? "Played" : (position ?? 0) > 0 ? "In progress" : "Unplayed"]
        if fact?.starred == true { labels.append("Starred") }
        return EpisodeRow(id: id, episode: episode, title: episode?.title ?? "Episode details pending sync", podcast: subscription?.title ?? "Podcast details pending sync",
            artworkURL: (episode?.artwork ?? subscription?.artwork).flatMap { URL(string: $0.url) },
            published: episode?.published ?? 0, length: episode?.duration ?? .infinity,
            stateText: labels.joined(separator: " · "), position: position, isCursor: cursor == id, ordinal: ordinal)
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
    public var destination: Destination? = .subscriptions
    public var search = ""
    public var showNowPlaying = false
    public private(set) var returnToNowPlaying = false
    public var selection = Set<String>()
    public var sortOrder: [KeyPathComparator<EpisodeRow>] = []

    public init() {}
    public func openNowPlayingEntries(_ playlistID: String) {
        showNowPlaying = false; navigate(to: .playlist(playlistID)); returnToNowPlaying = true
    }
    public func didStartPlayback() {
        if returnToNowPlaying { showNowPlaying = true; returnToNowPlaying = false }
    }
    public func navigate(to destination: Destination?) {
        returnToNowPlaying = false
        self.destination = destination; search = ""; selection = []; sortOrder = []
    }
    public func rows(in library: LibraryModel) -> [EpisodeRow] {
        let rows = library.rows(for: destination, search: search)
        if case .playlist = destination { return rows }
        return sortOrder.isEmpty ? rows : rows.sorted(using: sortOrder)
    }
    public func reconcile(in library: LibraryModel) {
        if case let .view(id) = destination, !library.state.views.contains(where: { $0.id == id }) { navigate(to: .views) }
        if case let .playlist(id) = destination, !library.state.playlists.contains(where: { $0.id == id }) { navigate(to: .subscriptions) }
        selection.formIntersection(Set(rows(in: library).map(\.id)))
    }
}
