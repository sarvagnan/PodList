#if os(macOS)
import AppKit
import Observation

/// The AppKit field editor and its UndoManager change independently of SwiftUI's
/// focused values. Refresh the menu when editing or the undo group changes.
@MainActor @Observable
final class MacTextUndo {
    struct State: Equatable {
        let undoTitle: String
        let redoTitle: String
        let canUndo: Bool
        let canRedo: Bool
    }

    private(set) var state: State?
    @ObservationIgnored private let editor: @MainActor () -> NSTextView?
    @ObservationIgnored private var observers: [NSObjectProtocol] = []
    @ObservationIgnored private var refreshScheduled = false

    init(editor: @escaping @MainActor () -> NSTextView? = MacTextUndo.focusedEditor) {
        self.editor = editor
        let changes: [Notification.Name] = [
            NSWindow.didBecomeKeyNotification, NSWindow.didResignKeyNotification, NSWindow.didEndSheetNotification,
            NSControl.textDidBeginEditingNotification, NSControl.textDidChangeNotification, NSControl.textDidEndEditingNotification,
            NSText.didBeginEditingNotification, NSText.didChangeNotification, NSText.didEndEditingNotification,
            .NSUndoManagerDidCloseUndoGroup, .NSUndoManagerDidUndoChange, .NSUndoManagerDidRedoChange
        ]
        for name in changes {
            observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.scheduleRefresh() }
            })
        }
        refresh()
    }

    @discardableResult
    func perform(redo: Bool = false) -> Bool {
        guard let editor = editor(), editor.isEditable else { return false }
        if let manager = editor.undoManager {
            if redo, manager.canRedo { manager.redo() }
            if !redo, manager.canUndo { manager.undo() }
        }
        refresh()
        // A focused editor owns the command even if there is no text edit to reverse.
        return true
    }

    private func scheduleRefresh() {
        guard !refreshScheduled else { return }
        refreshScheduled = true
        // NSTextView can post its change notification before the undo group closes.
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.refreshScheduled = false
            self.refresh()
        }
    }

    private func refresh() {
        let next: State?
        if let editor = editor(), editor.isEditable {
            let manager = editor.undoManager
            next = State(undoTitle: manager?.undoMenuItemTitle ?? "Undo",
                         redoTitle: manager?.redoMenuItemTitle ?? "Redo",
                         canUndo: manager?.canUndo == true, canRedo: manager?.canRedo == true)
        } else { next = nil }
        if state != next { state = next }
    }

    static func focusedEditor() -> NSTextView? {
        guard let keyWindow = NSApp?.keyWindow ?? NSApp?.mainWindow else { return nil }
        let responder = (keyWindow.attachedSheet ?? keyWindow).firstResponder
        if let textView = responder as? NSTextView, textView.isEditable,
           (textView.delegate as? NSControl)?.isEnabled != false { return textView }
        if let field = responder as? NSTextField, field.isEditable, field.isEnabled {
            return field.currentEditor() as? NSTextView
        }
        return nil
    }

    isolated deinit {
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
    }
}

/// A menu item dispatches the action it advertised. A Command-Z shortcut
/// still follows the live text responder, including a just-focused editor.
@MainActor
struct EditHistoryMenuAction {
    let redo: Bool
    let text: MacTextUndo.State?
    let editing: PlaylistEditingModel?

    var title: String {
        if redo { return text?.redoTitle ?? editing?.redoTitle ?? "Redo" }
        return text?.undoTitle ?? editing?.undoTitle ?? "Undo"
    }

    var isEnabled: Bool {
        if let text { return redo ? text.canRedo : text.canUndo }
        return editing?.canReverse(redo: redo) == true
    }

    @discardableResult
    func perform(textUndo: MacTextUndo, keyboardShortcut: Bool, editor: LibraryEditingModel? = nil,
                 context: EditHistoryCommandContext? = nil) -> Task<Void, Never>? {
        if keyboardShortcut {
            if textUndo.perform(redo: redo) { return nil }
        } else if text != nil {
            textUndo.perform(redo: redo)
            return nil
        }
        guard let editing, editing.canReverse(redo: redo) else { return nil }
        if let editor, editor.edits === editing {
            let restored = context?.restoredEntriesHandler(editor)
            return Task { await editor.reverse(redo: redo, restored: restored) }
        }
        return Task { await editing.reverse(redo: redo) }
    }

    static var isKeyboardShortcut: Bool {
        guard let event = NSApp?.currentEvent, event.type == .keyDown, event.modifierFlags.contains(.command) else { return false }
        return event.charactersIgnoringModifiers?.lowercased() == "z"
    }
}
#endif
