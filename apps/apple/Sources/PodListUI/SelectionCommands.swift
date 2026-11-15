#if os(macOS)
import SwiftUI
import PodListDomain
import UniformTypeIdentifiers

/// Published by the visible content, so commands follow the focused window and its selection.
struct PodcastCommandContext {
    var open: (() -> Void)?
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
/// Rename entry points preserve unfinished drafts regardless of which surface opens them.
enum PlaylistRenameAction {
    @MainActor @discardableResult static func prepare(_ playlist: Playlist, editing: PlaylistEditingModel) -> Bool {
        guard !playlist.isDefault, !editing.busy else { return false }
        if editing.drafts["rename-open/\(playlist.id)"] != "true" {
            editing.drafts["rename/\(playlist.id)"] = playlist.name
        }
        editing.drafts["rename-open/\(playlist.id)"] = "true"
        return true
    }
}
enum ViewRenameAction {
    @MainActor @discardableResult static func prepare(_ view: PodListDomain.View, editor: LibraryEditingModel) -> Bool {
        guard !editor.busy else { return false }
        if editor.draft("rename.\(view.id)").isEmpty { editor.setDraft(view.name, field: "rename.\(view.id)") }
        return true
    }
}

enum EpisodePlaybackAction {
    @MainActor static func chapter(_ start: Double, episodeID: String, app: ApplicationModel, started: () -> Void = {}) async {
        guard await app.editing?.add([episodeID], placement: .now) != nil else { return }
        app.playback?.seek(start)
        started()
    }
    @MainActor static func resume(episodeID: String, playlistID: String, app: ApplicationModel, started: () -> Void = {}) async {
        await app.editing?.playFromHere(playlistID: playlistID, episodeID: episodeID)
        if app.editing?.error == nil { started() }
    }
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

/// A single pasteboard item offers descriptive text to text destinations and the
/// share URL to URL destinations. Missing metadata still allows copying its title.
struct EpisodeCopyContent {
    let title: String
    let url: URL?
    var text: String { url.map { "\(title)\n\($0.absoluteString)" } ?? title }
    func itemProvider() -> NSItemProvider {
        let provider = NSItemProvider()
        let textData = Data(text.utf8)
        provider.registerDataRepresentation(forTypeIdentifier: UTType.utf8PlainText.identifier, visibility: .all) { completion in
            completion(textData, nil); return nil
        }
        if let url {
            let urlData = Data(url.absoluteString.utf8)
            provider.registerDataRepresentation(forTypeIdentifier: UTType.url.identifier, visibility: .all) { completion in
                completion(urlData, nil); return nil
            }
        }
        return provider
    }
    @MainActor static func providers(ids: [String], library: LibraryModel) -> [NSItemProvider] {
        ids.map { EpisodeCopyContent(title: library.row($0).title, url: library.episodeShareURL($0)).itemProvider() }
    }
}
#endif
