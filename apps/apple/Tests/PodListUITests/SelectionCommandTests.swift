#if os(macOS)
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
func showNotesCommandRequiresExactlyOneSelectedEpisodeAndOpensThatEpisode() {
    var opened: [String] = []
    let open: (String) -> Void = { opened.append($0) }
    #expect(EpisodeNotesAction.action(ids: [], open: open) == nil)
    #expect(EpisodeNotesAction.action(ids: ["one", "two"], open: open) == nil)
    let action = EpisodeNotesAction.action(ids: ["selected"], open: open)
    #expect(action != nil)
    #expect(opened.isEmpty)
    action?()
    #expect(opened == ["selected"])
}
#endif
