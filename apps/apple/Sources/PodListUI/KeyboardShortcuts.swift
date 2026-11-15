#if os(macOS)
import SwiftUI

/// One reference for menu equivalents and Help. Control–Command keeps the usual
/// document/text shortcuts free; Download adds Shift to leave Dictionary's ⌃⌘D alone.
enum PodListShortcut: CaseIterable {
    case star, played, download, playNext, playLast, addToPlaylist
    case nowPlaying, playlistSettings, editView, previousChapter, nextChapter

    var title: String {
        switch self {
        case .star: "Star / Unstar"
        case .played: "Mark Played / Unplayed"
        case .download: "Download"
        case .playNext: "Play Next"
        case .playLast: "Play Last"
        case .addToPlaylist: "Add to a Playlist…"
        case .nowPlaying: "Now Playing"
        case .playlistSettings: "Playlist Settings…"
        case .editView: "Edit View…"
        case .previousChapter: "Previous Chapter"
        case .nextChapter: "Next Chapter"
        }
    }
    var key: KeyEquivalent {
        switch self {
        case .star: "s"
        case .played: "u"
        case .download: "d"
        case .playNext: "j"
        case .playLast: "k"
        case .addToPlaylist: "p"
        case .nowPlaying: .return
        case .playlistSettings: ","
        case .editView: "e"
        case .previousChapter: .leftArrow
        case .nextChapter: .rightArrow
        }
    }
    var modifiers: EventModifiers { self == .download ? [.control, .shift, .command] : [.control, .command] }
    var shortcut: KeyboardShortcut { KeyboardShortcut(key, modifiers: modifiers) }
    var notation: String {
        let symbol: String
        switch self {
        case .nowPlaying: symbol = "↩"
        case .previousChapter: symbol = "←"
        case .nextChapter: symbol = "→"
        default: symbol = String(key.character).uppercased()
        }
        return (self == .download ? "⌃⇧⌘" : "⌃⌘") + symbol
    }
}
#endif
