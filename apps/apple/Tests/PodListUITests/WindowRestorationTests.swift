import Foundation
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

private func restorationLibrary(ready: Bool = true) -> LibraryModel {
    var state = fixtureState()
    state.playlists[0].history = [.init(episodeId: "past", finishedAt: 900)]
    state.playlists[0].timeline = [.init(at: 800, episodeId: "a", position: 30)]
    return LibraryModel(snapshot: .init(state: state, subscriptions: [subscription(), subscription("removed", removed: true)],
                                       episodes: [episode(), episode("b", title: "Beta")], isReady: ready), deviceID: "this", now: 1_000)
}

@Test func windowContextRoundTripsEveryDestinationSectionAndColumnMode() throws {
    let destinations: [Destination?] = [.playlist("default"), .view("all"), .views, .subscriptions,
                                       .subscription("s"), .search, .trash, nil]
    for destination in destinations {
        for tab in PlaylistTab.allCases {
            for columns in [WindowContext.Columns.automatic, .all, .doubleColumn, .detailOnly] {
                let value = WindowContext(libraryID: "https://example.com", destination: destination, search: "science café",
                                          selection: ["a", "b"], sort: [.init(column: .length, reversed: true), .init(column: .title)],
                                          playlistTab: tab, timelineSelection: "listened/a/800", columns: columns,
                                          inspectorVisible: false,
                                          podcastFeed: "https://example.com/feed", subscriptionSelection: ["s"])
                let data = try #require(value.encoded)
                #expect(WindowContext.decode(data) == value)
                #expect(!data.contains(10)) // Compact JSON, without pretty-print whitespace.
            }
        }
    }
}

@Test func narrowLibraryPanesKeepTheLastExplicitlyOpenedPane() {
    let narrow = LibraryPanes.threePaneWidth - 1
    let wide = LibraryPanes.threePaneWidth
    let sidebar = LibraryPanes(sidebar: true, inspector: false)
    let inspector = LibraryPanes(sidebar: false, inspector: true)
    let both = LibraryPanes(sidebar: true, inspector: true)
    let list = LibraryPanes(sidebar: false, inspector: false)

    #expect(sidebar.applying(.inspector(true), width: narrow) == inspector)
    #expect(inspector.applying(.sidebar(true), width: narrow) == sidebar)
    #expect(inspector.applying(.inspector(false), width: narrow) == list)
    #expect(inspector.applying(.layoutChanged, width: wide) == inspector)
    #expect(list.applying(.layoutChanged, width: wide) == list)
    #expect(inspector.applying(.sidebar(true), width: wide) == both)
    #expect(sidebar.applying(.inspector(true), width: wide) == both)
    #expect(both.applying(.layoutChanged, width: narrow) == inspector)
    #expect(both.applying(.layoutChanged, width: wide) == both)
}

@Test func inspectorUsesTheCurrentWidthAfterReopeningTheSidebar() {
    let narrow = 760.0
    let expanded = narrow + PaneWidths.sidebarIdeal
    let inspector = LibraryPanes(sidebar: false, inspector: true)
    let list = inspector.applying(.inspector(false), width: narrow)
    let sidebar = list.applying(.sidebar(true), width: narrow)

    // A native sidebar reveal can expand the window by the sidebar's width.
    // Reopening the Inspector must use the width at the time of the command.
    let expandedPanes = sidebar.applying(.layoutChanged, width: expanded)
    #expect(expandedPanes.applying(.inspector(true), width: expanded) == .init(sidebar: true, inspector: true))

    let narrowPanes = expandedPanes.applying(.layoutChanged, width: narrow)
    let reopened = narrowPanes.applying(.inspector(true), width: narrow)
    #expect(reopened == inspector)
    #expect(reopened.applying(.sidebar(true), width: narrow) == sidebar)
}

@Test func windowContextRejectsInvalidOrFutureArchives() {
    #expect(WindowContext.decode(nil) == nil)
    #expect(WindowContext.decode(Data("broken".utf8)) == nil)
    #expect(WindowContext.decode(Data("{}".utf8)) == nil)
    var future = WindowContext()
    future.version = 2
    #expect(WindowContext.decode(future.encoded) == nil)
}

@Test func windowSortPreservesColumnPriorityAndDirections() {
    let original: [KeyPathComparator<EpisodeRow>] = [KeyPathComparator(\.title, order: .reverse),
        KeyPathComparator(\.published), KeyPathComparator(\.length, order: .reverse), KeyPathComparator(\.stateText)]
    let archived = original.compactMap(WindowSort.init)
    #expect(archived.map(\.column) == [.title, .published, .length, .state])
    #expect(archived.map(\.comparator) == original)
    #expect(WindowSort(KeyPathComparator<EpisodeRow>(\.podcast)) == nil)
}

@Test func missingDestinationsFallBackAndDiscardTheirOldSelection() {
    let library = restorationLibrary()
    for (destination, fallback) in [(Destination.playlist("deleted"), Destination.subscriptions),
                                    (.view("deleted"), .views), (.subscription("deleted"), .subscriptions),
                                    (.subscription("removed"), .subscriptions)] {
        let value = WindowContext(destination: destination, search: "old filter", selection: ["a"],
                                  sort: [.init(column: .title)], playlistTab: .history, timelineSelection: "old")
        let reconciled = value.reconciled(in: library)
        #expect(reconciled.destination == fallback)
        #expect(reconciled.selection.isEmpty && reconciled.search.isEmpty && reconciled.sort.isEmpty)
        #expect(reconciled.playlistTab == .entries && reconciled.timelineSelection == nil)
    }
}

@Test func restorationDropsMissingIDsButKeepsEntriesAwaitingMetadata() {
    let value = WindowContext(destination: .playlist("default"), selection: ["a", "pending", "gone"],
                              subscriptionSelection: ["s", "removed", "gone"])
    let result = value.reconciled(in: restorationLibrary())
    #expect(result.destination == value.destination)
    #expect(result.selection == ["a", "pending"])
    #expect(result.subscriptionSelection == ["s"])
    #expect(result.reconciled(in: restorationLibrary()) == result)
    let filtered = WindowContext(destination: .view("all"), search: "Alpha", selection: ["a", "b", "gone"])
        .reconciled(in: restorationLibrary())
    #expect(filtered.selection == ["a"])
}

@Test func allViewsRestoresOnlyExistingViewSelections() throws {
    let library = restorationLibrary()
    let id = try #require(library.state.views.first?.id)
    let archived = WindowContext(destination: .views, selection: [id, "deleted-view"])
    let restored = try #require(WindowContext.decode(archived.encoded)).reconciled(in: library)
    #expect(restored.destination == .views)
    #expect(restored.selection == [id])
}

@Test func historyAndTimelineRestoreAgainstTheirOwnRows() {
    let library = restorationLibrary()
    let history = WindowContext(destination: .playlist("default"), selection: ["past", "a", "gone"], playlistTab: .history)
        .reconciled(in: library)
    #expect(history.playlistTab == .history && history.selection == ["past"])
    let event = TimelinePresentation.events(library.state.playlists[0], now: library.now).first!.id
    var timeline = WindowContext(destination: .playlist("default"), playlistTab: .timeline, timelineSelection: event)
    #expect(timeline.reconciled(in: library).timelineSelection == event)
    timeline.timelineSelection = "expired"
    #expect(timeline.reconciled(in: library).timelineSelection == nil)
}

@Test func incompleteLibraryDoesNotPruneRestoredContext() {
    let value = WindowContext(destination: .playlist("not-yet-pulled"), selection: ["not-yet-pulled"],
                              playlistTab: .history, subscriptionSelection: ["not-yet-pulled"])
    #expect(value.reconciled(in: restorationLibrary(ready: false)) == value)
    #expect(value.reconciled(in: restorationLibrary()).destination == .subscriptions)
}

@Test func publisherPageDefersGuidSelectionToItsFeedRead() {
    for value in [WindowContext(destination: .subscription("s"), selection: ["publisher-guid"]),
                  WindowContext(selection: ["publisher-guid"], podcastFeed: "https://example.com/discovered")] {
        #expect(value.reconciled(in: restorationLibrary()) == value)
        #expect(WindowContext.decode(value.encoded) == value)
    }
}

@MainActor @Test func applyingRestorationIsWindowLocalAndProducesNoLibraryEdits() async throws {
    let db = try await fixtureDatabase()
    let before = try await db.readLibrary()
    let window = WindowModel(), newWindow = WindowModel()
    let value = WindowContext(destination: .playlist("default"), search: "Alpha", selection: ["a"],
                              sort: [.init(column: .published, reversed: true)], playlistTab: .history,
                              scrollAnchor: .init(id: "past", index: 0), paneWidths: .init(sidebar: 280, inspector: 390))
    window.restore(try #require(WindowContext.decode(value.encoded)))
    #expect(window.destination == value.destination && window.selection == value.selection && window.search == value.search)
    #expect(window.sortOrder == value.sort.map(\.comparator))
    #expect(newWindow.destination == .subscriptions && newWindow.selection.isEmpty && newWindow.sortOrder.isEmpty)
    #expect(try await db.readLibrary() == before)
    #expect(try await db.outbox().isEmpty)
}

@Test func newWindowRequestsCarryDestinationsAndHaveIndependentIdentities() throws {
    for destination in [Destination.playlist("default"), .view("all")] {
        let first = LibraryWindowTarget(destination: destination)
        let second = LibraryWindowTarget(destination: destination)
        #expect(first != second)
        let restored = try JSONDecoder().decode(LibraryWindowTarget.self, from: JSONEncoder().encode(first))
        #expect(restored == first)
        #expect(restored.destination == destination)
        #expect(WindowContext(destination: restored.destination).reconciled(in: restorationLibrary()).destination == destination)
    }
}

@Test func readingPositionAndPaneWidthsRoundTripAndLegacyArchivesStillDecode() throws {
    let original = WindowContext(destination: .playlist("default"), scrollAnchor: .init(id: "pending", index: 2),
                                 paneWidths: .init(sidebar: 281, inspector: 397))
    #expect(WindowContext.decode(original.encoded) == original)
    let data = try #require(original.encoded)
    var legacy = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
    legacy.removeValue(forKey: "scrollAnchor"); legacy.removeValue(forKey: "paneWidths")
    let restored = try #require(WindowContext.decode(JSONSerialization.data(withJSONObject: legacy)))
    #expect(restored.destination == original.destination)
    #expect(restored.scrollAnchor == nil && restored.paneWidths == nil)
}

@Test func readingAnchorReconcilesInDisplayOrderWithoutChangingSelection() {
    let library = restorationLibrary()
    let value = WindowContext(destination: .playlist("default"), selection: ["a"],
                              scrollAnchor: .init(id: "removed", index: 1), paneWidths: .init(sidebar: 80, inspector: 900))
    let restored = value.reconciled(in: library)
    #expect(restored.scrollAnchor == RowAnchor(id: "a", index: 1))
    #expect(restored.selection == ["a"])
    #expect(restored.paneWidths == PaneWidths(sidebar: 180, inspector: 440))
    #expect(value.reconciled(in: restorationLibrary(ready: false)) == value)
    #expect(RowAnchor(id: "gone", index: 99).reconciled(with: ["a", "b"]) == RowAnchor(id: "b", index: 1))
    #expect(RowAnchor(id: "b", index: 0).reconciled(with: ["a", "b"]) == RowAnchor(id: "b", index: 1))
    #expect(RowAnchor(id: "gone", index: -1).reconciled(with: ["a"]) == RowAnchor(id: "a", index: 0))
    #expect(RowAnchor(id: "gone", index: 1).reconciled(with: []) == nil)
    #expect(WindowContext(destination: .playlist("missing"), scrollAnchor: .init(id: "a", index: 0)).reconciled(in: library).scrollAnchor == nil)
    let sorted = WindowContext(destination: .view("all"), sort: [.init(column: .title, reversed: true)], scrollAnchor: .init(id: "gone", index: 0)).reconciled(in: library)
    #expect(sorted.scrollAnchor?.id == "b")
}

@MainActor @Test func sidebarFoldsRoundTripWithTheSelectedDestinationAndStayWindowLocal() throws {
    let window = WindowModel()
    let otherWindow = WindowModel()
    #expect(window.collapsedSidebarSections.isEmpty)
    window.navigate(to: .view("all"))
    window.collapsedSidebarSections = ["Views", "Library"]
    otherWindow.collapsedSidebarSections = ["Playlists"]

    let context = window.context(libraryID: "standalone", columns: .all)
    let saved = try #require(WindowContext.decode(context.encoded))
    #expect(saved.collapsedSidebarSections == ["Views", "Library"])

    let relaunched = WindowModel()
    relaunched.restore(saved.reconciled(in: restorationLibrary()))
    #expect(relaunched.collapsedSidebarSections == ["Views", "Library"])
    #expect(relaunched.sidebarSelection == .view("all"))
    #expect(relaunched.destination == .view("all"))
    #expect(otherWindow.collapsedSidebarSections == ["Playlists"])
}

@MainActor @Test func legacyWindowContextOpensAllSidebarSections() throws {
    let legacy = try #require(WindowContext.decode(WindowContext().encoded))
    #expect(legacy.collapsedSidebarSections == nil)
    let window = WindowModel()
    window.collapsedSidebarSections = ["Views", "Playlists", "Library"]
    window.restore(legacy)
    #expect(window.collapsedSidebarSections.isEmpty)
}

@MainActor @Test func restoredReadingPositionAndWidthsStayWindowLocal() {
    let window = WindowModel(), other = WindowModel()
    let value = WindowContext(scrollAnchor: .init(id: "a", index: 4), paneWidths: .init(sidebar: 290, inspector: 400))
    window.restore(value)
    #expect(window.scrollAnchor == value.scrollAnchor && window.paneWidths == value.paneWidths)
    #expect(other.scrollAnchor == nil && other.paneWidths == PaneWidths())
    window.navigate(to: .search)
    #expect(window.scrollAnchor == nil && window.paneWidths == value.paneWidths)
    #expect(other.destination == .subscriptions && other.scrollAnchor == nil)
}

@MainActor @Test func sidebarWidthIsStoredForNextLaunchWithoutChangingTheCurrentIdeal() throws {
    let window = WindowModel()
    window.restore(WindowContext(paneWidths: .init(sidebar: 270, inspector: 360)))
    #expect(window.initialPaneWidths.sidebar == 270)

    let recorder = SidebarWidthRecorder()
    recorder.changed = { window.paneWidths.sidebar = $0 }
    recorder.record(305)
    #expect(window.paneWidths.sidebar == 270)
    recorder.flush()
    let context = window.context(libraryID: "standalone", columns: .all)
    let stored = try #require(WindowContext.decode(context.encoded))
    #expect(stored.paneWidths?.sidebar == 305)

    // Reconciliation during a session cannot feed the measured width back into layout.
    window.restore(stored.reconciled(in: restorationLibrary()))
    #expect(window.initialPaneWidths.sidebar == 270)
    #expect(window.paneWidths.sidebar == 305)
    let relaunched = WindowModel()
    relaunched.restore(stored)
    #expect(relaunched.initialPaneWidths.sidebar == 305)
    #expect(relaunched.paneWidths.sidebar == 305)
    #expect(WindowModel().initialPaneWidths.sidebar == 225)
}

@MainActor @Test func relaunchedHistoryKeepsItsPositionWhenLeavingAndReturning() throws {
    let saved = WindowContext(destination: .playlist("default"), selection: ["past"], playlistTab: .history,
                              scrollAnchor: RowAnchor(id: "past", index: 0))
    let window = WindowModel()
    window.restore(try #require(WindowContext.decode(saved.encoded)))
    window.navigate(to: .view("all"))
    window.navigate(to: .playlist("default"))
    #expect(window.playlistTab == .history)
    #expect(window.selection == saved.selection)
    #expect(window.scrollAnchor == saved.scrollAnchor)
}

@MainActor @Test func sidebarRestorationBoundsApplyEvenBeforeLibraryReadiness() throws {
    for (width, expected) in [(80.0, 180.0), (180, 180), (281, 281), (320, 320), (900, 320)] {
        let context = WindowContext(paneWidths: .init(sidebar: width))
        let stored = try #require(WindowContext.decode(context.encoded))
        let window = WindowModel()
        window.restore(stored.reconciled(in: restorationLibrary(ready: false)))
        #expect(window.paneWidths.sidebar == expected)
        #expect(window.initialPaneWidths.sidebar == expected)
    }
    for invalid in [Double.nan, .infinity, -.infinity] {
        let window = WindowModel()
        window.restore(WindowContext(paneWidths: .init(sidebar: invalid)))
        #expect(window.paneWidths.sidebar == 225)
        #expect(window.initialPaneWidths.sidebar == 225)
    }
    let legacy = WindowModel()
    legacy.restore(WindowContext())
    #expect(legacy.initialPaneWidths.sidebar == 225)
}

@MainActor @Test func sidebarRecordingAcceptsBoundsAndIgnoresCollapsedOrInvalidWidths() {
    let recorder = SidebarWidthRecorder()
    var recorded: [Double] = []
    recorder.changed = { recorded.append($0) }
    for width in [180.0, 225, 320] {
        recorder.record(width)
        recorder.flush()
    }
    for invalid in [0.0, 140, 179, 321, 900, .nan, .infinity, -.infinity] {
        recorder.record(invalid)
        recorder.flush()
    }
    #expect(recorded == [180, 225, 320])
}

@MainActor @Test func sidebarRecordingDebouncesToTheLastUserWidth() async throws {
    let recorder = SidebarWidthRecorder()
    var recorded: [Double] = []
    recorder.changed = { recorded.append($0) }
    recorder.record(240)
    recorder.record(290)
    #expect(recorded.isEmpty)
    // Offscreen AppKit layout tests share the main actor. Wait for delivery rather
    // than assuming the recorder's task started before a fixed wall-clock sleep.
    // The full suite can keep the main actor busy for well over 10 s.
    let deadline = ContinuousClock.now.advanced(by: .seconds(60))
    while recorded.isEmpty && ContinuousClock.now < deadline {
        try await Task.sleep(for: .milliseconds(10))
    }
    #expect(recorded == [290])
    recorder.flush()
    #expect(recorded == [290])
}
