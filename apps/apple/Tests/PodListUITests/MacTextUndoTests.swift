#if os(macOS)
import AppKit
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

@MainActor
private final class DraftFieldEditor: NSTextView {
    private let manager = UndoManager()
    override var undoManager: UndoManager? { manager }

    func replaceDraft(with text: String) {
        let previous = string
        manager.registerUndo(withTarget: self) { editor in
            MainActor.assumeIsolated { editor.replaceDraft(with: previous) }
        }
        string = text
    }
}

@MainActor @Test func textUndoMenuTracksTypingAndReleasesTheCommandWhenEditingEnds() async throws {
    let field = DraftFieldEditor()
    let manager = try #require(field.undoManager)
    manager.groupsByEvent = false
    var focusedEditor: NSTextView?
    let menu = MacTextUndo(editor: { focusedEditor })
    func settleMenu() async {
        await withCheckedContinuation { continuation in
            DispatchQueue.main.async { continuation.resume() }
        }
    }

    #expect(menu.state == nil)
    focusedEditor = field
    NotificationCenter.default.post(name: NSControl.textDidBeginEditingNotification, object: nil)
    await settleMenu()
    #expect(menu.state?.canUndo == false)
    #expect(menu.perform())

    manager.beginUndoGrouping()
    field.replaceDraft(with: "Tour draft")
    NotificationCenter.default.post(name: NSControl.textDidChangeNotification, object: nil)
    manager.endUndoGrouping()
    await settleMenu()
    #expect(menu.state?.canUndo == true)
    #expect(menu.perform())
    #expect(field.string.isEmpty)
    #expect(menu.state?.canRedo == true)
    #expect(menu.perform(redo: true))
    #expect(field.string == "Tour draft")

    focusedEditor = nil
    NotificationCenter.default.post(name: NSControl.textDidEndEditingNotification, object: nil)
    await settleMenu()
    #expect(menu.state == nil)
    #expect(!menu.perform())
}

@MainActor @Test func namedLibraryRedoUsesTheOfferedCommandWhenFocusChangesDuringMenuTracking() async throws {
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let id = try #require(await editing.create(name: "Commute"))
    let playlist = try #require(try await db.loadState().playlists.first { $0.id == id })
    var draft = PlaylistSettingsDraft(playlist)
    draft.name = "Commute edited"
    try #require(await draft.apply(playlistName: playlist.name, using: editing))
    await editing.reverse()
    #expect(try await db.loadState().playlists.first { $0.id == id }?.name == "Commute")

    final class Focus {
        var editor: NSTextView?
    }
    let focus = Focus()
    let textUndo = MacTextUndo(editor: { focus.editor })
    let redo = EditHistoryMenuAction(redo: true, text: textUndo.state, editing: editing)
    #expect(redo.title == "Redo Settings for Commute")
    #expect(redo.isEnabled)

    // AppKit can change its first responder during menu tracking, before the
    // observer publishes the new editor state.
    focus.editor = DraftFieldEditor()
    #expect(redo.perform(textUndo: textUndo, keyboardShortcut: true) == nil)
    #expect(try await db.loadState().playlists.first { $0.id == id }?.name == "Commute")
    let reversal = try #require(redo.perform(textUndo: textUndo, keyboardShortcut: false))
    await reversal.value
    #expect(try await db.loadState().playlists.first { $0.id == id }?.name == "Commute edited")
}

@MainActor @Test func historyMenuDisablesRedoUntilThePreviousReversalFinishes() async throws {
    let db = try await fixtureDatabase()
    weak var current: PlaylistEditingModel?
    var checked = false
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString), changed: {
        guard let current, current.history.redo != nil else { return }
        let redo = EditHistoryMenuAction(redo: true, text: nil, editing: current)
        #expect(current.busy)
        #expect(!redo.isEnabled)
        checked = true
    })
    current = editing
    try #require(await editing.setStar(["a"], starred: true))
    await editing.reverse()
    #expect(checked)
    let redo = EditHistoryMenuAction(redo: true, text: nil, editing: editing)
    #expect(redo.isEnabled)
    editing.endSession()
    #expect(!redo.isEnabled)
}
#endif
