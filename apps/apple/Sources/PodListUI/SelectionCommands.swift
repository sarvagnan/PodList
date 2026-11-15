#if os(macOS)
import SwiftUI
import PodListDomain

/// Published by the visible content, so commands follow the focused window and its selection.
struct PodcastCommandContext {
    var subscribed = false
    var subscriptionAction: (() -> Void)?
    var settings: (() -> Void)?
    var downloadRules: (() -> Void)?
    var shareURL: URL?
    var feedURL: URL?
    var descriptionExpanded = false
    var toggleDescription: (() -> Void)?
}
struct PlaylistCommandContext {
    let playlist: Playlist
    let presentation: PlaylistPresentation
}
private struct EpisodeDetailsKey: FocusedValueKey { typealias Value = () -> Void }
private struct PodcastCommandKey: FocusedValueKey { typealias Value = PodcastCommandContext }
private struct PlaylistCommandKey: FocusedValueKey { typealias Value = PlaylistCommandContext }
private struct RestoreCommandKey: FocusedValueKey { typealias Value = () -> Void }
private struct RewindCommandKey: FocusedValueKey { typealias Value = () -> Void }
extension FocusedValues {
    var podListEpisodeDetails: (() -> Void)? {
        get { self[EpisodeDetailsKey.self] }
        set { self[EpisodeDetailsKey.self] = newValue }
    }
    var podListPodcast: PodcastCommandContext? {
        get { self[PodcastCommandKey.self] }
        set { self[PodcastCommandKey.self] = newValue }
    }
    var podListPlaylist: PlaylistCommandContext? {
        get { self[PlaylistCommandKey.self] }
        set { self[PlaylistCommandKey.self] = newValue }
    }
    var podListRestore: (() -> Void)? {
        get { self[RestoreCommandKey.self] }
        set { self[RestoreCommandKey.self] = newValue }
    }
    var podListRewind: (() -> Void)? {
        get { self[RewindCommandKey.self] }
        set { self[RewindCommandKey.self] = newValue }
    }
}
#endif
