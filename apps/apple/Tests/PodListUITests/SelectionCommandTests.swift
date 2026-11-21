#if os(macOS)
import SwiftUI
import Testing
@testable import PodListUI

@Test(arguments: [false, true])
func selectionToolbarNamesAreDistinctAndMatchMenuState(allStarred: Bool) {
    for allPlayed in [false, true] {
        let labels = EpisodeActionLabels(allStarred: allStarred, allPlayed: allPlayed)
        #expect(labels.names == ["Play Now", "Add to a Playlist", "Download",
                                 allStarred ? "Unstar" : "Star",
                                 allPlayed ? "Mark Unplayed" : "Mark Played", "More Episode Actions"])
        #expect(Set(labels.names).count == 6)
    }
}
@Test
@MainActor
func episodeSelectionKeepsAllowedRowsAndIgnoresOutgoingListEvents() {
    let window = WindowModel()
    window.navigate(to: .view("all"))
    let selection = window.episodeSelection(episodeIDs: ["one", "two"], otherIDs: ["failed"])
    selection.wrappedValue = ["failed", "outside"]
    #expect(window.selection == ["failed"])
    selection.wrappedValue = ["one"]
    #expect(window.selection == ["one"])

    window.navigate(to: .playlist("default"))
    selection.wrappedValue = ["two"] // An outgoing native list can still send events.
    #expect(window.selection.isEmpty)
    window.navigate(to: .view("all"))
    #expect(window.selection == ["one"])

    window.restore(WindowContext(destination: .search, selection: ["two"]))
    #expect(window.selection == ["two"])
}

@Test(arguments: [true, false])
@MainActor
func inspectorChoiceSurvivesNavigationThroughAllViews(initiallyVisible: Bool) {
    let window = WindowModel()
    var visible = initiallyVisible
    let preference = Binding(get: { visible }, set: { visible = $0 })
    window.navigate(to: .view("starred"))
    let starred = window.inspectorPresentation(preference)
    #expect(starred.wrappedValue == initiallyVisible)

    window.navigate(to: .views)
    let allViews = window.inspectorPresentation(preference)
    #expect(!allViews.wrappedValue)
    // SwiftUI can write back the dismissal while removing the pane from All Views.
    starred.wrappedValue = false
    allViews.wrappedValue = false
    #expect(visible == initiallyVisible)

    window.navigate(to: .playlist("default"))
    let playlist = window.inspectorPresentation(preference)
    allViews.wrappedValue = false // A delayed dismissal can arrive after navigation.
    starred.wrappedValue = false
    #expect(playlist.wrappedValue == initiallyVisible)
    playlist.wrappedValue = !initiallyVisible
    #expect(visible != initiallyVisible)
}
#endif
