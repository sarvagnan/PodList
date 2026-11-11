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

@Test func emptyEpisodesDistinguishLoadingSubscriptionsAndMatches() async throws {
    let empty = LibraryModel(snapshot: .init(state: .initial(), subscriptions: [], episodes: []), deviceID: "this")
    #expect(empty.emptyEpisodes(syncing: true) == .loading)
    #expect(empty.emptyEpisodes(syncing: false) == .noSubscriptions)
    let removed = LibraryModel(snapshot: .init(state: .initial(), subscriptions: [subscription(removed: true)], episodes: []), deviceID: "this")
    #expect(removed.emptyEpisodes(syncing: false) == .noSubscriptions)
    let subscribed = try await fixtureModel()
    #expect(subscribed.emptyEpisodes(syncing: false) == .noMatches)
    #expect(subscribed.emptyEpisodes(syncing: true) == .loading)
}

@MainActor @Test func missingViewReturnsToViewsAndClearOnPlayedStatusTracksEdits() async throws {
    let db = try await fixtureDatabase()
    let before = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    #expect(before.sidebar[1].items[0].clearOnPlayed == true)
    #expect(before.sidebar[1].items[1].clearOnPlayed == nil)
    try await db.record(.setClearOnPlayed(playlistId: "default", clearOnPlayed: false), at: 2)
    let after = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    #expect(after.sidebar[1].items[0].clearOnPlayed == false)
    let window = WindowModel()
    window.navigate(to: .view("gone")); window.selection = ["a"]; window.search = "old"
    window.reconcile(in: after)
    #expect(window.destination == .views && window.selection.isEmpty && window.search.isEmpty)
    #expect(after.title(window.destination) == "Views")
}

@Test func syncScheduleCoalescesBurstsAndRestartsTimeoutAfterEveryPass() {
    var schedule = SyncSchedule()
    let first = schedule.trigger()
    let burst = schedule.trigger()
    #expect(first && !burst) // Do not restart the first trigger's settling window.
    schedule.begin()
    let firstDelay = schedule.finish()
    #expect(firstDelay == .seconds(60))
    #expect(schedule.phase == .waiting)
    schedule.timeoutReached()
    #expect(schedule.phase == .settling)
    let timeoutBurst = schedule.trigger()
    #expect(!timeoutBurst)
    schedule.begin()
    let duringPass = schedule.trigger() // An edit after the push needs another pass.
    let coalesced = schedule.trigger()
    #expect(!duringPass && !coalesced)
    let retryDelay = schedule.finish()
    #expect(retryDelay == .seconds(2))
    #expect(schedule.phase == .settling)
    schedule.begin()
    let finalDelay = schedule.finish()
    #expect(finalDelay == .seconds(60))
}

private struct PodcastPagePublisher: PublisherReader {
    func read(_ url: URL) async throws -> Data {
        Data("<rss><channel><title>Podcast</title><item><guid>one</guid><title>Episode</title><enclosure url='https://example.com/audio'/></item></channel></rss>".utf8)
    }
}

@MainActor @Test func podcastPagePreparationAndChooserShareNamedUndoBeforeAndAfterSubscribe() async throws {
    for subscribed in [false, true] {
        let db = try LocalDatabase(path: ":memory:", standalone: true)
        try await db.ensureState()
        let source = PodcastLibrary(database: db, publisher: PodcastPagePublisher())
        let feed = "https://example.com/rss"
        if subscribed { _ = try await source.subscribe(feed) }
        let defaults = UserDefaults(suiteName: UUID().uuidString)!
        let editor = LibraryEditingModel(database: db, source: source, scope: "test", defaults: defaults)
        let id = try await editor.prepareEpisode(feed, guid: "one")
        #expect(editor.edits.history.undo == nil) // Reading metadata is not a Playlist edit.
        #expect(await editor.edits.add([id], placement: .now) != nil)
        #expect(editor.undoName == "Play Now")
        #expect(try await db.loadState().playlists[0].cursor == id)
        await editor.undo()
        #expect(try await db.loadState().playlists[0].entries.isEmpty)
        #expect(editor.redoName == "Play Now")
        await editor.redo()
        #expect(try await db.loadState().playlists[0].cursor == id)
        await editor.undo()
        #expect(await editor.edits.add([id], newName: "Commute", placement: .next) != nil)
        #expect(editor.undoName == "Play Next")
        #expect(try await db.loadState().playlists.last?.name == "Commute")
        await editor.undo()
        #expect(try await db.loadState().playlists.count == 1)
        await editor.redo()
        #expect(try await db.loadState().playlists.last?.entries.first?.episodeId == id)
        #expect((try await db.readLibrary().subscriptions.first?.unsubscribedAt == nil) == subscribed)
    }
}
