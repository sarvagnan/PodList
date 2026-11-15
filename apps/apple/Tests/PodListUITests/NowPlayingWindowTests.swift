#if os(macOS)
import Testing
import SwiftUI
@testable import PodListUI

@MainActor @Test func nowPlayingActionsUseTheLastLibraryAndKeepItsSheetOnLibrary() {
    let navigation = NowPlayingLibraryNavigation()
    let first = WindowModel(), second = WindowModel()
    let firstPresentation = PlaylistPresentation(), secondPresentation = PlaylistPresentation()
    var activations = 0
    navigation.attach(window: first, presentation: firstPresentation, activate: { true })
    navigation.attach(window: second, presentation: secondPresentation, activate: { activations += 1; return true })
    #expect(navigation.perform(.playlist("commute")))
    #expect(second.destination == .playlist("commute"))
    #expect(first.destination == .subscriptions)
    #expect(navigation.perform(.add(["episode"], preferNew: true)))
    guard case let .add(ids, preferNew) = secondPresentation.sheet else {
        Issue.record("The chooser must be presented by the Library window")
        return
    }
    #expect(ids == ["episode"] && preferNew)
    #expect(firstPresentation.sheet == nil)
    #expect(activations == 2)
}

@MainActor @Test func nowPlayingActionsReopenLibraryAndConsumeTheRequestOnce() {
    let navigation = NowPlayingLibraryNavigation()
    let closed = WindowModel(), closedPresentation = PlaylistPresentation()
    navigation.attach(window: closed, presentation: closedPresentation, activate: { false })
    #expect(!navigation.perform(.add(["episode"], preferNew: false)))
    #expect(closedPresentation.sheet == nil)
    let reopened = WindowModel(), presentation = PlaylistPresentation()
    navigation.attach(window: reopened, presentation: presentation, activate: { true })
    guard case let .add(ids, preferNew) = presentation.sheet else {
        Issue.record("Reopening Library must preserve the requested Episodes")
        return
    }
    #expect(ids == ["episode"] && !preferNew)
    presentation.sheet = nil
    navigation.attach(window: reopened, presentation: presentation, activate: { true })
    #expect(presentation.sheet == nil)
}

@MainActor @Test func playlistHeaderKeepsOneRowAcrossSectionsAndAppearancesWithoutAScreen() throws {
    // 318: 760 pt window minus the 180 pt sidebar, 260 pt Inspector and dividers.
    // 418/578 cover 960 pt with both panes and 760 pt with the Inspector hidden.
    for width in [CGFloat(318), 418, 478, 578, 640, 678, 900] {
        for textScale in [1.0, 2.0] {
            var heights: [Int] = []
            for appearance in [ColorScheme.light, .dark] {
                for section in PlaylistTab.allCases {
                    let renderer = ImageRenderer(content: PlaylistHeader(selection: .constant(section), busy: false, play: {})
                        .macContentFont(.body)
                        .environment(\.macTextScale, textScale)
                        .environment(\.colorScheme, appearance)
                        .frame(width: width))
                    let image = try #require(renderer.cgImage)
                    #expect(image.width == Int(width))
                    #expect(image.height > 0 && image.height < 80)
                    heights.append(image.height)
                }
            }
            #expect(Set(heights).count == 1)
        }
    }
}
#endif
