import AppIntents
import Foundation
import PodListAutomation
import PodListUI

/// Set by App.init, before scenes or automation can use the app-wide session.
@MainActor
enum AutomationRuntime {
    static var app: ApplicationModel?
    static func perform(_ name: String, _ arguments: JSONValue = [:]) async throws -> JSONValue {
        guard let app else { throw AutomationFailure("Open PodList and retry.") }
        return try await app.actions.perform(name, arguments: arguments)
    }
}

struct EpisodeEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Episode"
    static let defaultQuery = EpisodeQuery()
    let id: String
    @Property(title: "Title") var title: String
    @Property(title: "Podcast") var podcast: String
    init(id: String, title: String, podcast: String) {
        self.id = id; self.title = title; self.podcast = podcast
    }
    var displayRepresentation: DisplayRepresentation { .init(title: "\(title)", subtitle: "\(podcast)") }
}
struct EpisodeQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [EpisodeEntity] {
        guard let app = await AutomationRuntime.app else { throw AutomationFailure("Open PodList and retry.") }
        return try await app.actions.resolveEpisodes(identifiers).map { EpisodeEntity(id: $0.id, title: $0.title, podcast: $0.podcast) }
    }
    func entities(matching string: String) async throws -> [EpisodeEntity] {
        let value = try await AutomationRuntime.perform("search_episodes", ["text": .string(string)])
        return (value["episodes"]?.array ?? []).compactMap { row in
            guard let id = row["id"]?.string else { return nil }
            return EpisodeEntity(id: id, title: row["title"]?.string ?? id, podcast: row["podcast"]?.string ?? "")
        }
    }
    func suggestedEntities() async throws -> [EpisodeEntity] {
        let value = try await AutomationRuntime.perform("now_playing")
        guard let id = value["episode_id"]?.string else { return [] }
        return try await entities(for: [id])
    }
}
struct PlaylistEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Playlist"
    static let defaultQuery = PlaylistQuery()
    let id: String
    @Property(title: "Name") var name: String
    init(id: String, name: String) { self.id = id; self.name = name }
    var displayRepresentation: DisplayRepresentation { .init(title: "\(name)") }
}
struct PlaylistQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [PlaylistEntity] {
        try await all().filter { identifiers.contains($0.id) }
    }
    func entities(matching string: String) async throws -> [PlaylistEntity] {
        try await all().filter { $0.name.localizedStandardContains(string) }
    }
    func suggestedEntities() async throws -> [PlaylistEntity] { try await all() }
    private func all() async throws -> [PlaylistEntity] {
        var result: [PlaylistEntity] = [], offset = 0
        while true {
            let value = try await AutomationRuntime.perform("list_playlists", ["offset": .number(Double(offset)), "limit": 200])
            result += (value["playlists"]?.array ?? []).compactMap {
                guard let id = $0["id"]?.string, let name = $0["name"]?.string else { return nil }
                return PlaylistEntity(id: id, name: name)
            }
            guard value["has_more"]?.bool == true else { return result }
            offset += 200
        }
    }
}

struct PlayIntent: AppIntent {
    static let title: LocalizedStringResource = "Play Active Playlist"
    static let supportedModes: IntentModes = .foreground
    @MainActor func perform() async throws -> some IntentResult {
        _ = try await AutomationRuntime.perform("play"); return .result()
    }
}
struct PauseIntent: AppIntent {
    static let title: LocalizedStringResource = "Pause Playback"
    static let supportedModes: IntentModes = .foreground
    @MainActor func perform() async throws -> some IntentResult {
        _ = try await AutomationRuntime.perform("pause"); return .result()
    }
}
enum TransportAction: String, AppEnum {
    case toggle, skipBack, skipForward, nowPlaying
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Playback action"
    static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [
        .toggle: "Play or pause", .skipBack: "Back 15 seconds", .skipForward: "Forward 30 seconds", .nowPlaying: "Now Playing"
    ]
    var action: String { switch self { case .toggle: "toggle"; case .skipBack: "skip_back"; case .skipForward: "skip_forward"; case .nowPlaying: "now_playing" } }
}
struct PlaybackIntent: AppIntent {
    static let title: LocalizedStringResource = "Control Playback"
    static let supportedModes: IntentModes = .foreground
    @Parameter(title: "Action") var action: TransportAction
    @MainActor func perform() async throws -> some IntentResult & ReturnsValue<String> {
        .result(value: try await AutomationRuntime.perform(action.action).text())
    }
}
struct PlayEpisodeIntent: AppIntent {
    static let title: LocalizedStringResource = "Play Episode Now"
    static let supportedModes: IntentModes = .foreground
    @Parameter(title: "Episode") var episode: EpisodeEntity
    @MainActor func perform() async throws -> some IntentResult {
        _ = try await AutomationRuntime.perform("play_episode", ["episode_id": .string(episode.id)]); return .result()
    }
}
enum AddPlacement: String, AppEnum {
    case next, last
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Placement"
    static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [.next: "Play Next", .last: "Play Last"]
}
struct AddEpisodesIntent: AppIntent {
    static let title: LocalizedStringResource = "Add Episodes to Playlist"
    static let supportedModes: IntentModes = .foreground
    @Parameter(title: "Episodes") var episodes: [EpisodeEntity]
    @Parameter(title: "Playlist") var playlist: PlaylistEntity?
    @Parameter(title: "Placement", default: .last) var placement: AddPlacement
    @MainActor func perform() async throws -> some IntentResult {
        var args: [String: JSONValue] = ["episode_ids": .array(episodes.map { .string($0.id) }), "placement": .string(placement.rawValue)]
        if let playlist { args["playlist_id"] = .string(playlist.id) }
        _ = try await AutomationRuntime.perform("add_episodes", .object(args)); return .result()
    }
}
struct AddCurrentIntent: AppIntent {
    static let title: LocalizedStringResource = "Add Current Episode to Playlist"
    static let supportedModes: IntentModes = .foreground
    @Parameter(title: "Playlist") var playlist: PlaylistEntity?
    @MainActor func perform() async throws -> some IntentResult {
        let args: JSONValue = playlist.map { ["playlist_id": .string($0.id)] } ?? [:]
        _ = try await AutomationRuntime.perform("add_current", args); return .result()
    }
}
enum EpisodeMark: String, AppEnum {
    case star, unstar, played, unplayed
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Episode mark"
    static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [.star: "Star", .unstar: "Unstar", .played: "Mark Played", .unplayed: "Mark Unplayed"]
}
struct MarkEpisodesIntent: AppIntent {
    static let title: LocalizedStringResource = "Mark Episodes"
    static let supportedModes: IntentModes = .foreground
    @Parameter(title: "Episodes") var episodes: [EpisodeEntity]
    @Parameter(title: "Mark") var mark: EpisodeMark
    @MainActor func perform() async throws -> some IntentResult {
        let star = mark == .star || mark == .unstar
        var args: [String: JSONValue] = ["episode_ids": .array(episodes.map { .string($0.id) })]
        args[star ? "starred" : "played"] = .bool(mark == .star || mark == .played)
        _ = try await AutomationRuntime.perform(star ? "set_starred" : "set_played", .object(args)); return .result()
    }
}
struct SearchEpisodesIntent: AppIntent {
    static let title: LocalizedStringResource = "Search Episodes"
    static let supportedModes: IntentModes = .foreground
    @Parameter(title: "Text") var text: String
    @MainActor func perform() async throws -> some IntentResult & ReturnsValue<[EpisodeEntity]> {
        .result(value: try await EpisodeQuery().entities(matching: text))
    }
}
enum LibraryList: String, AppEnum {
    case views, playlists, episodes
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Library list"
    static let caseDisplayRepresentations: [Self: DisplayRepresentation] = [.views: "Views", .playlists: "Playlists", .episodes: "Episodes"]
}
struct ListLibraryIntent: AppIntent {
    static let title: LocalizedStringResource = "List Library"
    static let supportedModes: IntentModes = .foreground
    @Parameter(title: "List") var list: LibraryList
    @Parameter(title: "Playlist") var playlist: PlaylistEntity?
    @Parameter(title: "View id") var viewID: String?
    @Parameter(title: "Offset", default: 0) var offset: Int
    @MainActor func perform() async throws -> some IntentResult & ReturnsValue<String> {
        var args: [String: JSONValue] = ["offset": .number(Double(offset))]
        if list == .episodes {
            if let playlist { args["playlist_id"] = .string(playlist.id) }
            if let viewID { args["view_id"] = .string(viewID) }
        }
        let name = list == .views ? "list_views" : list == .playlists ? "list_playlists" : "list_episodes"
        return .result(value: try await AutomationRuntime.perform(name, .object(args)).text())
    }
}
struct PodListShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: PlayIntent(), phrases: ["Play my \(.applicationName) Playlist"], shortTitle: "Play", systemImageName: "play.fill")
        AppShortcut(intent: PauseIntent(), phrases: ["Pause \(.applicationName)"], shortTitle: "Pause", systemImageName: "pause.fill")
        AppShortcut(intent: AddCurrentIntent(), phrases: ["Add the current Episode in \(.applicationName) to a Playlist"], shortTitle: "Add Current Episode", systemImageName: "text.badge.plus")
    }
}
