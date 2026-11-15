#if os(macOS)
import SwiftUI
import AppKit

private struct SeekKey: FocusedValueKey { typealias Value = () -> Void }
extension FocusedValues {
    var podListSeek: (() -> Void)? {
        get { self[SeekKey.self] }
        set { self[SeekKey.self] = newValue }
    }
}

/// The transport command has no selection context: it always controls the
/// current Episode, or starts the Active Playlist when nothing is loaded.
@MainActor struct PlaybackToggleCommand {
    let controller: PlaybackController?
    let library: LibraryModel?
    var title: String { controller?.wantsPlayback == true ? "Pause" : "Play" }
    var isEnabled: Bool {
        guard controller != nil, let library else { return false }
        return controller?.hasDisplay == true || library.state.playlists.contains {
            $0.id == library.state.activePlaylistId && !$0.entries.isEmpty
        }
    }
    func perform() { if isEnabled { controller?.toggle() } }
}

public struct PlaybackCommands: Commands {
    @Bindable var app: ApplicationModel
    @FocusedValue(\.podListSeek) private var seek
    @FocusedValue(\.podListNowPlaying) private var nowPlaying
    @FocusedValue(\.podListOpenPlaylist) private var openPlaylist
    public init(app: ApplicationModel) { self.app = app }
    private var toggle: PlaybackToggleCommand { .init(controller: app.playback, library: app.library) }
    public var body: some Commands {
        CommandMenu("Controls") {
            Button(toggle.title, action: toggle.perform)
                .keyboardShortcut(.space, modifiers: [])
                .disabled(!toggle.isEnabled)
            Button("Resume Playback") { app.playback?.play() }.disabled(app.playback?.display == nil || app.playback?.wantsPlayback == true)
            Button("Pause Playback") { app.playback?.pause() }.disabled(app.playback?.wantsPlayback != true)
            Button("Go to Time…") { seek?() }.disabled(seek == nil)
            Button("Back 15 Seconds") { app.playback?.skip(-15) }.keyboardShortcut(.leftArrow, modifiers: .command).disabled(app.playback?.display == nil)
            Button("Forward 30 Seconds") { app.playback?.skip(30) }.keyboardShortcut(.rightArrow, modifiers: .command).disabled(app.playback?.display == nil)
            Button("Stop") { if !PlaybackKeyboardGuard.sheetIsKey { app.playback?.stop() } }
                .keyboardShortcut(".", modifiers: .command).disabled(app.playback?.display == nil || PlaybackKeyboardGuard.sheetIsKey)
            Divider()
            SpeedMenu(controller: app.playback, menuBar: true).disabled(app.playback?.display == nil)
            SleepMenu(controller: app.playback, menuBar: true).disabled(app.playback?.display == nil)
            Button("Previous Chapter") { app.playback?.chapter(-1) }
                .keyboardShortcut(PodListShortcut.previousChapter.shortcut).disabled(app.playback?.display?.chapters.isEmpty != false)
            Button("Next Chapter") { app.playback?.chapter(1) }
                .keyboardShortcut(PodListShortcut.nextChapter.shortcut).disabled(app.playback?.display?.chapters.isEmpty != false)
            Button("Now Playing") { nowPlaying?() }.keyboardShortcut(PodListShortcut.nowPlaying.shortcut)
                .disabled(app.playback?.display == nil || nowPlaying == nil)
            Button("Open Active Playlist") { openPlaylist?() }.disabled(openPlaylist == nil)
            MenuActionItems(menu: .controls)
            Menu("Go to Chapter") {
                ForEach(Array((app.playback?.display?.chapters ?? []).enumerated()), id: \.offset) { index, chapter in
                    Button(chapter.title.isEmpty ? "Chapter \(index + 1)" : chapter.title) { app.playback?.seek(chapter.start) }
                }
            }.disabled(app.playback?.display?.chapters.isEmpty != false)
        }
    }
}

/// Intercept text navigation before menu equivalents and let AppKit interpret it,
/// including the user's key bindings. Return stays with text editing and sheet
/// default actions instead of reaching Episode > Play Now. Command-period in a
/// sheet follows Escape's cancel action, including its disabled state during a save.
@MainActor public final class PlaybackKeyboardGuard {
    private var monitor: Any?
    static var sheetIsKey: Bool {
        guard let window = NSApp.keyWindow else { return false }
        return window.sheetParent != nil || window.attachedSheet != nil
    }
    enum Route: Equatable { case text, sheetDefault, cancelSheet, menu }
    static func route(characters: String?, modifiers: NSEvent.ModifierFlags, editable: Bool, sheet: Bool) -> Route {
        let modifiers = modifiers.intersection([.command, .control, .option, .shift])
        if sheet && characters == "." && modifiers == .command { return .cancelSheet }
        if characters == "\r" && modifiers.isEmpty {
            if sheet { return .sheetDefault }
            if editable { return .text }
        }
        guard editable else { return .menu }
        if characters == " " && modifiers.subtracting(.shift).isEmpty { return .text }
        if [String(UnicodeScalar(NSLeftArrowFunctionKey)!), String(UnicodeScalar(NSRightArrowFunctionKey)!)].contains(characters ?? ""),
           modifiers.contains(.command), modifiers.isDisjoint(with: [.control, .option]) { return .text }
        return .menu
    }
    public init() {
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            let text = NSApp.keyWindow?.firstResponder as? NSTextView
            switch Self.route(characters: event.charactersIgnoringModifiers, modifiers: event.modifierFlags,
                              editable: text?.isEditable == true, sheet: Self.sheetIsKey) {
            case .text:
                text?.interpretKeyEvents([event])
                return nil
            case .sheetDefault:
                // Dispatch inside the sheet, bypassing application menu equivalents.
                // AppKit retains default-button validation and field-editor submission.
                if let window = NSApp.keyWindow?.attachedSheet ?? NSApp.keyWindow {
                    if !window.performKeyEquivalent(with: event) { window.sendEvent(event) }
                }
                return nil
            case .cancelSheet:
                guard let window = NSApp.keyWindow?.attachedSheet ?? NSApp.keyWindow,
                      let escape = NSEvent.keyEvent(with: .keyDown, location: event.locationInWindow, modifierFlags: [],
                          timestamp: event.timestamp, windowNumber: window.windowNumber, context: nil,
                          characters: "\u{1b}", charactersIgnoringModifiers: "\u{1b}", isARepeat: event.isARepeat, keyCode: 53) else { return nil }
                if !window.performKeyEquivalent(with: escape) { window.sendEvent(escape) }
                return nil
            case .menu: return event
            }
        }
    }
}
#endif
