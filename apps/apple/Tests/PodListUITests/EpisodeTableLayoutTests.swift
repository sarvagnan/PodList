#if os(macOS)
import Foundation
import Testing
@testable import PodListUI

@Test(arguments: [CGFloat(267), 399, 400, 479, 480, 639, 640, 687])
func episodeTablesReserveTitleAndVisibleMetadataSpace(width: CGFloat) {
    let layout = EpisodeTableLayout(width: width)
    let columns = 1 + (layout.showsDateOrPosition ? 1 : 0) + (layout.showsLength ? 1 : 0) + (layout.showsState ? 1 : 0)
    let metadata: CGFloat = (layout.showsDateOrPosition ? 95 : 0) + (layout.showsLength ? 60 : 0) + (layout.showsState ? 140 : 0)
    // The same conservative budget covers Episodes, Podcast Episodes and Entries
    // (whose Position column needs less space than Published).
    #expect(EpisodeTableLayout.minimumTitleWidth + metadata + CGFloat(columns * 17 + 34) <= width)
    #expect(!layout.showsLength || layout.showsDateOrPosition)
    #expect(!layout.showsState || layout.showsLength)
    if width == 267 {
        #expect(!layout.showsDateOrPosition && !layout.showsLength && !layout.showsState)
    }
    if width == 687 {
        #expect(layout.showsDateOrPosition && layout.showsLength && layout.showsState)
    }
}
#endif
