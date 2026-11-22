#if os(macOS)
import Foundation

/// Reserve readable title/action space before adding metadata columns. Allow for
/// AppKit's inset table margins, inter-column spacing and a vertical scroller.
struct EpisodeTableLayout {
    static let minimumTitleWidth: CGFloat = 200
    let width: CGFloat
    var showsDateOrPosition: Bool { width >= 400 }
    var showsLength: Bool { width >= 480 }
    var showsState: Bool { width >= 640 }
    func playbackMark(for stateText: String) -> EpisodePlaybackMark? {
        showsState ? nil : EpisodePlaybackMark(stateText: stateText)
    }
}

enum EpisodePlaybackMark: String {
    case played = "Played"
    case inProgress = "In progress"

    var symbol: String {
        switch self {
        case .played: "checkmark.circle.fill"
        case .inProgress: "circle.lefthalf.filled"
        }
    }

    init?(stateText: String) {
        let playbackState = stateText.prefix { $0 != "·" }.trimmingCharacters(in: .whitespaces)
        self.init(rawValue: playbackState)
    }
}
#endif
