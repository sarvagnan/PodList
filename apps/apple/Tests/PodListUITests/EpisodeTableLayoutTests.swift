#if os(macOS)
import Foundation
import Testing
@testable import PodListUI

@Test(arguments: [CGFloat(267), 399, 400, 479, 480, 639, 640, 687])
func episodeTablesReserveTitleAndVisibleMetadataSpace(width: CGFloat) {
    let layout = EpisodeTableLayout(width: width)
    let columns = 1 + (layout.showsDateOrPosition ? 1 : 0) + (layout.showsLength ? 1 : 0) + (layout.showsState ? 1 : 0)
    let metadata = (layout.showsDateOrPosition ? EpisodeTableLayout.published.minimum : 0)
        + (layout.showsLength ? EpisodeTableLayout.length.minimum : 0)
        + (layout.showsState ? EpisodeTableLayout.state.minimum : 0)
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
    let maxima = [layout.libraryTitle.maximum]
        + (layout.showsDateOrPosition ? [layout.libraryPublished.maximum] : [])
        + (layout.showsLength ? [layout.libraryLength.maximum] : [])
        + (layout.showsState ? [layout.libraryState.maximum] : [])
    let tableChrome = CGFloat(17 * maxima.count + 36)
    #expect(maxima.reduce(0, +) + tableChrome <= width + 0.001)
}

@Test(arguments: [
    CGFloat(0), 1, -1, 267, 490, 760, 50_000, .greatestFiniteMagnitude, .infinity, -.infinity, .nan
])
func episodeColumnWidthsAreFiniteAndOrderedForTransitionalViewports(width: CGFloat) {
    let layout = EpisodeTableLayout(width: width)
    let columns = [
        layout.libraryTitle, layout.libraryPublished, layout.libraryLength, layout.libraryState,
        layout.playlistTitle, EpisodeTableLayout.position, EpisodeTableLayout.length, EpisodeTableLayout.state,
        layout.podcastTitle, EpisodeTableLayout.published, EpisodeTableLayout.length, EpisodeTableLayout.podcastState,
    ]
    for column in columns {
        #expect(column.minimum.isFinite && column.ideal.isFinite && column.maximum.isFinite)
        #expect(column.minimum > 0 && column.minimum <= column.ideal && column.ideal <= column.maximum)
    }
    #expect(layout.width.isFinite && layout.width >= 0)
    if width.isFinite && width > 0 {
        #expect(layout.width == width)
    } else {
        #expect(layout.width == 0)
        #expect(!layout.showsDateOrPosition && !layout.showsLength && !layout.showsState)
    }
    #expect(EpisodeTableLayout.viewportSize(CGSize(width: width, height: width))
        == CGSize(width: layout.width, height: layout.width))
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
