import Foundation
import PodListAutomation
import PodListDomain

/// The sole automation boundary. Domain edits use the same history as Episode menu actions.
@MainActor
public final class AutomationActions {
    private weak var app: ApplicationModel?
    public init(app: ApplicationModel) { self.app = app }

    nonisolated public static let tools: [JSONValue] = {
        let text: JSONValue = ["type": "string", "minLength": 1]
        let ids: JSONValue = ["type": "array", "items": text, "minItems": 1, "maxItems": 200]
        let page: [String: JSONValue] = ["offset": ["type": "integer", "minimum": 0, "maximum": 1000000],
                                        "limit": ["type": "integer", "minimum": 1, "maximum": 200]]
        func tool(_ name: String, _ description: String, _ properties: [String: JSONValue] = [:], _ required: [String] = []) -> JSONValue {
            ["name": .string(name), "description": .string(description),
             "inputSchema": ["type": "object", "properties": .object(properties),
                             "required": .array(required.map(JSONValue.string)), "additionalProperties": false]]
        }
        return [
            tool("play", "Resume the Active Playlist."), tool("pause", "Pause playback."),
            tool("toggle", "Toggle playback."), tool("skip_back", "Skip back 15 seconds."),
            tool("skip_forward", "Skip forward 30 seconds."), tool("now_playing", "Episode, podcast, Position in seconds and Active Playlist."),
            tool("play_episode", "Play an Episode now in the Active Playlist. Offers Undo.", ["episode_id": text], ["episode_id"]),
            tool("add_episodes", "Add or move Episodes to a Playlist, Active by default. Offers Undo.",
                 ["episode_ids": ids, "playlist_id": text, "placement": ["type": "string", "enum": ["next", "last"]]], ["episode_ids"]),
            tool("add_current", "Add the current Episode to a Playlist, Active by default. Offers Undo.", ["playlist_id": text]),
            tool("list_views", "List Views with Episode counts.", page),
            tool("list_playlists", "List Playlists with Entry counts and Active status.", page),
            tool("list_episodes", "List a View's Episodes or a Playlist's ordered Entries. Supply exactly one id.",
                 page.merging(["view_id": text, "playlist_id": text]) { _, new in new }),
            tool("search_episodes", "Search Library titles, podcasts and show notes using the app's text matching.",
                 page.merging(["text": text]) { _, new in new }, ["text"]),
            tool("set_starred", "Star or Unstar Episodes. Offers Undo.", ["episode_ids": ids, "starred": ["type": "boolean"]], ["episode_ids", "starred"]),
            tool("set_played", "Mark Episodes Played or Unplayed. Offers Undo.", ["episode_ids": ids, "played": ["type": "boolean"]], ["episode_ids", "played"])
        ]
    }()

    public func resolveEpisodes(_ identifiers: [String]) async throws -> [EpisodeRow] {
        guard let app else { throw AutomationFailure("PodList is not running.") }
        await app.start(); await app.reloadLocal()
        guard let library = app.library else { throw AutomationFailure("Open a Library in PodList first.") }
        let known = Set(library.snapshot.episodes.map(\.id)).union(library.state.playlists.flatMap { $0.entries.map(\.episodeId) })
        return identifiers.filter(known.contains).map { library.row($0) }
    }

    public func perform(_ name: String, arguments: JSONValue = [:]) async throws -> JSONValue {
        try Self.validate(name, arguments)
        guard let app else { throw AutomationFailure("PodList is not running.") }
        await app.start()
        // Re-read local State before resolving ids; sync and other windows can have changed it.
        await app.reloadLocal()
        guard let library = app.library else { throw AutomationFailure("Open PodList and start on this Mac or connect to a Library first.") }
        let editing = app.editing
        let player = app.playback
        func requireEditor() throws -> PlaylistEditingModel {
            guard let editing, !editing.busy else { throw AutomationFailure("An edit is in progress. Retry when it finishes.") }
            return editing
        }
        func checkEpisodes(_ ids: [String]) throws {
            let known = Set(library.snapshot.episodes.map(\.id)).union(library.state.playlists.flatMap { $0.entries.map(\.episodeId) })
            guard ids.allSatisfy(known.contains) else { throw AutomationFailure("An Episode is unavailable. Search or list Episodes again.") }
        }
        func playlistID() throws -> String? {
            let id = arguments["playlist_id"]?.string
            if let id, !library.state.playlists.contains(where: { $0.id == id }) { throw AutomationFailure("Playlist unavailable. List Playlists again.") }
            return id
        }
        switch name {
        case "list_views":
            return Self.page(library.state.views.map { ["id": .string($0.id), "name": .string($0.name), "count": .number(Double(library.viewEpisodes($0).count))] }, arguments, key: "views")
        case "list_playlists":
            return Self.page(library.state.playlists.map { ["id": .string($0.id), "name": .string($0.name), "count": .number(Double($0.entries.count)), "active": .bool($0.id == library.state.activePlaylistId)] }, arguments, key: "playlists")
        case "list_episodes", "search_episodes":
            let rows: [EpisodeRow]
            if name == "search_episodes" { rows = library.rows(for: .search, search: arguments["text"]!.string!) }
            else if let id = arguments["view_id"]?.string, arguments["playlist_id"] == nil {
                guard library.state.views.contains(where: { $0.id == id }) else { throw AutomationFailure("View unavailable. List Views again.") }
                rows = library.rows(for: .view(id))
            } else if let id = try playlistID(), arguments["view_id"] == nil { rows = library.rows(for: .playlist(id)) }
            else { throw AutomationFailure("Supply exactly one of view_id or playlist_id.") }
            return Self.page(rows.map { Self.episode($0, library: library) }, arguments, key: "episodes")
        case "now_playing":
            await player?.settle()
            return Self.nowPlaying(player, library: app.library ?? library)
        case "play", "pause", "toggle", "skip_back", "skip_forward":
            guard let player else { throw AutomationFailure("The player is unavailable.") }
            await player.settle()
            if name != "pause", player.display == nil { throw AutomationFailure("The Active Playlist has no current Episode.") }
            switch name {
            case "play": player.play()
            case "pause": player.pause()
            case "toggle": player.toggle()
            case "skip_back": player.skip(-15)
            default: player.skip(30)
            }
            await player.settle()
            if let error = player.error { throw AutomationFailure(error) }
            return Self.nowPlaying(player, library: app.library ?? library)
        case "play_episode", "add_episodes", "add_current":
            let editor = try requireEditor()
            let ids: [String]
            if name == "play_episode" { ids = [arguments["episode_id"]!.string!] }
            else if name == "add_current" {
                await player?.settle()
                guard let id = player?.display?.episodeID else { throw AutomationFailure("There is no current Episode.") }
                ids = [id]
            } else { ids = arguments["episode_ids"]!.array!.map { $0.string! } }
            try checkEpisodes(ids)
            let target = try playlistID()
            let placement: Placement = name == "play_episode" ? .now : arguments["placement"]?.string == "next" ? .next : .last
            guard let result = await editor.add(ids, to: target, placement: placement) else { throw AutomationFailure(editor.error ?? "Could not add Episodes. Retry.") }
            if name == "play_episode", let error = player?.error { throw AutomationFailure(error) }
            return ["playlist_id": .string(result), "episode_ids": .array(ids.map(JSONValue.string)), "undo": .string(editor.undoTitle)]
        case "set_starred", "set_played":
            let editor = try requireEditor(), ids = arguments["episode_ids"]!.array!.map { $0.string! }
            try checkEpisodes(ids)
            let succeeded = name == "set_starred" ? await editor.setStar(ids, starred: arguments["starred"]!.bool!) : await editor.markPlayed(ids, played: arguments["played"]!.bool!)
            guard succeeded else { throw AutomationFailure(editor.error ?? "Could not edit Episodes. Retry.") }
            return ["episode_ids": .array(ids.map(JSONValue.string)), "undo": .string(editor.undoTitle)]
        default: throw AutomationFailure("Unknown action.")
        }
    }
    private static func episode(_ row: EpisodeRow, library: LibraryModel) -> JSONValue {
        ["id": .string(row.id), "title": .string(row.title), "podcast": .string(row.podcast),
         "position": row.position.map(JSONValue.number) ?? .null,
         "starred": .bool(library.state.episodeStates[row.id]?.starred == true),
         "played": .bool(library.state.episodeStates[row.id]?.played != nil)]
    }
    private static func nowPlaying(_ player: PlaybackController?, library: LibraryModel) -> JSONValue {
        let active = library.state.playlists.first { $0.id == library.state.activePlaylistId }
        let display = player?.display
        return ["episode_id": display.map { .string($0.episodeID) } ?? .null,
                "title": display.map { .string($0.title) } ?? .null, "podcast": display.map { .string($0.podcast) } ?? .null,
                "position": display.map { .number($0.position) } ?? .null, "playing": .bool(display?.playing == true),
                "active_playlist": ["id": .string(library.state.activePlaylistId), "name": active.map { .string($0.name) } ?? .null]]
    }
    private static func page(_ values: [JSONValue], _ args: JSONValue, key: String) -> JSONValue {
        let offset = Int(args["offset"]?.number ?? 0), limit = Int(args["limit"]?.number ?? 100)
        return .object([key: .array(Array(values.dropFirst(offset).prefix(limit))), "total": .number(Double(values.count)),
                        "offset": .number(Double(offset)), "has_more": .bool(offset + limit < values.count)])
    }
    nonisolated private static func validate(_ name: String, _ arguments: JSONValue) throws {
        guard let schema = tools.first(where: { $0["name"]?.string == name })?["inputSchema"],
              let properties = schema["properties"]?.object else { throw AutomationFailure("Unknown action: \(name).") }
        guard let args = arguments.object else { throw AutomationFailure("Arguments must be an object.") }
        for key in schema["required"]?.array?.compactMap(\.string) ?? [] where args[key] == nil { throw AutomationFailure("Missing argument: \(key).") }
        for (key, value) in args {
            guard let rule = properties[key] else { throw AutomationFailure("Unknown argument: \(key).") }
            let valid: Bool
            switch rule["type"]?.string {
            case "string": valid = value.string.map { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.utf8.count <= 8192 && (rule["enum"]?.array?.contains(value) ?? true) } ?? false
            case "boolean": valid = value.bool != nil
            case "array": valid = value.array.map { !$0.isEmpty && $0.count <= 200 && $0.allSatisfy { $0.string.map { !$0.isEmpty && $0.utf8.count <= 8192 } ?? false } } ?? false
            case "integer": valid = value.number.map { $0.isFinite && $0.rounded() == $0 && $0 >= (rule["minimum"]?.number ?? 0) && $0 <= (rule["maximum"]?.number ?? 200) } ?? false
            default: valid = false
            }
            if !valid { throw AutomationFailure("Invalid argument: \(key).") }
        }
    }
}
