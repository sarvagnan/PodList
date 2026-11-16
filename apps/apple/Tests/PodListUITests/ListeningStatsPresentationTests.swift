import Testing
@testable import PodListUI

@Test func shortListeningSessionsHaveNonzeroDurationsAndASecondsAxis() {
    #expect(ListeningStatsPresentation.time(0) == "0 seconds")
    #expect(ListeningStatsPresentation.time(0.01) == "0.1 seconds")
    #expect(ListeningStatsPresentation.time(0.6) == "0.6 seconds")
    #expect(ListeningStatsPresentation.time(1) == "1 second")
    #expect(ListeningStatsPresentation.time(45.3) == "45.3 seconds")
    #expect(ListeningStatsPresentation.time(60) == "1:00")
    #expect(ListeningStatsPresentation.usesSeconds([0, 0.6]))
    #expect(ListeningStatsPresentation.usesSeconds([0, 59.9]))
    #expect(!ListeningStatsPresentation.usesSeconds([0, 60]))
    #expect(!ListeningStatsPresentation.usesSeconds([0.6, 3600]))
}
