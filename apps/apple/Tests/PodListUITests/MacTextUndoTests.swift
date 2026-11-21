#if os(macOS)
import AppKit
import Testing
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
#endif
