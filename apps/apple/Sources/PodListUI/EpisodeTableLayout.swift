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
}
#endif
