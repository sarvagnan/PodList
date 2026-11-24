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

@Test(arguments: [CGFloat(267), 400, 480, 490, 639, 640, 687, 900])
func resizedLibraryColumnsFitTheirCurrentViewport(width: CGFloat) {
    let layout = EpisodeTableLayout(width: width)
    let maxima = [layout.libraryTitleMaximum]
        + (layout.showsDateOrPosition ? [layout.libraryPublishedMaximum] : [])
        + (layout.showsLength ? [layout.libraryLengthMaximum] : [])
        + (layout.showsState ? [layout.libraryStateMaximum] : [])
    let tableChrome = CGFloat(17 * maxima.count + 36)
    #expect(maxima.reduce(0, +) + tableChrome <= width + 0.001)
}

@Test func compactEpisodeStateMarksReplaceTheHiddenStateColumn() {
    let compact = EpisodeTableLayout(width: 639)
    let regular = EpisodeTableLayout(width: 640)
    #expect(compact.playbackMark(for: "Played") == .played)
    #expect(compact.playbackMark(for: "Played · Starred") == .played)
    #expect(compact.playbackMark(for: "In progress · Starred") == .inProgress)
    #expect(compact.playbackMark(for: "Unplayed · Starred") == nil)
    #expect(regular.playbackMark(for: "Played") == nil)
    #expect(regular.playbackMark(for: "In progress") == nil)
    #expect(EpisodePlaybackMark.played.symbol != EpisodePlaybackMark.inProgress.symbol)
}
#endif
