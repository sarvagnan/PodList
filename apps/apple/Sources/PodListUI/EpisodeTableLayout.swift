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
    /// A native Table can carry resized columns across pane changes. Cap
    /// their combined widths to the current viewport, including its insets.
    var libraryPublishedMaximum: CGFloat { min(150, Self.podcastPublishedWidth + libraryMetadataResizeRoom) }
    var libraryLengthMaximum: CGFloat { min(100, Self.podcastLengthWidth + libraryMetadataResizeRoom) }
    var libraryStateMaximum: CGFloat { min(200, Self.podcastStateWidth + libraryMetadataResizeRoom) }
    var libraryTitleMaximum: CGFloat {
        let metadata = (showsDateOrPosition ? libraryPublishedMaximum : 0)
            + (showsLength ? libraryLengthMaximum : 0) + (showsState ? libraryStateMaximum : 0)
        return max(Self.minimumTitleWidth, width - metadata - tableChrome)
    }

    // Keep most additional room in the Episode title as the viewport grows.
    private var libraryMetadataResizeRoom: CGFloat { (podcastTitleWidth - Self.minimumTitleWidth) / 8 }
    private var tableChrome: CGFloat {
        let count: CGFloat = 1 + (showsDateOrPosition ? 1 : 0) + (showsLength ? 1 : 0) + (showsState ? 1 : 0)
        return 17 * count + 2 * 10 + 16
    }

    var podcastTitleWidth: CGFloat {
        let metadataWidth = (showsDateOrPosition ? Self.podcastPublishedWidth : 0)
            + (showsLength ? Self.podcastLengthWidth : 0) + (showsState ? Self.podcastStateWidth : 0)
        return max(Self.minimumTitleWidth, width - metadataWidth - tableChrome)
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
