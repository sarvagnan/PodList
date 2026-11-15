import PodListDomain

/// Sheet-local values never write through their bindings. A single reversible
/// edit applies only fields changed in this session, preserving unrelated sync.
struct PlaylistSettingsDraft {
    private let original: Playlist
    var name: String
    var clearOnPlayed: Bool
    init(_ playlist: Playlist) {
        original = playlist; name = playlist.name; clearOnPlayed = playlist.clearOnPlayed
    }
    var changes: [Change] {
        var result: [Change] = []
        if !original.isDefault, name != original.name { result.append(.renamePlaylist(playlistId: original.id, name: name)) }
        if clearOnPlayed != original.clearOnPlayed { result.append(.setClearOnPlayed(playlistId: original.id, clearOnPlayed: clearOnPlayed)) }
        return result
    }
}

struct SubscriptionSettingsDraft {
    private let original: Subscription
    private let originalRule: DownloadRule?
    let deviceID: String
    var overrides: PlaybackSettingsOverride
    var threshold: Double?
    var mode: DownloadMode
    var cap: Int64?
    var markAllPlayed = false
    init(_ subscription: Subscription, rule: DownloadRule?, deviceID: String) {
        original = subscription; originalRule = rule; self.deviceID = deviceID
        overrides = subscription.playbackSettings; threshold = subscription.playedThreshold
        mode = rule?.mode ?? .never; cap = rule?.keepAtMost
    }
    func changes(episodeIDs: [String]) -> [Change] {
        var result: [Change] = []
        if overrides != original.playbackSettings || threshold != original.playedThreshold {
            result.append(.setSubscriptionOverrides(subscriptionId: original.id, playbackSettings: overrides, playedThreshold: threshold))
        }
        if mode != (originalRule?.mode ?? .never) || cap != originalRule?.keepAtMost {
            result.append(.setDownloadRule(rule: DownloadRule(subscriptionId: original.id, deviceId: deviceID, mode: mode, keepAtMost: cap)))
        }
        // Concrete Episode changes retain the shared reversible Mark Played semantics.
        if markAllPlayed { result += episodeIDs.map { .markPlayed(episodeId: $0, source: .user) } }
        return result
    }
}
