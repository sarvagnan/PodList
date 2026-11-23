import Testing
@testable import PodListUI

#if os(macOS)
import Foundation
import PodListDomain

@MainActor @Test(arguments: [false, true])
func statsPlaylistActionUsesTheActivePlaylistInAnOpenOrReopenedLibrary(hasListeningTime: Bool) async throws {
    let db = try await fixtureDatabase()
    var state = fixtureState()
    let amounts = hasListeningTime ? [ListeningAmount(day: "2026-11-23", subscriptionId: "s", seconds: 42)] : []
    state.listeningLog = Listening.add([:], amounts: amounts)
    try await db.saveState(state)
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    var reopenCount = 0
    #expect(app.activePlaylistLinkAction { reopenCount += 1 } == nil)
    await app.startStandalone()
    let library = try #require(app.library)
    #expect(ListeningStats(log: library.state.listeningLog ?? [:], played: []).isEmpty == !hasListeningTime)
    let action = try #require(app.activePlaylistLinkAction { reopenCount += 1 })

    let open = WindowModel(), openPresentation = PlaylistPresentation()
    let destination = PodListLink.playlist(library.state.activePlaylistId)
    var links: [PodListLink] = []
    var visible = true
    app.nowPlayingNavigation.attach(window: open, presentation: openPresentation, activate: { visible }, openLink: { links.append($0) })
    action()
    #expect(links == [destination] && reopenCount == 0)

    visible = false
    action()
    #expect(links == [destination] && reopenCount == 1)
    let reopened = WindowModel(), reopenedPresentation = PlaylistPresentation()
    app.nowPlayingNavigation.attach(window: reopened, presentation: reopenedPresentation, activate: { true },
                                    openLink: { links.append($0) })
    #expect(links == [destination, destination])
}
#endif

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
