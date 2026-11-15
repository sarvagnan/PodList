import Foundation
import Testing
@testable import PodListUI

@Test func countedPhrasesUseSingularOnlyForOne() {
    let forms: [(CountText.Kind, String, String)] = [
        (.episode, "Episode", "Episodes"), (.matchingEpisode, "matching Episode", "matching Episodes"),
        (.entry, "Entry", "Entries"), (.playlist, "Playlist", "Playlists"), (.view, "View", "Views"),
        (.subscription, "Subscription", "Subscriptions"), (.day, "day", "days"), (.second, "second", "seconds"),
        (.result, "result", "results"), (.podcast, "podcast", "podcasts"), (.download, "download", "downloads"),
        (.position, "Position", "Positions")
    ]
    #expect(Set(forms.map(\.0)) == Set(CountText.Kind.allCases))
    for (kind, singular, plural) in forms {
        #expect(CountText.format(0, kind) == "0 \(plural)")
        #expect(CountText.format(1, kind) == "1 \(singular)")
        #expect(CountText.format(2, kind) == "2 \(plural)")
        #expect(CountText.format(Int64(30), kind) == "30 \(plural)")
    }
}

@Test func countedPhrasesKeepFullWidthCounts() {
    #expect(CountText.format(Int64(4_294_967_297), .episode) == "\(Int64(4_294_967_297).formatted()) Episodes")
}

@Test func fractionalSecondsUseTheSamePluralRules() {
    #expect(CountText.seconds(0) == "0 seconds")
    #expect(CountText.seconds(1) == "1 second")
    #expect(CountText.seconds(1.5) == "1.5 seconds")
    #expect(CountText.seconds(2) == "2 seconds")
}
