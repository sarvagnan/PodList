import PodListDomain

/// Mirrors Sql.ts: Playlist documents preserve playback records; only live Entries enter the index.
public enum StateIndex {
    public static let tables = ["playlist", "view", "episode_state", "entry_index", "download_rule", "setting"]

    public static func stateToRows(_ state: State) throws -> StateRows {
        var settings: [Row] = [
            ["key": .text("activePlaylistId"), "value": .text(try ProtocolJSON.encode(state.activePlaylistId))],
            ["key": .text("playbackSettings"), "value": .text(try ProtocolJSON.encode(state.playbackSettings))]
        ]
        func setting<T: Encodable>(_ key: String, _ value: T?) throws {
            if let value { settings.append(["key": .text(key), "value": .text(try ProtocolJSON.encode(value))]) }
        }
        try setting("trash", state.trash)
        try setting("trashDays", state.trashDays)
        try setting("listeningLog", state.listeningLog)
        return [
            "playlist": try state.playlists.enumerated().map { i, p in
                ["id": .text(p.id), "ordinal": .integer(Int64(i)), "doc": .text(try ProtocolJSON.encode(p))]
            },
            "view": try state.views.enumerated().map { i, v in
                ["id": .text(v.id), "ordinal": .integer(Int64(i)), "doc": .text(try ProtocolJSON.encode(v))]
            },
            "episode_state": try state.episodeStates.values.sorted { $0.episodeId < $1.episodeId }.map { fact in
                ["episode_id": .text(fact.episodeId), "played_at": .optional(fact.played?.at),
                 "played_source": .optional(try fact.played.map { try ProtocolJSON.encode($0) }), "starred": .integer(fact.starred ? 1 : 0)]
            },
            "entry_index": state.playlists.flatMap { p in p.entries.enumerated().map { i, e in
                ["playlist_id": .text(p.id), "episode_id": .text(e.episodeId), "ordinal": .integer(Int64(i)), "position": .real(e.position)]
            } },
            "download_rule": state.downloadRules.map { r in
                ["subscription_id": .text(r.subscriptionId), "device_id": .text(r.deviceId), "mode": .text(r.mode.rawValue),
                 "keep_at_most": .optional(r.keepAtMost), "since": .optional(r.mode == .allNew ? r.since : nil)]
            },
            "setting": settings
        ]
    }

    public static func rowsToState(_ rows: StateRows) throws -> State {
        let settings = try Dictionary(uniqueKeysWithValues: (rows["setting"] ?? []).map { (try text($0, "key"), try text($0, "value")) })
        func setting<T: Decodable>(_ key: String, as: T.Type = T.self) throws -> T? {
            try settings[key].map { try ProtocolJSON.decode(T.self, from: $0) }
        }
        guard let active: String = try setting("activePlaylistId"), let playback: PlaybackSettings = try setting("playbackSettings") else {
            throw DatabaseFailure(description: "State has not been initialized")
        }
        func documents<T: Decodable>(_ table: String, as: T.Type) throws -> [T] {
            try (rows[table] ?? []).sorted { ($0["ordinal"]?.int ?? 0) < ($1["ordinal"]?.int ?? 0) }.map {
                try ProtocolJSON.decode(T.self, from: text($0, "doc"))
            }
        }
        let facts: [(String, EpisodeState)] = try (rows["episode_state"] ?? []).map { row in
            let id = try text(row, "episode_id")
            let played = try row["played_source"]?.string.map { try ProtocolJSON.decode(Played.self, from: $0) }
            return (id, EpisodeState(episodeId: id, played: played, starred: row["starred"]?.int == 1))
        }
        let rules: [DownloadRule] = try (rows["download_rule"] ?? []).map { row in
            guard let mode = DownloadMode(rawValue: try text(row, "mode")) else { throw DatabaseFailure(description: "Unknown Download Rule mode") }
            return DownloadRule(subscriptionId: try text(row, "subscription_id"), deviceId: try text(row, "device_id"),
                                mode: mode, keepAtMost: row["keep_at_most"]?.int, since: row["since"]?.int)
        }
        return State(playlists: try documents("playlist", as: Playlist.self), activePlaylistId: active,
                     episodeStates: Dictionary(uniqueKeysWithValues: facts), views: try documents("view", as: View.self),
                     downloadRules: rules, playbackSettings: playback, trash: try setting("trash"),
                     trashDays: try setting("trashDays"), listeningLog: try setting("listeningLog"))
    }

    private static func text(_ row: Row, _ key: String) throws -> String {
        guard let value = row[key]?.string else { throw DatabaseFailure(description: "Missing State column \(key)") }
        return value
    }
}
