#if os(macOS)
import SwiftUI
import AppKit

public struct PlaybackCommands: Commands {
    @Bindable var app: ApplicationModel
    @FocusedValue(\.podListNowPlaying) private var nowPlaying
    @FocusedValue(\.podListOpenPlaylist) private var openPlaylist
    public init(app: ApplicationModel) { self.app = app }
    public var body: some Commands {
        CommandMenu("Controls") {
            Button(app.playback?.wantsPlayback == true ? "Pause" : "Play") { app.playback?.toggle() }
                .keyboardShortcut(.space, modifiers: []).disabled(app.library == nil)
            Button("Back 15 Seconds") { app.playback?.skip(-15) }.keyboardShortcut(.leftArrow, modifiers: .command)
            Button("Forward 30 Seconds") { app.playback?.skip(30) }.keyboardShortcut(.rightArrow, modifiers: .command)
            Button("Stop") { app.playback?.stop() }.keyboardShortcut(".", modifiers: .command)
            Divider()
            if let controller = app.playback {
                SpeedMenu(controller: controller)
                SleepMenu(controller: controller)
                Button("Previous Chapter") { controller.chapter(-1) }.disabled(controller.display?.chapters.isEmpty != false)
                Button("Next Chapter") { controller.chapter(1) }.disabled(controller.display?.chapters.isEmpty != false)
                Button("Now Playing") { nowPlaying?() }.disabled(controller.display == nil || nowPlaying == nil)
            }
            Button("Open Active Playlist") { openPlaylist?() }.disabled(openPlaylist == nil)
        }
    }
}

/// Plain Space in an editable AppKit text responder is text. Intercept it before menu key
/// equivalents, which otherwise steal it from Search, the server address and numeric inputs.
@MainActor public final class PlaybackKeyboardGuard {
    private var monitor: Any?
    public init() {
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            guard event.charactersIgnoringModifiers == " ", event.modifierFlags.intersection([.command, .control, .option]).isEmpty,
                  let text = NSApp.keyWindow?.firstResponder as? NSTextView, text.isEditable else { return event }
            text.insertText(" ", replacementRange: text.selectedRange())
            return nil
        }
    }
}
#endif
