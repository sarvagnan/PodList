#if os(macOS)
import SwiftUI

/// Navigation commands name their destination and never imply an object edit.
enum LibraryNavigationCommand: CaseIterable {
    case trash, subscriptions, views
    var title: String {
        switch self {
        case .trash: "Show Trash"
        case .subscriptions: "Show Subscriptions"
        case .views: "Show All Views"
        }
    }
    var destination: Destination {
        switch self {
        case .trash: .trash
        case .subscriptions: .subscriptions
        case .views: .views
        }
    }
}

private struct LibraryActionKey: FocusedValueKey { typealias Value = LibraryWindowActions }
public struct LibraryWindowActions {
    public var add: () -> Void
    public var newView: () -> Void
    public var search: () -> Void
    public var editView: () -> Void
    public var openInNewWindow: (() -> Void)?
    public var renameView: (() -> Void)? = nil
    public var selectedViewID: String? = nil
    public var deleteView: (() -> Void)? = nil
}
public extension FocusedValues {
    var podListLibraryActions: LibraryWindowActions? {
        get { self[LibraryActionKey.self] }
        set { self[LibraryActionKey.self] = newValue }
    }
}
struct LibrarySidebarContext {
    let visible: Bool
    let toggle: () -> Void
    var title: String { visible ? "Hide Sidebar" : "Show Sidebar" }
}
private struct LibrarySidebarKey: FocusedValueKey { typealias Value = LibrarySidebarContext }
extension FocusedValues {
    var podListSidebar: LibrarySidebarContext? {
        get { self[LibrarySidebarKey.self] }
        set { self[LibrarySidebarKey.self] = newValue }
    }
}
public struct LibrarySidebarCommands: Commands {
    @FocusedValue(\.podListSidebar) private var sidebar
    public init() {}
    public var body: some Commands {
        CommandGroup(replacing: .sidebar) {
            Button(sidebar?.title ?? "Show Sidebar") { sidebar?.toggle() }
                // ⌃⌘S is the system Show/Hide Sidebar binding (SwiftUI SidebarCommands,
                // NSSplitViewController.toggleSidebar); only the state-specific title is ours.
                .keyboardShortcut("s", modifiers: [.command, .control])
                .disabled(sidebar == nil)
        }
    }
}

public struct LibraryCommands: Commands {
    @Bindable var app: ApplicationModel
    @FocusedValue(\.podListLibraryActions) private var actions
    @FocusedValue(\.podListEpisodes) private var context
    @FocusedValue(\.podListPodcast) private var podcast
    @FocusedValue(\.podListViewEditorActions) private var viewEditor
    @Environment(\.openWindow) private var openWindow
    public init(app: ApplicationModel) { self.app = app }
    public var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("New Window") { openWindow(id: "library") }.keyboardShortcut("n", modifiers: [.command, .option, .shift])
            Button("New View…", action: { actions?.newView() }).keyboardShortcut("n").disabled(actions == nil)
            Button("New Playlist…") { context?.presentation.present(.newPlaylist, from: context?.editOrigin) }
                .keyboardShortcut("n", modifiers: [.command, .shift]).disabled(context == nil || app.editing == nil)
            Button("Open in New Window") { actions?.openInNewWindow?() }.disabled(actions?.openInNewWindow == nil)
            Divider()
            Button("Add Podcasts…") { openWindow(id: "add-podcasts") }.keyboardShortcut("a", modifiers: [.command, .shift]).disabled(app.libraryEditing == nil)
            Button("Import OPML…") { LibraryFileActions.importOPML(app) }
                .keyboardShortcut("o").disabled(app.libraryEditing?.busy != false)
            Button("Export OPML…") { LibraryFileActions.exportOPML(app) }.disabled(app.library == nil)
            MenuActionItems(menu: .file, app: app)
        }
        CommandMenu("Podcast") {
            Button(LibraryNavigationCommand.subscriptions.title) { context?.window.navigate(to: LibraryNavigationCommand.subscriptions.destination) }.disabled(context == nil)
            MenuActionItems(menu: .podcast, app: app)
            if let progress = app.feedRefreshProgress {
                Button(progress) {}.disabled(true)
            }
            Button("Cancel Feed Refresh") { app.cancelFeedRefresh() }.disabled(!app.canCancelFeedRefresh)
            Button(podcast?.openTitle ?? "Open Subscription") { podcast?.open?() }.disabled(podcast?.open == nil)
            Divider()
            Button(podcast?.subscribed == true ? "Unsubscribe" : "Subscribe") { podcast?.subscriptionAction?() }
                .disabled(podcast?.subscriptionAction == nil)
            Button("Mark All Played") { podcast?.markAllPlayed?() }.disabled(podcast?.markAllPlayed == nil)
            Button(PodcastCommandContext.refreshTitle) { podcast?.refresh?() }.disabled(podcast?.refresh == nil || !app.canRefreshFeeds)
            Button("Subscription Settings…") { podcast?.settings?() }.disabled(podcast?.settings == nil)
            Button("Edit Download Rules…") { podcast?.downloadRules?() }.disabled(podcast?.downloadRules == nil)
            Divider()
            ShareLink(items: podcast?.shareURL.map { [$0] } ?? []) { Text("Share Podcast…") }.disabled(podcast?.shareURL == nil)
            Button("Copy PodList Link") {
                if let url = podcast?.feedURL { ShareLinks.copy(PodListLink.podcast(url.absoluteString).url) }
            }.disabled(podcast?.feedURL == nil)
            Button("Copy Feed Address") { if let url = podcast?.feedURL { ShareLinks.copy(url) } }.disabled(podcast?.feedURL == nil)
        }
        CommandMenu("Saved Views") {
            Menu("Open View") {
                ForEach(context?.library.state.views ?? [], id: \.id) { view in
                    Button(view.name) { context?.window.navigate(to: .view(view.id)) }
                }
            }.disabled(context?.library.state.views.isEmpty != false)
            MenuActionItems(menu: .views)
            Button(LibraryNavigationCommand.views.title) { context?.window.navigate(to: LibraryNavigationCommand.views.destination) }.disabled(context == nil)
            Button("Edit View…") { actions?.editView() }.keyboardShortcut(PodListShortcut.editView.shortcut)
                .disabled(selectedViewID == nil || app.libraryEditing?.busy != false || app.editing?.busy != false)
            Button("Rename View…") {
                if let viewEditor { viewEditor.rename?() } else { actions?.renameView?() }
            }.disabled(viewEditor != nil ? viewEditor?.rename == nil : actions?.renameView == nil)
            Button("Copy PodList Link") {
                if let id = selectedViewID { ShareLinks.copy(PodListLink.view(id).url) }
            }.disabled(selectedViewID == nil)
            Button("Delete View", role: .destructive) {
                if let viewEditor { viewEditor.delete?(); return }
                actions?.deleteView?()
            }.disabled(viewEditor != nil ? viewEditor?.delete == nil : actions?.deleteView == nil)
        }
        // The standard Find submenu also uses Command-F. SwiftUI resolves
        // duplicate equivalents in menu order.
        CommandGroup(before: .textEditing) {
            Button(PodListShortcut.searchLibrary.title) { actions?.search() }
                .keyboardShortcut(PodListShortcut.searchLibrary.shortcut).disabled(actions == nil)
        }
        CommandGroup(after: .textEditing) { MenuActionItems(menu: .edit) }
    }
    private var selectedViewID: String? {
        actions?.selectedViewID
    }
}
#endif
