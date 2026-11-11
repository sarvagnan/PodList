#if os(macOS)
import SwiftUI

private struct LibraryActionKey: FocusedValueKey { typealias Value = LibraryWindowActions }
public struct LibraryWindowActions {
    public var add: () -> Void
    public var newView: () -> Void
    public var search: () -> Void
}
public extension FocusedValues {
    var podListLibraryActions: LibraryWindowActions? {
        get { self[LibraryActionKey.self] }
        set { self[LibraryActionKey.self] = newValue }
    }
}
public struct LibraryCommands: Commands {
    @Bindable var app: ApplicationModel
    @FocusedValue(\.podListLibraryActions) private var actions
    @Environment(\.openWindow) private var openWindow
    public init(app: ApplicationModel) { self.app = app }
    public var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("New Window") { openWindow(id: "library") }.keyboardShortcut("n", modifiers: [.command, .shift])
            Button("New View", action: { actions?.newView() }).keyboardShortcut("n").disabled(actions == nil)
            Button("Add Podcasts…", action: { actions?.add() }).keyboardShortcut("a", modifiers: [.command, .shift]).disabled(actions == nil)
            Divider()
            Button("Import OPML…") { LibraryFileActions.importOPML(app) }.disabled(app.library == nil || app.libraryEditing?.busy == true)
            Button("Export OPML…") { LibraryFileActions.exportOPML(app) }.disabled(app.library == nil)
        }
        CommandGroup(after: .textEditing) {
            Button("Search Library", action: { actions?.search() }).keyboardShortcut("f").disabled(actions == nil)
        }
        CommandGroup(after: .windowList) { Button("Listening stats") { openWindow(id: "listening-stats") } }
    }
}
#endif
