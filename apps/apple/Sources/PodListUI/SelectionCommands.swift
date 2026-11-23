#if os(macOS)
import SwiftUI
import PodListDomain
import UniformTypeIdentifiers

/// Published by the visible content, so commands follow the focused window and its selection.
struct PodcastCommandContext {
    static let refreshTitle = "Refresh Podcast"
    static let openPodcastPageTitle = "Open Podcast Page"
    var open: (() -> Void)?
    var openTitle = "Open Subscription"
    var subscribed = false
    var subscriptionAction: (() -> Void)?
    var settings: (() -> Void)?
    var downloadRules: (() -> Void)?
    var markAllPlayed: (() -> Void)?
    var refresh: (() -> Void)?
    var shareURL: URL?
    var feedURL: URL?
    var descriptionExpanded = false
    var toggleDescription: (() -> Void)?
}
struct EpisodeMenuOverrides {
    var play: () -> Void
    var add: () -> Void
}
struct NowPlayingEpisodeContext {
    var id: String
    var library: LibraryModel
    var presentation: PlaylistPresentation
}
private struct RemoteEpisodeKey: FocusedValueKey { typealias Value = EpisodeMenuOverrides }
private struct NowPlayingEpisodeKey: FocusedValueKey { typealias Value = NowPlayingEpisodeContext }
struct PlaylistCommandContext {
    let playlist: Playlist
    let presentation: PlaylistPresentation
    let window: WindowModel
}
/// Rename entry points preserve unfinished drafts regardless of which surface opens them.
enum PlaylistRenameAction {
    @MainActor @discardableResult static func prepare(_ playlist: Playlist, editing: PlaylistEditingModel) -> Bool {
        guard !playlist.isDefault, !editing.busy else { return false }
        if editing.drafts["rename-open/\(playlist.id)"] != "true" {
            editing.drafts["rename/\(playlist.id)"] = editing.drafts.playlistSettings(playlist).name
        }
        editing.drafts["rename-open/\(playlist.id)"] = "true"
        return true
    }
}
enum ViewRenameAction {
    @MainActor @discardableResult static func prepare(_ view: PodListDomain.View, editor: LibraryEditingModel) -> Bool {
        guard !editor.busy else { return false }
        if !editor.hasDraft("rename.\(view.id)") { editor.setDraft(view.name, field: "rename.\(view.id)") }
        return true
    }
}

enum TrashSelectionAction {
    static func playlist(in library: LibraryModel, selection: String?, search: String, busy: Bool) -> Playlist? {
        guard !busy else { return nil }
        return library.trash.first {
            $0.playlist.id == selection && (search.isEmpty || $0.playlist.name.localizedStandardContains(search))
        }?.playlist
    }
}

enum SubscriptionPlayedAction {
    @MainActor static func action(_ subscription: Subscription?, editor: LibraryEditingModel, origin: EditOrigin? = nil) -> (() -> Void)? {
        guard let subscription, subscription.unsubscribedAt == nil, !editor.busy, !editor.edits.busy else { return nil }
        return {
            editor.run(origin: origin) { try await editor.edit(.markSubscriptionPlayed(subscriptionId: subscription.id)) }
        }
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

/// Native row activation uses Play Now in the Active Playlist or the Entries list it came from.
struct EpisodeRowActivation: Equatable {
    let ids: [String]
    let playlistID: String?

    init?(orderedIDs: [String], selection: Set<String>, entriesPlaylistID: String? = nil) {
        let ids = orderedIDs.filter { selection.contains($0) }
        guard let first = ids.first else { return nil }
        self.ids = entriesPlaylistID == nil ? ids : [first]
        self.playlistID = entriesPlaylistID
    }

    @MainActor func play(using editing: PlaylistEditingModel) async {
        await editing.add(ids, to: playlistID, placement: .now)
    }

    @MainActor func start(using editing: PlaylistEditingModel?, origin: EditOrigin? = nil) {
        guard let editing, !editing.busy else { return }
        EditOrigin.start(origin) { await play(using: editing) }
    }
}

struct EditHistoryCommandContext {
    let restoredEntriesHandler: @MainActor (LibraryEditingModel) -> (@MainActor ([RestoredEntries]) -> Void)
}
private struct EditHistoryCommandKey: FocusedValueKey { typealias Value = EditHistoryCommandContext }
struct PlaylistSettingsCommandContext {
    var rename: (() -> Void)?
    var delete: (() -> Void)?
    var restore: (() -> Void)?

    static func restoreAction(isDeleted: Bool, busy: Bool, perform: @escaping () -> Void) -> (() -> Void)? {
        isDeleted && !busy ? perform : nil
    }

    static func focusedRestore(sheet: Self?, trash: (() -> Void)?) -> (() -> Void)? {
        if let sheet { return sheet.restore }
        return trash
    }
}
private struct PlaylistSettingsCommandKey: FocusedValueKey { typealias Value = PlaylistSettingsCommandContext }
struct ViewEditorCommandContext {
    var rename: (() -> Void)?
    var delete: (() -> Void)?
}
private struct ViewEditorCommandKey: FocusedValueKey { typealias Value = ViewEditorCommandContext }
private struct EpisodeDetailsKey: FocusedValueKey { typealias Value = () -> Void }
private struct PodcastCommandKey: FocusedValueKey { typealias Value = PodcastCommandContext }
private struct PlaylistCommandKey: FocusedValueKey { typealias Value = PlaylistCommandContext }
private struct RestoreCommandKey: FocusedValueKey { typealias Value = () -> Void }
private struct DeletePermanentlyCommandKey: FocusedValueKey { typealias Value = () -> Void }
private struct RewindCommandKey: FocusedValueKey { typealias Value = () -> Void }
extension FocusedValues {
    var podListEditHistory: EditHistoryCommandContext? {
        get { self[EditHistoryCommandKey.self] }
        set { self[EditHistoryCommandKey.self] = newValue }
    }
    var podListPlaylistSettingsActions: PlaylistSettingsCommandContext? {
        get { self[PlaylistSettingsCommandKey.self] }
        set { self[PlaylistSettingsCommandKey.self] = newValue }
    }
    var podListViewEditorActions: ViewEditorCommandContext? {
        get { self[ViewEditorCommandKey.self] }
        set { self[ViewEditorCommandKey.self] = newValue }
    }
    var podListRemoteEpisode: EpisodeMenuOverrides? {
        get { self[RemoteEpisodeKey.self] }
        set { self[RemoteEpisodeKey.self] = newValue }
    }
    var podListNowPlayingEpisode: NowPlayingEpisodeContext? {
        get { self[NowPlayingEpisodeKey.self] }
        set { self[NowPlayingEpisodeKey.self] = newValue }
    }
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
    var podListDeletePermanently: (() -> Void)? {
        get { self[DeletePermanentlyCommandKey.self] }
        set { self[DeletePermanentlyCommandKey.self] = newValue }
    }
    var podListRewind: (() -> Void)? {
        get { self[RewindCommandKey.self] }
        set { self[RewindCommandKey.self] = newValue }
    }
}

/// A single pasteboard item offers descriptive text to text destinations and the
/// share URL to URL destinations. Missing metadata still allows copying its title.
struct SelectionCopyContent {
    let text: String
    let url: URL?

    init(text: String, url: URL?) {
        self.text = text; self.url = url
    }

    init(title: String, url: URL?) {
        self.init(text: url.map { "\(title)\n\($0.absoluteString)" } ?? title, url: url)
    }

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
    @MainActor static func episodeProviders(ids: [String], library: LibraryModel) -> [NSItemProvider] {
        ids.map { SelectionCopyContent(title: library.row($0).title, url: library.episodeShareURL($0)).itemProvider() }
    }
}
#endif
