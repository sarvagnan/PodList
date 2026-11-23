#if os(macOS)
import Foundation

/// Reserve readable title/action space before adding metadata columns. Allow for
/// AppKit's inset table margins, inter-column spacing and a vertical scroller.
struct EpisodeTableLayout {
    static let minimumTitleWidth: CGFloat = 200
    static let podcastPublishedWidth: CGFloat = 110
    static let podcastLengthWidth: CGFloat = 70
    static let podcastStateWidth: CGFloat = 150
    let width: CGFloat
    var showsDateOrPosition: Bool { width >= 400 }
    var showsLength: Bool { width >= 480 }
    var showsState: Bool { width >= 640 }
    var podcastTitleWidth: CGFloat {
        let metadataWidth = (showsDateOrPosition ? Self.podcastPublishedWidth : 0)
            + (showsLength ? Self.podcastLengthWidth : 0) + (showsState ? Self.podcastStateWidth : 0)
        // Leave room for the inset, column spacing and scroller in either description state.
        return max(Self.minimumTitleWidth, width - metadataWidth - 60)
    }
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
