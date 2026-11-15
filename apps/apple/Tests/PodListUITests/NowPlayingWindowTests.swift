#if os(macOS)
import Testing
import SwiftUI
import PodListData
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

@MainActor @Test func playlistToolbarKeepsOneRowAcrossSectionsAndAppearancesWithoutAScreen() throws {
    // The toolbar uses window width, independently of the detail and Inspector panes.
    for width in [CGFloat(500), 640, 760, 960, 1180] {
        for textScale in [1.0, 2.0] {
            var heights: [Int] = []
            for appearance in [ColorScheme.light, .dark] {
                for section in PlaylistTab.allCases {
                    let renderer = ImageRenderer(content: PlaylistToolbar(selection: .constant(section), busy: false, play: {})
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

#if os(macOS)
@MainActor @Test func discoveryOpensPodcastInLastLibraryOrQueuesItForReopenedLibrary() {
    let navigation = NowPlayingLibraryNavigation()
    let window = WindowModel(), presentation = PlaylistPresentation()
    var opened: [String] = []
    #expect(!navigation.perform(.podcast("https://example.com/feed")))
    navigation.attach(window: window, presentation: presentation, activate: { true }, openPodcast: { opened.append($0) })
    #expect(opened == ["https://example.com/feed"])
    #expect(navigation.perform(.podcast("https://example.com/another")))
    #expect(opened == ["https://example.com/feed", "https://example.com/another"])
    #expect(presentation.sheet == nil)
}

@MainActor @Test func discoveryDraftRestorationKeepsSearchAndSelectionWhenReopened() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "discovery", defaults: defaults)
    editor.setDraft("Podcasts", field: "addPodcasts")
    let state = editor.podcastDiscovery
    state.restoreDraft(from: editor)
    #expect(state.query == "Podcasts")
    state.query = "Current search"; state.searched = true; state.selectedFeed = "https://example.com/feed"
    state.results = try JSONDecoder().decode([DirectoryPodcast].self, from: Data(#"[{"title":"Found","feedUrl":"https://example.com/feed"}]"#.utf8))
    state.restoreDraft(from: editor)
    #expect(state === editor.podcastDiscovery)
    #expect(state.query == "Current search" && state.searched && state.selectedFeed == "https://example.com/feed")
    #expect(state.results.map(\.title) == ["Found"])
}
#endif
