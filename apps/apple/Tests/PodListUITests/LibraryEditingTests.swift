import Foundation
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

private let feedXML = """
<rss version="2.0"><channel><title>Science &amp; stories</title><description>About science</description><item><guid>one</guid><title>First</title><enclosure url="https://example.com/one.mp3" type="audio/mpeg" length="10"/></item><item><guid>two</guid><title>Second</title><enclosure url="https://example.com/two.mp3" type="audio/mpeg" length="10"/></item></channel></rss>
"""
private actor PublisherFixture: PublisherReader {
    var fail = Set<String>()
    func setFailure(_ url: String, _ failed: Bool) { if failed { fail.insert(url) } else { fail.remove(url) } }
    func read(_ url: URL) async throws -> Data {
        if fail.contains(url.absoluteString) { throw URLError(.notConnectedToInternet) }
        if url.host == "itunes.apple.com" { return Data(#"{"results":[{"collectionName":"Science","artistName":"Author","feedUrl":"https://example.com/rss","artworkUrl600":"https://example.com/art.png"},{"collectionName":"No feed"}]}"#.utf8) }
        return Data(feedXML.utf8)
    }
}
@MainActor private func editing(_ db: LocalDatabase, publisher: PublisherFixture = PublisherFixture(), defaults: UserDefaults? = nil) -> LibraryEditingModel {
    LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: publisher), scope: UUID().uuidString, defaults: defaults ?? UserDefaults(suiteName: UUID().uuidString)!)
}

@Test func unsubscribeRequiresTwoClicksBeforeExpiryAndResetsOnOtherInteraction() {
    var control = UnsubscribeControl()
    let start = Date(timeIntervalSince1970: 100)
    let firstClick = control.click(at: start)
    #expect(!firstClick)
    #expect(control.isArmed(at: start.addingTimeInterval(3.99)))
    let secondClick = control.click(at: start.addingTimeInterval(3.99))
    #expect(secondClick)
    #expect(!control.isArmed(at: start.addingTimeInterval(4)))
    let rearm = control.click(at: start)
    #expect(!rearm)
    let expired = control.click(at: start.addingTimeInterval(4))
    #expect(!expired)
    control.reset()
    let afterReset = control.click(at: start.addingTimeInterval(4.01))
    #expect(!afterReset)
}

@MainActor @Test func viewNamesAreUniqueAtomicallyAndTrimmedAcrossWindows() async throws {
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState()
    let one = editing(db), two = editing(db)
    let view = PodListDomain.View(id: "one", name: "  Commute  ", filter: .init(), sort: .publishedDesc, limit: nil)
    try await one.saveView(view)
    #expect(try await db.loadState().views.first?.name == "Commute")
    await #expect(throws: (any Error).self) { try await two.saveView(.init(id: "two", name: "commUTE", filter: .init(), sort: .publishedDesc, limit: nil)) }
    await #expect(throws: (any Error).self) { try await two.saveView(.init(id: "two", name: " \n", filter: .init(), sort: .publishedDesc, limit: nil)) }
    var renamed = view; renamed.name = "Fresh"
    try await one.saveView(renamed)
    #expect(try await db.loadState().views.count == 1)
    await one.undo()
    #expect(try await db.loadState().views.first?.name == "Commute")
    await one.redo()
    #expect(try await db.loadState().views.first?.name == "Fresh")
    try await one.deleteView(renamed)
    #expect(try await db.loadState().views.isEmpty)
    await one.undo()
    #expect(try await db.loadState().views.first?.name == "Fresh")
}

@MainActor @Test func conditionEditsApplyImmediatelyAndMatchCountsUseAllConditions() async throws {
    let db = try await fixtureDatabase()
    let model = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this", now: 1000)
    var view = PodListDomain.View(id: "edit", name: "Edited", filter: .init(), sort: .publishedDesc, limit: nil)
    #expect(model.viewEpisodes(view).count == 3)
    view.filter.published = .between(from: 150, to: 250)
    #expect(model.viewEpisodes(view).map(\.id) == ["b"])
    view.filter = .init(podcasts: .init(mode: .include, subscriptionIds: ["s"]), text: "details", played: .unplayed, starred: false, notInAnyPlaylist: nil, minDuration: 100, maxDuration: 400)
    #expect(model.viewEpisodes(view).map(\.id) == ["a"])
    view.filter.notInAnyPlaylist = true
    #expect(model.viewEpisodes(view).isEmpty)
    view.filter = .init(played: .inProgress)
    #expect(model.viewEpisodes(view).map(\.id) == ["a"])
    view.filter = .init(); view.sort = .durationAsc; view.limit = 1
    #expect(model.viewEpisodes(view).count == 1)
    let actions = editing(db)
    try await actions.saveView(view)
    #expect(try await db.loadState().views.last == view)
    view.filter.minDuration = 500; view.filter.maxDuration = 100
    await #expect(throws: (any Error).self) { try await actions.saveView(view) }
    #expect(ViewEdits.problem(view) != nil)
    view.filter = .init(); view.limit = 0
    #expect(ViewEdits.problem(view) != nil)
}

@MainActor @Test func searchPromotionUsesMentionsAndRefusesDuplicateNames() async throws {
    let db = try await fixtureDatabase(), actions = editing(db)
    let model = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    let query = "sciénce details"
    let rows = model.rows(for: .search, search: query)
    let view = PodListDomain.View(id: "search", name: "Science Search", filter: .init(text: query), sort: .publishedDesc, limit: nil)
    #expect(rows.map(\.id) == model.viewEpisodes(view).map(\.id))
    try await actions.saveView(view)
    await #expect(throws: (any Error).self) { try await actions.saveView(.init(id: "another", name: " science search ", filter: .init(), sort: .publishedDesc, limit: nil)) }
}

@MainActor @Test func unsubscribeKeepsOrphansAndStandaloneUndoWorksOffline() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true); try await db.ensureState()
    let http = PublisherFixture(), actions = editing(db, publisher: http)
    try await actions.subscribe("https://example.com/rss")
    let snapshot = try await db.readLibrary(), sub = try #require(snapshot.subscriptions.first), ep = try #require(snapshot.episodes.first)
    try await actions.edit(.setStar(episodeId: ep.id, starred: true))
    try await actions.unsubscribe(sub)
    let after = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this")
    #expect(after.libraryEpisodes.map(\.id) == [ep.id])
    #expect(after.snapshot.episodes.count == 2)
    await http.setFailure(sub.feedUrl, true)
    await actions.undo()
    #expect(actions.redoName == "Unsubscribe" && actions.error == nil)
    await http.setFailure(sub.feedUrl, false)
    #expect(try await db.readLibrary().subscriptions.first?.unsubscribedAt == nil)
    await actions.redo()
    #expect(try await db.readLibrary().subscriptions.first?.unsubscribedAt != nil)
    #expect(try await db.outbox().isEmpty)
}

@MainActor @Test func scopedDraftsAndGettingStartedSurviveRecreationAndSeedOnlyOnce() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true); try await db.ensureState()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let source = PodcastLibrary(database: db, publisher: PublisherFixture())
    let first = LibraryEditingModel(database: db, source: source, scope: "one", defaults: defaults)
    first.setDraft("Unfinished", field: "rename.v"); first.completeStep(2); first.showGettingStarted = false
    try await first.initialize()
    #expect(try await db.loadState().views.count == 3)
    try await db.record(.deleteView(viewId: "starter-week"), at: 1)
    let next = LibraryEditingModel(database: db, source: source, scope: "one", defaults: defaults)
    #expect(next.draft("rename.v") == "Unfinished" && next.steps == 2 && !next.showGettingStarted)
    try await next.initialize()
    #expect(try await db.loadState().views.count == 2)
    let separate = LibraryEditingModel(database: db, source: source, scope: "two", defaults: defaults)
    #expect(separate.draft("rename.v").isEmpty)
}

@MainActor @Test func opmlPartialImportProgressAndRetryKeepSuccessfulFeeds() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true); try await db.ensureState()
    let http = PublisherFixture(), actions = editing(db, publisher: http)
    let good = "https://example.com/good", bad = "https://example.com/bad"
    await http.setFailure(bad, true)
    await actions.importOPML("<opml><body><outline xmlUrl='\(good)'/><outline xmlUrl='\(bad)'/><outline xmlUrl='\(good)'/></body></opml>")
    #expect(actions.importCompleted == 2 && actions.importTotal == 2 && actions.importFailed == [bad] && !actions.busy)
    #expect(try await db.readLibrary().subscriptions.count == 1)
    await http.setFailure(bad, false); await actions.retryImport()
    #expect(actions.importFailed.isEmpty)
    #expect(try await db.readLibrary().subscriptions.count == 2)
}

@MainActor @Test func standaloneStartsWithoutTransportAndRestoresTheSameDatabase() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    let store = MemoryConnectionStore()
    let app = ApplicationModel(store: store, automaticSync: false, databaseFactory: { _ in db }, transportFactory: { _ in fatalError("Standalone must never create a server transport") })
    await app.start(); await app.startStandalone()
    #expect(app.isStandalone && app.origin == nil && app.library?.state.views.count == 3)
    #expect(store.currentOrigin == "standalone")
    await app.record(.setPlaybackSettings(settings: .init(speed: 1.5, skipIntro: 15, skipOutro: 20, volumeBoost: true)))
    await app.record(.setTrashDays(days: 7))
    let second = ApplicationModel(store: store, automaticSync: false, databaseFactory: { _ in db })
    await second.start()
    #expect(second.library?.state.playbackSettings.speed == 1.5)
    #expect(second.library?.state.trashDays == 7)
    #expect(try await db.outbox().isEmpty)
    app.disconnect(); second.disconnect()
}

private actor SubscriptionTransport: SyncTransport {
    var fail = false
    var sub = subscription()
    func setFailure(_ value: Bool) { fail = value }
    func request(method: String, path: String, body: String?) async throws -> String {
        if fail { throw URLError(.notConnectedToInternet) }
        if method == "DELETE" { sub.unsubscribedAt = 100 }
        else if method == "POST" { sub.unsubscribedAt = nil }
        return try ProtocolJSON.encode(sub)
    }
}
@MainActor @Test func failedServerUndoAndRedoRemainAvailableForRetry() async throws {
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState()
    let transport = SubscriptionTransport()
    let actions = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, transport: transport), scope: UUID().uuidString)
    try await actions.subscribe("https://example.com/s")
    try await actions.unsubscribe(subscription())
    await transport.setFailure(true); await actions.undo()
    #expect(actions.undoName == "Unsubscribe" && actions.error != nil)
    await transport.setFailure(false); await actions.undo()
    #expect(actions.redoName == "Unsubscribe" && actions.error == nil)
    await transport.setFailure(true); await actions.redo()
    #expect(actions.redoName == "Unsubscribe" && actions.error != nil)
    await transport.setFailure(false); await actions.redo()
    #expect(actions.undoName == "Unsubscribe" && actions.error == nil)
}

@MainActor @Test func standaloneDirectorySearchResolvesNamesAndSkipsResultsWithoutFeeds() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    let source = PodcastLibrary(database: db, publisher: PublisherFixture())
    let results = try await source.search(" science ")
    #expect(results.count == 1 && results.first?.title == "Science")
    #expect(results.first?.feedUrl == "https://example.com/rss")
}

@MainActor @Test func nativeUndoAndRedoRecordDurableInverseViewChanges() async throws {
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState()
    let actions = editing(db), manager = UndoManager()
    manager.groupsByEvent = false; actions.undoManager = manager
    let view = PodListDomain.View(id: "native", name: "Native", filter: .init(text: "science"), sort: .durationAsc, limit: 2)
    manager.beginUndoGrouping(); try await actions.saveView(view); manager.endUndoGrouping()
    #expect(manager.canUndo)
    manager.undo(); await actions.nativeUndoTask?.value
    #expect(try await db.loadState().views.isEmpty)
    #expect(manager.canRedo)
    manager.redo(); await actions.nativeUndoTask?.value
    #expect(try await db.loadState().views == [view])
    #expect(try await db.outbox().count == 3)
    manager.removeAllActions()
}

@MainActor @Test func changingLibraryClearsItsNativeUndoTargets() async throws {
    let db = try LocalDatabase(path: ":memory:"); try await db.ensureState()
    let actions = editing(db), manager = UndoManager()
    manager.groupsByEvent = false; actions.undoManager = manager
    manager.beginUndoGrouping()
    try await actions.saveView(.init(id: "old", name: "Old Library", filter: .init(), sort: .publishedDesc, limit: nil))
    manager.endUndoGrouping()
    #expect(manager.canUndo)
    actions.endSession()
    #expect(!manager.canUndo && actions.undoName == nil)
    try await actions.saveView(.init(id: "pending", name: "Late old edit", filter: .init(), sort: .publishedDesc, limit: nil))
    #expect(!manager.canUndo)
}
