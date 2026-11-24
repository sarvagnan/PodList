#if os(macOS)
import SwiftUI

/// Reserve readable title/action space before adding metadata columns. Allow for
/// AppKit's inset table margins, inter-column spacing and a vertical scroller.
struct EpisodeTableLayout {
    struct ColumnWidth {
        let minimum: CGFloat
        let ideal: CGFloat
        let maximum: CGFloat

        fileprivate func allowingExtraWidth(_ extra: CGFloat) -> Self {
            Self(minimum: minimum, ideal: ideal, maximum: min(maximum, ideal + max(0, extra)))
        }
    }

    static let minimumTitleWidth: CGFloat = 200
    static let published = ColumnWidth(minimum: 95, ideal: 110, maximum: 150)
    static let position = ColumnWidth(minimum: 70, ideal: 90, maximum: 110)
    static let length = ColumnWidth(minimum: 60, ideal: 70, maximum: 100)
    static let state = ColumnWidth(minimum: 140, ideal: 150, maximum: 200)
    static let podcastState = ColumnWidth(minimum: 120, ideal: 150, maximum: 200)

    let width: CGFloat

    init(width: CGFloat) { self.width = Self.viewportDimension(width) }

    static func viewportDimension(_ measurement: CGFloat) -> CGFloat {
        measurement.isFinite && measurement > 0 ? measurement : 0
    }

    static func viewportSize(_ measurement: CGSize) -> CGSize {
        CGSize(width: viewportDimension(measurement.width), height: viewportDimension(measurement.height))
    }

    var showsDateOrPosition: Bool { width >= 400 }
    var showsLength: Bool { width >= 480 }
    var showsState: Bool { width >= 640 }

    /// A native Table can carry resized columns across pane changes. Cap
    /// their combined widths to the current viewport, including its insets.
    var libraryPublished: ColumnWidth { Self.published.allowingExtraWidth(libraryMetadataResizeRoom) }
    var libraryLength: ColumnWidth { Self.length.allowingExtraWidth(libraryMetadataResizeRoom) }
    var libraryState: ColumnWidth { Self.state.allowingExtraWidth(libraryMetadataResizeRoom) }
    var libraryTitle: ColumnWidth {
        let fitted = titleWidth(dateOrPosition: libraryPublished.maximum, length: libraryLength.maximum, state: libraryState.maximum)
        return ColumnWidth(minimum: Self.minimumTitleWidth, ideal: fitted, maximum: fitted)
    }

    var playlistTitle: ColumnWidth { flexibleTitle(dateOrPosition: Self.position) }
    var podcastTitle: ColumnWidth { flexibleTitle(dateOrPosition: Self.published) }

    private func flexibleTitle(dateOrPosition: ColumnWidth) -> ColumnWidth {
        let ideal = titleWidth(dateOrPosition: dateOrPosition.ideal, length: Self.length.ideal, state: Self.state.ideal)
        return ColumnWidth(minimum: Self.minimumTitleWidth, ideal: ideal, maximum: max(ideal, width))
    }

    // Keep most additional room in the Episode title as the viewport grows.
    private var libraryMetadataResizeRoom: CGFloat { (podcastTitle.ideal - Self.minimumTitleWidth) / 8 }
    private var tableChrome: CGFloat {
        let count: CGFloat = 1 + (showsDateOrPosition ? 1 : 0) + (showsLength ? 1 : 0) + (showsState ? 1 : 0)
        return 17 * count + 36
    }

    private func titleWidth(dateOrPosition: CGFloat, length: CGFloat, state: CGFloat) -> CGFloat {
        let metadata = (showsDateOrPosition ? dateOrPosition : 0)
            + (showsLength ? length : 0) + (showsState ? state : 0)
        return max(Self.minimumTitleWidth, width - metadata - tableChrome)
    }

    func playbackMark(for stateText: String) -> EpisodePlaybackMark? {
        showsState ? nil : EpisodePlaybackMark(stateText: stateText)
    }
}

extension TableColumn {
    func width(_ limits: EpisodeTableLayout.ColumnWidth) -> Self {
        width(min: limits.minimum, ideal: limits.ideal, max: limits.maximum)
    }
}

/// Wait for a usable measurement before mounting the native table.
struct EpisodeTableViewport<Content: SwiftUI.View>: SwiftUI.View {
    @ViewBuilder let content: (EpisodeTableLayout) -> Content

    var body: some SwiftUI.View {
        GeometryReader { geometry in
            let layout = EpisodeTableLayout(width: geometry.size.width)
            if layout.width > 0 { content(layout) }
        }
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
