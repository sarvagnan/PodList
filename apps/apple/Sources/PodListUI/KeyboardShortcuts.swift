#if os(macOS)
import SwiftUI

/// One reference for menu equivalents, tooltips and Help. Custom bindings leave
/// Apple's standard equivalents (support.apple.com/en-us/102650) and PodList's
/// existing commands free. Related queue/chapter commands share a key family.
enum PodListShortcut: CaseIterable {
    case playNow, star, played, download, playNext, playLast, addToPlaylist
    case nowPlaying, playlistSettings, editView, previousChapter, nextChapter
    case refreshAllFeeds

    var title: String {
        switch self {
        case .playNow: "Play Now"
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
        case .refreshAllFeeds: "Refresh All Feeds"
        }
    }
    var key: KeyEquivalent? {
        switch self {
        case .playNow: .return
        case .star: "l"
        case .played: "e"
        case .download: nil
        case .playNext: "j"
        case .playLast: "j"
        case .addToPlaylist: "a"
        case .nowPlaying: "l"
        case .playlistSettings: ","
        case .editView: "e"
        case .previousChapter: .leftArrow
        case .nextChapter: .rightArrow
        case .refreshAllFeeds: "r"
        }
    }
    var modifiers: EventModifiers {
        switch self {
        case .playNow: []
        case .nowPlaying, .download, .refreshAllFeeds: .command
        case .star, .played, .playNext: [.shift, .command]
        case .playLast, .addToPlaylist, .playlistSettings, .editView, .previousChapter, .nextChapter: [.option, .command]
        }
    }
    // D is reserved with Command, Shift–Command and Option–Command. Keep
    // Download in the command index without inventing an unrelated letter.
    var shortcut: KeyboardShortcut? { key.map { KeyboardShortcut($0, modifiers: modifiers) } }
    var notation: String {
        guard let key else { return "—" }
        let symbol: String
        switch self {
        case .playNow: symbol = "↩"
        case .previousChapter: symbol = "←"
        case .nextChapter: symbol = "→"
        default: symbol = String(key.character).uppercased()
        }
        let prefix = (modifiers.contains(.option) ? "⌥" : "") + (modifiers.contains(.shift) ? "⇧" : "") + (modifiers.contains(.command) ? "⌘" : "")
        return prefix + symbol
    }
}
#endif
