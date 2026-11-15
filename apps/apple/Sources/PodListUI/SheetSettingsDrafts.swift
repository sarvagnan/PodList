import Foundation
import PodListDomain

/// Sheet-local values never write through their bindings. A single reversible
/// edit applies only fields changed in this session, preserving unrelated sync.
struct PlaylistSettingsDraft: Codable {
    private let playlistID: String
    private let isDefault: Bool
    private let originalName: String
    private let originalClearOnPlayed: Bool
    var name: String
    var clearOnPlayed: Bool
    var field: String { "settings/playlist/\(playlistID)" }
    init(_ playlist: Playlist) {
        playlistID = playlist.id; isDefault = playlist.isDefault
        originalName = playlist.name; originalClearOnPlayed = playlist.clearOnPlayed
        name = playlist.name; clearOnPlayed = playlist.clearOnPlayed
    }
    var changes: [Change] {
        var result: [Change] = []
        if !isDefault, name != originalName { result.append(.renamePlaylist(playlistId: playlistID, name: name)) }
        if clearOnPlayed != originalClearOnPlayed { result.append(.setClearOnPlayed(playlistId: playlistID, clearOnPlayed: clearOnPlayed)) }
        return result
    }
}

struct SubscriptionSettingsDraft: Codable {
    private let subscriptionID: String
    private let originalOverrides: PlaybackSettingsOverride
    private let originalThreshold: Double?
    private let originalRule: DownloadRule?
    let deviceID: String
    var overrides: PlaybackSettingsOverride
    var threshold: Double?
    var mode: DownloadMode
    var cap: Int64?
    var field: String { Self.field(subscriptionID: subscriptionID, deviceID: deviceID) }
    static func field(subscriptionID: String, deviceID: String) -> String {
        "settings/subscription/\(subscriptionID.utf8.count):\(subscriptionID)\(deviceID)"
    }
    init(_ subscription: Subscription, rule: DownloadRule?, deviceID: String) {
        subscriptionID = subscription.id; originalRule = rule; self.deviceID = deviceID
        originalOverrides = subscription.playbackSettings; originalThreshold = subscription.playedThreshold
        overrides = subscription.playbackSettings; threshold = subscription.playedThreshold
        mode = rule?.mode ?? .never; cap = rule?.keepAtMost
    }
    var changes: [Change] {
        var result: [Change] = []
        if overrides != originalOverrides || threshold != originalThreshold {
            result.append(.setSubscriptionOverrides(subscriptionId: subscriptionID, playbackSettings: overrides, playedThreshold: threshold))
        }
        if mode != (originalRule?.mode ?? .never) || cap != originalRule?.keepAtMost {
            result.append(.setDownloadRule(rule: DownloadRule(subscriptionId: subscriptionID, deviceId: deviceID, mode: mode, keepAtMost: cap)))
        }
        return result
    }
}

/// Journal the original settings too: after relaunch, apply only changed fields.
/// Keep these snapshots small; Playlist Entries and recovery history stay in DB.
@MainActor extension PlaylistDrafts {
    func playlistSettings(_ playlist: Playlist) -> PlaylistSettingsDraft {
        restoredSettings(PlaylistSettingsDraft(playlist).field) ?? PlaylistSettingsDraft(playlist)
    }
    func subscriptionSettings(_ subscription: Subscription, rule: DownloadRule?, deviceID: String) -> SubscriptionSettingsDraft {
        restoredSettings(SubscriptionSettingsDraft.field(subscriptionID: subscription.id, deviceID: deviceID))
            ?? SubscriptionSettingsDraft(subscription, rule: rule, deviceID: deviceID)
    }
    func stage(_ draft: PlaylistSettingsDraft) { storeSettings(draft, field: draft.field) }
    func stage(_ draft: SubscriptionSettingsDraft) { storeSettings(draft, field: draft.field) }
    func discardPlaylistSettings(_ id: String) {
        remove("settings/playlist/\(id)")
        remove("rename/\(id)"); remove("rename-open/\(id)")
    }
    private func restoredSettings<T: Decodable>(_ field: String) -> T? {
        self[field].data(using: .utf8).flatMap { try? JSONDecoder().decode(T.self, from: $0) }
    }
    private func storeSettings<T: Encodable>(_ draft: T, field: String) {
        // These fixed domain values contain only JSON-safe settings and IDs.
        // No deferred task or disappear/termination callback can lose a keystroke.
        guard let data = try? JSONEncoder().encode(draft) else { return }
        self[field] = String(decoding: data, as: UTF8.self)
    }
}
