#if os(macOS)
import SwiftUI

/// Extra commands discovered by the command-surface audit. The visible surface
/// publishes its existing handlers, including its validation and busy state.
/// Separate keys let a sheet override its actions without erasing window actions.
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
    let items: [MenuAction]
    @FocusedValue(\.podListPanelActions) private var panel
    @FocusedValue(\.podListWindowActions) private var window
    @FocusedValue(\.podListImportActions) private var imports
    @FocusedValue(\.podListDiscoveryActions) private var discovery
    @FocusedValue(\.podListSearchViewActions) private var searchView
    @FocusedValue(\.podListRecoveryActions) private var recovery
    @FocusedValue(\.podListSettingsActions) private var settings
    @FocusedValue(\.podListTutorialActions) private var tutorial
    @FocusedValue(\.podListPlayerActions) private var player
    var body: some SwiftUI.View {
        ForEach(items, id: \.self) { item in
            Button(item.rawValue) { action(item)?() }
                .keyboardShortcut(item == .backToLibrary ? KeyboardShortcut("[", modifiers: .command) : nil)
                .disabled(action(item) == nil)
        }
    }
    private func action(_ item: MenuAction) -> (() -> Void)? {
        // Sheet-local commands never fall back to an underlying window's sheet.
        if [.done, .cancel, .save, .cancelRename, .createPlaylist, .playNow, .playNext, .playLast, .apply, .rewind, .bringOver, .notNow, .go, .deletePermanently].contains(item) { return panel?[item] }
        return discovery?[item] ?? searchView?[item] ?? imports?[item] ?? recovery?[item] ?? settings?[item] ?? tutorial?[item] ?? player?[item] ?? window?[item]
    }
}

public struct AdditionalMenuCommands: Commands {
    @Bindable var app: ApplicationModel
    @FocusedValue(\.podListSort) private var sort
    @FocusedValue(\.podListDailyTable) private var dailyTable
    @Environment(\.openWindow) private var openWindow
    public init(app: ApplicationModel) { self.app = app }
    public var body: some Commands {
        CommandGroup(after: .newItem) {
            Menu("Current Dialog") {
                MenuActionItems(items: [.done, .cancel, .save, .cancelRename, .createPlaylist, .createView,
                                        .playNow, .playNext, .playLast, .apply, .rewind, .bringOver, .notNow, .go, .deletePermanently])
            }
            Divider()
            MenuActionItems(items: [.refresh, .showImport, .retryImport])
            Menu("OPML Import") { MenuActionItems(items: [.importSelection, .chooseFile, .cancelImport]) }
            Menu("Connection") { MenuActionItems(items: [.connect, .standalone, .disconnect, .offerBringOver, .retryBringOver]) }
        }
        CommandGroup(after: .sidebar) {
            MenuActionItems(items: [.clearSearch, .backToLibrary])
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
            Toggle("Show Daily Table", isOn: Binding(get: { dailyTable?.wrappedValue ?? false }, set: { dailyTable?.wrappedValue = $0 }))
                .disabled(dailyTable == nil)
            MenuActionItems(items: [.dismissTutorial, .retry, .copyConfiguration, .retryAutomation])
        }
        CommandGroup(after: .help) {
            Button("Getting Started") { openWindow(id: "getting-started") }.disabled(app.libraryEditing == nil)
        }
        CommandGroup(after: .windowList) {
            Button("Listening Stats") { openWindow(id: "listening-stats") }.disabled(app.library == nil)
        }
    }
}
#endif
