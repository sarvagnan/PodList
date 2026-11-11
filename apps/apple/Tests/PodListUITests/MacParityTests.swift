import Foundation
import Testing
import PodListDomain
import PodListData
@testable import PodListUI

@Test func sharingUsesEpisodePageThenEnclosureAndRejectsNonWebLinks() {
    #expect(ShareLinks.episode(page: " https://publisher/episode ", enclosure: "https://publisher/audio.mp3")?.absoluteString == "https://publisher/episode")
    #expect(ShareLinks.episode(page: "javascript:alert(1)", enclosure: "https://publisher/audio.mp3")?.absoluteString == "https://publisher/audio.mp3")
    #expect(ShareLinks.episode(page: nil, enclosure: "file:///tmp/audio") == nil)
    #expect(ShareLinks.podcast(page: nil, feed: "https://publisher/rss")?.absoluteString == "https://publisher/rss")
}

@MainActor @Test func nowPlayingEntriesReturnOnlyAfterStartingPlayback() {
    let window = WindowModel()
    window.showNowPlaying = true
    window.openNowPlayingEntries("commute")
    #expect(!window.showNowPlaying && window.destination == .playlist("commute"))
    #expect(window.returnToNowPlaying)
    window.didStartPlayback()
    #expect(window.showNowPlaying && !window.returnToNowPlaying)
    window.openNowPlayingEntries("commute")
    window.navigate(to: .search)
    window.didStartPlayback()
    #expect(!window.showNowPlaying)
}

@MainActor @Test func addSheetDefaultsToActiveUnlessAnUnfinishedDraftChoseAnotherTarget() {
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let drafts = PlaylistDrafts(scope: "test", defaults: defaults)
    var first = State.initial().playlists[0], second = first
    first.id = "one"; second.id = "two"
    drafts["add/target"] = "one"
    #expect(drafts.addTarget(prefix: "add", active: "two", playlists: [first, second], preferNew: false) == "two")
    drafts["add/open"] = "true"
    #expect(drafts.addTarget(prefix: "add", active: "two", playlists: [first, second], preferNew: false) == "one")
    #expect(drafts.addTarget(prefix: "add", active: "two", playlists: [second], preferNew: false) == "two")
    #expect(drafts.addTarget(prefix: "add", active: "two", playlists: [first, second], preferNew: true) == "new")
}

@MainActor @Test func bulkDownloadRulesAreOneUndoStepAndRejectInvalidBatchAtomically() async throws {
    let db = try await fixtureDatabase()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    await app.startStandalone()
    #expect(await app.setDownloadRules(subscriptions: ["s", "other"], mode: .allNew, cap: 5))
    #expect(try await db.loadState().downloadRules.filter { $0.mode == .allNew && $0.keepAtMost == 5 }.count == 2)
    await app.editing?.reverse()
    #expect(try await db.loadState().downloadRules.filter { $0.deviceId == app.library?.deviceID }.allSatisfy { $0.mode == .never })
    await app.editing?.reverse(redo: true)
    let before = try await db.outbox()
    #expect(await app.setDownloadRules(subscriptions: ["s", "other"], mode: .allNew, cap: 0) == false)
    #expect(try await db.outbox() == before)
    app.disconnect()
}
