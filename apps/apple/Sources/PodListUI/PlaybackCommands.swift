#if os(macOS)
import SwiftUI
import AppKit

private struct PlaySelectionKey: FocusedValueKey { typealias Value = () -> Void }
extension FocusedValues {
    var podListPlaySelection: (() -> Void)? {
        get { self[PlaySelectionKey.self] }
        set { self[PlaySelectionKey.self] = newValue }
    }
}

public struct PlaybackCommands: Commands {
    @Bindable var app: ApplicationModel
    @FocusedValue(\.podListPlaySelection) private var playSelection
    @FocusedValue(\.podListEpisodes) private var context
    @FocusedValue(\.podListNowPlaying) private var nowPlaying
    @FocusedValue(\.podListOpenPlaylist) private var openPlaylist
    public init(app: ApplicationModel) { self.app = app }
    public var body: some Commands {
        CommandMenu("Controls") {
            Button(playSelection != nil || context?.ids.isEmpty == false ? "Play Selected Episode" : app.playback?.wantsPlayback == true ? "Pause" : "Play") {
                if let playSelection { playSelection() }
                else if let context, !context.ids.isEmpty { Task { await context.playSelection() } }
                else { app.playback?.toggle() }
            }
                .keyboardShortcut(.space, modifiers: [])
                .disabled(app.library == nil || (playSelection == nil && context?.ids.isEmpty != false && app.playback?.display == nil))
            Button("Back 15 Seconds") { app.playback?.skip(-15) }.keyboardShortcut(.leftArrow, modifiers: .command).disabled(app.playback?.display == nil)
            Button("Forward 30 Seconds") { app.playback?.skip(30) }.keyboardShortcut(.rightArrow, modifiers: .command).disabled(app.playback?.display == nil)
            Button("Stop") { if !PlaybackKeyboardGuard.sheetIsKey { app.playback?.stop() } }
                .keyboardShortcut(".", modifiers: .command).disabled(app.playback?.display == nil || PlaybackKeyboardGuard.sheetIsKey)
            Divider()
            SpeedMenu(controller: app.playback).disabled(app.playback?.display == nil)
            SleepMenu(controller: app.playback).disabled(app.playback?.display == nil)
            Button("Previous Chapter") { app.playback?.chapter(-1) }
                .keyboardShortcut(PodListShortcut.previousChapter.shortcut).disabled(app.playback?.display?.chapters.isEmpty != false)
            Button("Next Chapter") { app.playback?.chapter(1) }
                .keyboardShortcut(PodListShortcut.nextChapter.shortcut).disabled(app.playback?.display?.chapters.isEmpty != false)
            Button("Now Playing") { nowPlaying?() }.keyboardShortcut(PodListShortcut.nowPlaying.shortcut)
                .disabled(app.playback?.display == nil || nowPlaying == nil)
            Button("Open Active Playlist") { openPlaylist?() }.disabled(openPlaylist == nil)
        }
    }
}

/// Intercept text navigation before menu equivalents and let AppKit interpret it,
/// including the user's key bindings. Command-period in a sheet follows Escape's
/// existing cancel action, including its disabled state during a pending save.
@MainActor public final class PlaybackKeyboardGuard {
    private var monitor: Any?
    static var sheetIsKey: Bool {
        guard let window = NSApp.keyWindow else { return false }
        return window.sheetParent != nil || window.attachedSheet != nil
    }
    enum Route: Equatable { case text, cancelSheet, menu }
    static func route(characters: String?, modifiers: NSEvent.ModifierFlags, editable: Bool, sheet: Bool) -> Route {
        let modifiers = modifiers.intersection([.command, .control, .option, .shift])
        if sheet && characters == "." && modifiers == .command { return .cancelSheet }
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
