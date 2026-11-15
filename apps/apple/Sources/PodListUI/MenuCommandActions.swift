#if os(macOS)
import SwiftUI

/// The visible surface publishes its existing handlers and validation. Menu
/// placement follows the object or task, independently of the publishing surface.
enum MenuAction: String, CaseIterable {
    case done = "Done", cancel = "Cancel", save = "Save", cancelRename = "Cancel Rename"
    case createPlaylist = "Create Playlist", createView = "Create View"
    case playNow = "Play Now", playNext = "Play Next", playLast = "Play Last"
    case go = "Go", deletePermanently = "Delete Permanently"
    case apply = "Apply", rewind = "Rewind", bringOver = "Bring Over", notNow = "Not Now"
    case refresh = "Refresh Library", showImport = "Show Import Results", retryImport = "Retry Failed Imports"
    case importSelection = "Import", chooseFile = "Choose a File…", cancelImport = "Cancel Import"
    case connect = "Check and Connect", standalone = "Start on This Mac", disconnect = "Disconnect"
    case offerBringOver = "Bring Library from this Mac…", retryBringOver = "Retry Bring Over"
    case clearSearch = "Clear Search", backToLibrary = "Back to Library", dismissTutorial = "Dismiss Getting Started"
    case createViewFromSearch = "Create View from Search…", searchPodcasts = "Search Podcasts"
    case retry = "Retry", copyConfiguration = "Copy Configuration", retryAutomation = "Retry MCP Server"
    case backToNowPlaying = "Back to Now Playing", retryPlayback = "Retry Playback"

    var menu: MenuActionMenu? {
        switch self {
        case .showImport: .file
        case .clearSearch: .edit
        case .refresh, .backToLibrary, .searchPodcasts: .podcast
        case .createViewFromSearch: .views
        case .connect, .standalone, .disconnect, .offerBringOver: .connection
        case .backToNowPlaying: .controls
        // Sheet buttons, transient recovery and Settings helpers stay on their
        // own surfaces. Persistent object actions use the object command menus.
        case .done, .cancel, .save, .cancelRename, .createPlaylist, .createView,
             .playNow, .playNext, .playLast, .go, .deletePermanently, .apply,
             .rewind, .bringOver, .notNow, .importSelection, .chooseFile, .cancelImport,
             .retryImport, .retryBringOver, .dismissTutorial, .retry,
             .copyConfiguration, .retryAutomation, .retryPlayback: nil
        }
    }
}

enum MenuActionMenu: CaseIterable {
    case file, edit, podcast, views, connection, controls
    var items: [MenuAction] { MenuAction.allCases.filter { $0.menu == self } }
}
struct MenuActionContext {
    var actions: [MenuAction: () -> Void] = [:]
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
    @FocusedValue(\.podListWindowActions) private var window
    @FocusedValue(\.podListImportActions) private var imports
    @FocusedValue(\.podListDiscoveryActions) private var discovery
    @FocusedValue(\.podListSearchViewActions) private var searchView
    @FocusedValue(\.podListSettingsActions) private var settings
    @FocusedValue(\.podListPlayerActions) private var player
    var body: some SwiftUI.View {
        ForEach(menu.items, id: \.self) { item in
            Button(item.rawValue) { action(item)?() }
                .keyboardShortcut(item == .backToLibrary ? KeyboardShortcut("[", modifiers: .command) : nil)
                .disabled(action(item) == nil)
        }
    }
    private func action(_ item: MenuAction) -> (() -> Void)? {
        return discovery?[item] ?? searchView?[item] ?? imports?[item] ?? settings?[item] ?? player?[item] ?? window?[item]
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
        CommandGroup(after: .appSettings) {
            Menu("Connection") { MenuActionItems(menu: .connection) }
        }
        CommandGroup(after: .sidebar) {
            Menu("Sort by") {
                Picker("Column", selection: Binding(get: { sort?.wrappedValue.first?.column }, set: { column in
                    sort?.wrappedValue = column.map { [.init(column: $0, reversed: sort?.wrappedValue.first?.reversed ?? false)] } ?? []
                })) {
                    Text("Default order").tag(Optional<WindowSort.Column>.none)
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
