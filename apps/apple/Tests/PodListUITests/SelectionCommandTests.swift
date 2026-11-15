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
#endif
