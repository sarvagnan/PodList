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
                                          podcastFeed: "https://example.com/feed", subscriptionSelection: ["s"])
                let data = try #require(value.encoded)
                #expect(WindowContext.decode(data) == value)
                #expect(!data.contains(10)) // Compact JSON, without pretty-print whitespace.
            }
        }
    }
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
                              sort: [.init(column: .published, reversed: true)], playlistTab: .history)
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
