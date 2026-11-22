#if os(macOS)
import SwiftUI
import AppKit

/// The visible surface publishes its existing handlers and validation. Menu
/// placement follows the object or task, independently of the publishing surface.
enum MenuAction: String, CaseIterable {
    case done = "Done", close = "Close", cancel = "Cancel", save = "Save", cancelRename = "Cancel Rename"
    case createPlaylist = "Create Playlist", createView = "Create View"
    case playNow = "Play Now", playNext = "Play Next", playLast = "Play Last"
    case go = "Go", deletePermanently = "Delete Permanently"
    case rewind = "Rewind", bringOver = "Bring Over", notNow = "Not Now"
    case refresh = "Refresh All Feeds", retryFeedRefresh = "Retry Feed Refresh"
    case showImport = "Show Import Results", retryImport = "Retry Failed Imports"
    case importSelection = "Import", chooseFile = "Choose a File…", cancelImport = "Cancel Import"
    case connect = "Check and Connect", standalone = "Start on This Mac", disconnect = "Disconnect"
    case offerBringOver = "Bring Library from This Mac…", retryBringOver = "Retry Bring Over"
    case clearSearch = "Clear Search", backToLibrary = "Back to Library", dismissTutorial = "Hide Getting Started"
    case createViewFromSearch = "Create View from Search…", searchPodcasts = "Search Podcasts"
    case retry = "Retry Failed Operation", copyConfiguration = "Copy Configuration", retryAutomation = "Retry MCP Server"
    case backToNowPlaying = "Back to Now Playing", retryPlayback = "Retry Playback"
    case retryEpisodeDrop = "Retry Failed Episode Drop"
    case removeEpisodeDrop = "Remove Failed Episode Drops"

    var menu: MenuActionMenu? {
        switch self {
        case .showImport, .cancelImport, .retryImport: .file
        case .clearSearch, .retry: .edit
        case .retryEpisodeDrop, .removeEpisodeDrop: .episode
        case .refresh, .retryFeedRefresh, .backToLibrary, .searchPodcasts: .podcast
        case .createViewFromSearch: .views
        case .connect, .standalone, .disconnect, .offerBringOver, .retryBringOver: .connection
        case .backToNowPlaying, .retryPlayback: .controls
        case .copyConfiguration, .retryAutomation: .automation
        // Dialog submission stays on its own surface; recovery is indexed separately.
        case .done, .close, .cancel, .save, .cancelRename, .createPlaylist, .createView,
             .playNow, .playNext, .playLast, .go, .deletePermanently,
             .rewind, .bringOver, .notNow, .importSelection, .chooseFile,
             .dismissTutorial: nil
        }
    }

    var shortcut: KeyboardShortcut? {
        switch self {
        case .refresh: PodListShortcut.refreshAllFeeds.shortcut
        case .backToLibrary: KeyboardShortcut("[", modifiers: .command)
        default: nil
        }
    }
}

enum MenuActionMenu: CaseIterable {
    case file, edit, podcast, views, episode, connection, controls, automation
    var items: [MenuAction] { MenuAction.allCases.filter { $0.menu == self } }
}
struct MenuActionContext {
    var actions: [MenuAction: () -> Void] = [:]
    var retryTitle = "Retry Failed Operation"
    subscript(_ action: MenuAction) -> (() -> Void)? { actions[action] }
}
private struct PanelActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct WindowActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct ImportActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct DiscoveryActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct SearchViewActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct RecoveryActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct SettingsActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct TutorialActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct PlayerActionsKey: FocusedValueKey { typealias Value = MenuActionContext }
private struct SortActionsKey: FocusedValueKey { typealias Value = Binding<[WindowSort]> }
private struct DailyTableKey: FocusedValueKey { typealias Value = Binding<Bool> }
extension FocusedValues {
    var podListPanelActions: MenuActionContext? { get { self[PanelActionsKey.self] } set { self[PanelActionsKey.self] = newValue } }
    var podListWindowActions: MenuActionContext? { get { self[WindowActionsKey.self] } set { self[WindowActionsKey.self] = newValue } }
    var podListImportActions: MenuActionContext? { get { self[ImportActionsKey.self] } set { self[ImportActionsKey.self] = newValue } }
    var podListDiscoveryActions: MenuActionContext? { get { self[DiscoveryActionsKey.self] } set { self[DiscoveryActionsKey.self] = newValue } }
    var podListSearchViewActions: MenuActionContext? { get { self[SearchViewActionsKey.self] } set { self[SearchViewActionsKey.self] = newValue } }
    var podListRecoveryActions: MenuActionContext? { get { self[RecoveryActionsKey.self] } set { self[RecoveryActionsKey.self] = newValue } }
    var podListSettingsActions: MenuActionContext? { get { self[SettingsActionsKey.self] } set { self[SettingsActionsKey.self] = newValue } }
    var podListTutorialActions: MenuActionContext? { get { self[TutorialActionsKey.self] } set { self[TutorialActionsKey.self] = newValue } }
    var podListPlayerActions: MenuActionContext? { get { self[PlayerActionsKey.self] } set { self[PlayerActionsKey.self] = newValue } }
    var podListSort: Binding<[WindowSort]>? { get { self[SortActionsKey.self] } set { self[SortActionsKey.self] = newValue } }
    var podListDailyTable: Binding<Bool>? { get { self[DailyTableKey.self] } set { self[DailyTableKey.self] = newValue } }
}

/// The registry is also used in menus that already own the corresponding domain.
struct MenuActionItems: SwiftUI.View {
    let menu: MenuActionMenu
    var app: ApplicationModel? = nil
    @FocusedValue(\.podListWindowActions) private var window
    @FocusedValue(\.podListImportActions) private var imports
    @FocusedValue(\.podListDiscoveryActions) private var discovery
    @FocusedValue(\.podListSearchViewActions) private var searchView
    @FocusedValue(\.podListSettingsActions) private var settings
    @FocusedValue(\.podListPlayerActions) private var player
    @FocusedValue(\.podListRecoveryActions) private var recovery
    var body: some SwiftUI.View {
        ForEach(menu.items, id: \.self) { item in
            Button(item == .retry ? retryTitle : item.rawValue) { action(item)?() }
                .keyboardShortcut(item.shortcut)
                .disabled(action(item) == nil)
        }
    }
    private var retryTitle: String {
        [recovery, discovery, searchView, imports, settings, player, window]
            .compactMap { $0 }.first { $0[.retry] != nil }?.retryTitle ?? MenuAction.retry.rawValue
    }
    private func action(_ item: MenuAction) -> (() -> Void)? {
        if let app, PersistentMenuActions.owns(item) { return PersistentMenuActions.context(app)[item] }
        return recovery?[item] ?? discovery?[item] ?? searchView?[item] ?? imports?[item] ?? settings?[item] ?? player?[item] ?? window?[item]
    }
}

/// These operations outlive their presenting sheet and use application state,
/// so moving focus to Settings or closing the progress sheet does not hide them.
@MainActor enum PersistentMenuActions {
    static func owns(_ action: MenuAction) -> Bool {
        [.refresh, .retryFeedRefresh, .showImport, .cancelImport, .retryImport, .retryBringOver,
         .retryPlayback, .retryEpisodeDrop, .removeEpisodeDrop, .copyConfiguration, .retryAutomation].contains(action)
    }
    static func episodeDrops(_ editor: LibraryEditingModel) -> MenuActionContext {
        guard editor.episodeDrop == nil, !editor.busy, !editor.edits.busy else { return MenuActionContext() }
        var actions: [MenuAction: () -> Void] = [:]
        if let failure = editor.failedEpisodeDrop {
            actions[.retryEpisodeDrop] = {
                editor.edits.announcements.error(nil)
                Task { await failure.retry() }
            }
        }
        if !EpisodeDrop.failedIDs(editor: editor).isEmpty {
            actions[.removeEpisodeDrop] = {
                for id in EpisodeDrop.failedIDs(editor: editor) { EpisodeDrop.remove(id, editor: editor) }
            }
        }
        return MenuActionContext(actions: actions)
    }

    static func imports(_ editor: LibraryEditingModel) -> MenuActionContext {
        var actions: [MenuAction: () -> Void] = [:]
        if editor.busy || editor.importReady || !editor.importFeeds.isEmpty || !editor.importFailed.isEmpty {
            actions[.showImport] = { editor.importPresented = true }
        }
        if editor.busy && !editor.importCancellationRequested { actions[.cancelImport] = { editor.cancelImport() } }
        if !editor.busy && !editor.importFailed.isEmpty { actions[.retryImport] = { Task { await editor.retryImport() } } }
        return MenuActionContext(actions: actions)
    }
    static func context(_ app: ApplicationModel) -> MenuActionContext {
        var result = app.libraryEditing.map(imports) ?? MenuActionContext()
        if let editor = app.libraryEditing { result.actions.merge(episodeDrops(editor).actions) { _, new in new } }
        result.actions[.refresh] = app.feedRefreshAction(.all)
        result.actions[.retryFeedRefresh] = app.feedRefreshIssue.flatMap { app.feedRefreshAction($0.target) }
        if app.origin != nil && app.bringOverJob?.complete == false && !app.syncing && app.refreshingFeeds == nil {
            result.actions[.retryBringOver] = { Task { await app.sync(forceRefresh: true) } }
        }
        if let player = app.playback, player.error != nil { result.actions[.retryPlayback] = { player.play() } }
        let automation = app.automation
        if automation.isEnabled {
            result.actions[.copyConfiguration] = {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(automation.clientConfiguration, forType: .string)
            }
        }
        if automation.error != nil {
            result.actions[.retryAutomation] = { if automation.isEnabled { automation.start() } else { automation.stop() } }
        }
        return result
    }
}

public struct AdditionalMenuCommands: Commands {
    @Bindable var app: ApplicationModel
    @FocusedValue(\.podListSort) private var sort
    @FocusedValue(\.podListDailyTable) private var dailyTable
    @FocusedValue(\.podListPodcast) private var podcast
    @Environment(\.openWindow) private var openWindow
    public init(app: ApplicationModel) { self.app = app }
    public var body: some Commands {
        // The Settings scene's own Settings… item follows anything placed in .appSettings
        // (and survives replacing it), so configuration submenus go after it, before Services.
        CommandGroup(before: .systemServices) {
            Menu("Connection") { MenuActionItems(menu: .connection, app: app) }
            Menu("Automation") { MenuActionItems(menu: .automation, app: app) }
        }
        CommandGroup(after: .sidebar) {
            Menu("Sort By") {
                Picker("Sort Column", selection: Binding(get: { sort?.wrappedValue.first?.column }, set: { column in
                    sort?.wrappedValue = column.map { [.init(column: $0, reversed: sort?.wrappedValue.first?.reversed ?? false)] } ?? []
                })) {
                    Text("Default Order").tag(Optional<WindowSort.Column>.none)
                    Text("Title").tag(Optional(WindowSort.Column.title))
                    Text("Published").tag(Optional(WindowSort.Column.published))
                    Text("Length").tag(Optional(WindowSort.Column.length))
                    Text("State").tag(Optional(WindowSort.Column.state))
                }.pickerStyle(.inline)
            }.disabled(sort == nil)
            Toggle("Descending", isOn: Binding(get: { sort?.wrappedValue.first?.reversed ?? false }, set: { value in
                guard var values = sort?.wrappedValue, !values.isEmpty else { return }
                values[0].reversed = value; sort?.wrappedValue = values
            })).disabled(sort?.wrappedValue.isEmpty != false)
            Button(podcast?.descriptionExpanded == true ? "Hide Description" : "Show Description") { podcast?.toggleDescription?() }
                .disabled(podcast?.toggleDescription == nil)
            Menu("Listening Stats") {
                Toggle("Show Daily Table", isOn: Binding(get: { dailyTable?.wrappedValue ?? false }, set: { dailyTable?.wrappedValue = $0 }))
            }.disabled(dailyTable == nil)
        }
        // Window › Listening Stats comes from its Window scene; a custom item here listed it
        // twice (WMENU-03).
    }
}
#endif
