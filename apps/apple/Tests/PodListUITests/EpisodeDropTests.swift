#if os(macOS)
import Foundation
import CoreTransferable
import UniformTypeIdentifiers
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

private func transfer(_ ids: [String], source: String? = nil, url: URL? = URL(string: "https://example.com/episode")) -> EpisodeTransfer {
    EpisodeTransfer(episodes: ids.map { DraggedEpisode(episodeID: $0) }, sourcePlaylistID: source, title: "Épisode — title", shareURL: url)
}

@Test func episodeTransferRoundTripsPrivateIdentityAndExportsURLThenTitle() async throws {
    let payload = transfer(["b", "a", "pending"], source: "default")
    #expect(try EpisodeTransfer.decoded(payload.encoded()) == payload)
    let types = payload.exportedContentTypes()
    #expect(types.first == .podListEpisode)
    let urlIndex = try #require(types.firstIndex(of: .url))
    let textIndex = try #require(types.firstIndex { $0.conforms(to: .plainText) })
    #expect(urlIndex < textIndex)
    let privateData = try await payload.exported(as: .podListEpisode)
    #expect(try await EpisodeTransfer(importing: privateData, contentType: .podListEpisode) == payload)
    let urlData = try await payload.exported(as: .url)
    #expect(URL(dataRepresentation: urlData, relativeTo: nil) == payload.shareURL)
    let text = try await payload.exported(as: .utf8PlainText)
    #expect(String(data: text, encoding: .utf8) == payload.title)
    #expect(EpisodeTransfer.importedContentTypes() == [.podListEpisode])
    let titleOnly = transfer(["pending"], url: nil)
    #expect(!titleOnly.exportedContentTypes().contains(.url))
    #expect(String(data: try await titleOnly.exported(as: .utf8PlainText), encoding: .utf8) == titleOnly.title)
}

@Test func episodeTransferRejectsMalformedOrMissingIdentity() throws {
    for payload in [transfer([]), transfer([""]), transfer(["a"], source: ""),
                    EpisodeTransfer(episodes: [.init(episodeID: nil, feedURL: "https://example.com/feed", guid: "g")], sourcePlaylistID: "default", title: "Remote", shareURL: nil),
                    EpisodeTransfer(episodes: [.init(episodeID: nil, feedURL: "invalid", guid: "g")], sourcePlaylistID: nil, title: "Remote", shareURL: nil)] {
        #expect(throws: (any Error).self) { try EpisodeTransfer.decoded(payload.encoded()) }
        #expect(EpisodeDrop.references([payload]) == nil)
    }
    #expect(throws: (any Error).self) { try EpisodeTransfer.decoded(Data("not JSON".utf8)) }
    #expect(throws: (any Error).self) { try EpisodeTransfer.decoded(Data(#"["default","a"]"#.utf8)) }
}

@MainActor @Test func reorderAcceptsOnlyCurrentEntriesAndKeepsOrderedSelections() async throws {
    let library = try await fixtureModel()
    let payload = EpisodeTransfer.local("a", selection: ["b", "a"], sourcePlaylistID: "default", library: library)
    #expect(payload.episodes.compactMap(\.episodeID) == ["b", "a"])
    #expect(payload.shareURL == library.episodeShareURL("a"))
    let playlist = library.state.playlists[0]
    #expect(EpisodeDrop.reorderIDs([payload], in: playlist) == ["b", "a"])
    #expect(EpisodeDrop.reorderIDs([transfer(["a"], source: "other")], in: playlist) == nil)
    #expect(EpisodeDrop.reorderIDs([transfer(["a"])], in: playlist) == nil)
    #expect(EpisodeDrop.reorderIDs([transfer(["gone"], source: "default")], in: playlist) == nil)
    #expect(EpisodeDrop.reorderIDs([], in: playlist) == nil)
    #expect(EpisodeDrop.references([payload, payload])?.compactMap(\.episodeID) == ["b", "a"])
    #expect(EpisodeTransfer.local("pending", selection: ["b", "a"], library: library).episodes.compactMap(\.episodeID) == ["pending"])
}

@MainActor @Test func sidebarEntryCopyAndEpisodeDropAreSingleUndoablePlayLastEdits() async throws {
    let db = try await fixtureDatabase()
    try await db.record(.createPlaylist(playlistId: "target", name: "Target", clearOnPlayed: false), at: 1000)
    try await db.record(.addEntry(playlistId: "target", episodeId: "orphan", placement: .last), at: 1000)
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let edits = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "drop", defaults: defaults))
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "drop", defaults: defaults, edits: edits)
    let before = try await db.loadState()
    let payload = transfer(["b", "a", "pending"], source: "default")
    #expect(await EpisodeDrop.add([payload, payload], to: "target", editor: editor))
    var after = try await db.loadState()
    #expect(after.playlists.first { $0.id == "target" }?.entries.map(\.episodeId) == ["orphan", "b", "a", "pending"])
    #expect(after.playlists[0] == before.playlists[0])
    #expect(after.activePlaylistId == before.activePlaylistId)
    #expect(edits.undoTitle == "Undo Play Last")
    await edits.reverse()
    after = try await db.loadState()
    #expect(after.playlists.first { $0.id == "target" }?.entries == before.playlists.first { $0.id == "target" }?.entries)
    #expect(edits.history.undo == nil)
    await edits.reverse(redo: true)
    #expect(try await db.loadState().playlists.first { $0.id == "target" }?.entries.map(\.episodeId) == ["orphan", "b", "a", "pending"])
    #expect(await EpisodeDrop.add([transfer(["t1"])], to: "target", editor: editor))
    #expect(try await db.loadState().playlists.first { $0.id == "target" }?.entries.last?.episodeId == "t1")
    await edits.reverse()
    #expect(try await db.loadState().playlists.first { $0.id == "target" }?.entries.map(\.episodeId) == ["orphan", "b", "a", "pending"])
    #expect(await EpisodeDrop.add([transfer(["a"])], to: "missing", editor: editor) == false)
    #expect(await EpisodeDrop.add([], to: "target", editor: editor) == false)
}

private struct DropPublisher: PublisherReader {
    func read(_ url: URL) async throws -> Data {
        Data("""
        <rss version="2.0"><channel><title>Remote</title><item><guid>one</guid><title>First</title><enclosure url="https://example.com/one.mp3" type="audio/mpeg" length="10"/></item><item><guid>two</guid><title>Second</title><enclosure url="https://example.com/two.mp3" type="audio/mpeg" length="10"/></item></channel></rss>
        """.utf8)
    }
}

@MainActor @Test func publisherPageDropResolvesEpisodesWithoutSubscribingAndAddsOneUndoStep() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    try await db.ensureState()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let edits = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "remote-drop", defaults: defaults))
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: DropPublisher()), scope: "remote-drop", defaults: defaults, edits: edits)
    let payload = EpisodeTransfer(episodes: ["one", "two"].map { .init(episodeID: nil, feedURL: "https://example.com/feed", guid: $0) }, sourcePlaylistID: nil, title: "First", shareURL: nil)
    #expect(try EpisodeTransfer.decoded(payload.encoded()) == payload)
    #expect(await EpisodeDrop.add([payload], to: "default", editor: editor))
    let library = try await db.readLibrary()
    let ids = library.state.playlists[0].entries.map(\.episodeId)
    #expect(ids.count == 2)
    #expect(ids.map { id in library.episodes.first { $0.id == id }?.guid } == ["one", "two"])
    #expect(library.subscriptions.allSatisfy { $0.unsubscribedAt != nil })
    await edits.reverse()
    #expect(try await db.loadState().playlists[0].entries.isEmpty)
    #expect(edits.history.undo == nil)
    let missing = EpisodeTransfer(episodes: [.init(episodeID: nil, feedURL: "https://example.com/feed", guid: "missing")], sourcePlaylistID: nil, title: "Missing", shareURL: nil)
    #expect(await EpisodeDrop.add([missing], to: "default", editor: editor) == false)
    #expect(try await db.loadState().playlists[0].entries.isEmpty)
}

@Test func windowDropClassifiesOPMLFilesAndFeedURLsWithoutTreatingTextAsAFile() throws {
    let opml = URL(fileURLWithPath: "/tmp/Subscriptions.OPML")
    let feed = URL(string: "https://example.com/feed.xml?value=1")!
    #expect(LibraryDrop.classify(opml) == .opml(opml))
    #expect(LibraryDrop.decode(opml.dataRepresentation, type: .fileURL) == .opml(opml))
    #expect(LibraryDrop.decode(feed.dataRepresentation, type: .url) == .feed(feed))
    #expect(LibraryDrop.decode(Data(" \n\(feed.absoluteString)\n".utf8), type: .utf8PlainText) == .feed(feed))
    #expect(LibraryDrop.classify(URL(fileURLWithPath: "/tmp/file.txt")) == nil)
    #expect(LibraryDrop.classify(URL(string: "ftp://example.com/feed")!) == nil)
    #expect(LibraryDrop.classify(URL(string: "https://user:password@example.com/feed")!) == nil)
    #expect(LibraryDrop.decode(Data(opml.absoluteString.utf8), type: .utf8PlainText) == nil)
    #expect(LibraryDrop.decode(Data(#"["default","a"]"#.utf8), type: .utf8PlainText) == nil)
}

@MainActor @Test func droppedOPMLStagesPreviewWithoutImportingAndReportsUnreadableFiles() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    try await db.ensureState()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: DropPublisher()), scope: "opml-drop", defaults: defaults)
    let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".opml")
    defer { try? FileManager.default.removeItem(at: file) }
    try "<opml version='2.0'><body><outline xmlUrl='https://example.com/feed'/></body></opml>".write(to: file, atomically: true, encoding: .utf8)
    await editor.selectOPMLFile(file)
    #expect(editor.importPresented && editor.importReady && !editor.busy)
    #expect(editor.importFeeds == ["https://example.com/feed"])
    #expect(editor.importName == file.lastPathComponent)
    #expect(try await db.readLibrary().subscriptions.isEmpty)
    #expect(try await db.outbox().isEmpty)
    editor.cancelImportSelection()
    #expect(!editor.importReady)
    await editor.selectOPMLFile(file.appendingPathExtension("missing"))
    #expect(editor.importPresented && !editor.importReady && editor.error != nil)
    #expect(try await db.readLibrary().subscriptions.isEmpty)
    try "not OPML".write(to: file, atomically: true, encoding: .utf8)
    await editor.selectOPMLFile(file)
    #expect(editor.importPresented && !editor.importReady && editor.error != nil)
}
#endif

#if os(macOS)
@MainActor @Test func successfulDropsSelectAndRevealResultsNowOrWhenNavigatedTo() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "selection-drop", defaults: defaults)
    let window = WindowModel()
    #expect(await EpisodeDrop.add([transfer(["b", "a"])], to: "default", editor: editor) { ids in
        window.didDrop(ids, into: "default")
    })
    #expect(window.destination == .subscriptions && window.selection.isEmpty)
    window.navigate(to: .playlist("default"))
    window.revealDrop(in: "default")
    #expect(window.selection == ["b", "a"] && window.scrollAnchor?.id == "b")
    window.search = "unrelated"
    #expect(await EpisodeDrop.add([transfer(["pending"])], to: "default", editor: editor) { ids in
        window.didDrop(ids, into: "default")
    })
    #expect(window.search == "unrelated" && window.selection == ["b", "a"] && window.scrollAnchor?.id == "b")
    #expect(await EpisodeDrop.add([transfer(["a"])], to: "missing", editor: editor) { ids in
        window.didDrop(ids, into: "missing")
    } == false)
    #expect(window.pendingDropSelections["missing"] == nil)
    window.search = ""
    window.didDrop(["a"], into: "default", reveal: false)
    #expect(window.selection == ["b", "a"])
    window.revealDrop(in: "default")
    #expect(window.selection == ["a"])
    #expect(window.destination == .playlist("default"))
}

@MainActor @Test func dropCursorPromisesMoveOnlyForUnmodifiedSamePlaylistReorders() {
    #expect(PlaylistDragSession.operation(source: "a", destination: "a", option: false, reorder: true) == .move)
    #expect(PlaylistDragSession.operation(source: "a", destination: "a", option: true, reorder: true) == .copy)
    for option in [true, false] {
        #expect(PlaylistDragSession.operation(source: "a", destination: "b", option: option, reorder: true) == .copy)
        #expect(PlaylistDragSession.operation(source: "a", destination: "a", option: option, reorder: false) == .copy)
        #expect(PlaylistDragSession.operation(source: nil, destination: "b", option: option, reorder: true) == .copy)
    }
}

@MainActor @Test func permanentTrashDeletionCannotBeRestoredAndPreservesOtherPlaylistsAndFacts() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "purge", defaults: defaults))
    try await db.setMeta("serverProtocolVersion", "5")
    let id = try #require(await editing.create(name: "To Delete"))
    #expect(await editing.add(["a"], to: id, placement: .last) == id)
    #expect(await editing.setStar(["a"], starred: true))
    let playlist = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(await editing.delete(playlist))
    let before = try await db.loadState()
    #expect(await editing.deletePermanently(id))
    let after = try await db.loadState()
    #expect(after.trash?.contains { $0.playlist.id == id } == false)
    #expect(after.playlists == before.playlists && after.episodeStates == before.episodeStates)
    #expect(after.listeningLog == before.listeningLog)
    #expect(await editing.restore(id) == false)
    #expect(await editing.deletePermanently("default") == false)
    #expect(await editing.deletePermanently(id) == false)
    #expect(editing.history.undo?.name != "Move to Trash")
    #expect(try await db.outbox().contains { $0.change == .purgePlaylist(playlistId: id) })
}
#endif

#if os(macOS)
@MainActor @Test func libraryDropLoadsAllProvidersInOrderDeduplicatesAndAccountsForFailures() async {
    func provider(_ text: String) -> NSItemProvider {
        let item = NSItemProvider()
        item.registerDataRepresentation(forTypeIdentifier: UTType.utf8PlainText.identifier, visibility: .all) { completion in
            completion(Data(text.utf8), nil); return nil
        }
        return item
    }
    let first = URL(string: "https://example.com/first")!, second = URL(string: "https://example.com/second")!
    let batch = await LibraryDropBatch.load([provider(first.absoluteString), provider("not a URL"), provider(second.absoluteString), provider(first.absoluteString)])
    #expect(batch.items == [.feed(first), .feed(second)])
    #expect(batch.failures.count == 1 && batch.failures[0].contains("Item 2"))
}

@MainActor @Test func mixedDroppedFilesAndFeedsStageOnePreviewAndOneUndoWithPartialFailures() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    try await db.ensureState()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: DropPublisher()), scope: "batch-drop", defaults: defaults)
    let known = "https://example.com/known", first = "https://example.com/first", second = "https://example.com/second", third = "https://example.com/third"
    try await editor.subscribe(known)
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let a = directory.appendingPathComponent("a.opml"), b = directory.appendingPathComponent("b.opml"), broken = directory.appendingPathComponent("broken.opml")
    try "<opml><body><outline xmlUrl='\(first)'/><outline xmlUrl='\(second)'/></body></opml>".write(to: a, atomically: true, encoding: .utf8)
    try "<opml><body><outline xmlUrl='\(second)'/><outline xmlUrl='\(third)'/></body></opml>".write(to: b, atomically: true, encoding: .utf8)
    try "broken".write(to: broken, atomically: true, encoding: .utf8)
    await editor.selectLibraryDrops(.init(items: [.feed(URL(string: known)!), .opml(a), .opml(broken), .opml(b), .feed(URL(string: third)!)]))
    #expect(editor.importReady && editor.importExisting == 1)
    #expect(editor.importFeeds == [known, first, second, third])
    #expect(editor.error?.contains("broken.opml") == true)
    #expect(try await db.readLibrary().subscriptions.filter { $0.unsubscribedAt == nil }.count == 1)
    await editor.importSelected()
    #expect(editor.importResults.values.filter { $0 == "Added" }.count == 3)
    #expect(editor.edits.undoTitle == "Undo Import Podcasts")
    await editor.undo()
    #expect(try await db.readLibrary().subscriptions.filter { $0.unsubscribedAt == nil }.map(\.feedUrl) == [known])
    #expect(editor.edits.undoTitle == "Undo Subscribe")
    await editor.redo()
    #expect(Set(try await db.readLibrary().subscriptions.filter { $0.unsubscribedAt == nil }.map(\.feedUrl)) == Set([known, first, second, third]))
}

private actor SlowDropPublisher: PublisherReader {
    private var pending: CheckedContinuation<Data, any Error>?
    private var observer: CheckedContinuation<Void, Never>?
    private var held = false
    func read(_ url: URL) async throws -> Data {
        if held { return try await DropPublisher().read(url) }
        held = true
        return try await withCheckedThrowingContinuation { continuation in
            pending = continuation; observer?.resume(); observer = nil
        }
    }
    func waitForRead() async {
        if pending != nil { return }
        await withCheckedContinuation { observer = $0 }
    }
    func finish() async throws {
        let data = try await DropPublisher().read(URL(string: "https://example.com/feed")!)
        pending?.resume(returning: data); pending = nil
    }
}

@MainActor @Test func slowEpisodeDropPublishesProgressAndAddsSuccessesDespiteOneFailure() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let publisher = SlowDropPublisher()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: publisher), scope: "slow-drop", defaults: defaults)
    // Missing first must not prevent the local item or later publisher Episode being added.
    let remote = EpisodeTransfer(episodes: ["missing", "one"].map { .init(episodeID: nil, feedURL: "https://example.com/feed", guid: $0) }, sourcePlaylistID: nil, title: "Remote", shareURL: nil)
    var selected: [String] = []
    let task = Task { await EpisodeDrop.add([remote, transfer(["pending"])], to: "default", editor: editor) { selected = $0 } }
    await publisher.waitForRead()
    #expect(editor.episodeDrop?.total == 3 && editor.episodeDrop?.completed == 0)
    #expect(editor.episodeDrop?.playlistID == "default")
    #expect(selected.isEmpty)
    #expect(await EpisodeDrop.add([transfer(["a"])], to: "default", editor: editor) == false)
    try await publisher.finish()
    // Subsequent reads are immediate so the remaining references can finish.
    #expect(await task.value)
    #expect(editor.episodeDrop == nil)
    #expect(selected.count == 2 && selected.last == "pending")
    #expect(editor.failedEpisodeDrop?.message.contains("Added 2 Episodes; 1 failed") == true)
    let after = try await db.loadState()
    #expect(after.playlists[0].entries.suffix(2).map(\.episodeId) == selected)
    #expect(editor.edits.undoTitle == "Undo Play Last")
    await editor.undo()
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == fixtureState().playlists[0].entries.map(\.episodeId))
    #expect(editor.edits.history.undo == nil)
}

@MainActor @Test func replacingVisibleDropSlotsSelectsResultsWithoutScrollingTheList() {
    let window = WindowModel()
    window.navigate(to: .playlist("default"))
    let anchor = RowAnchor(id: "b", index: 0)
    window.scrollAnchor = anchor
    window.didDrop(["new"], into: "default", scroll: false)
    #expect(window.selection == ["new"] && window.scrollAnchor == anchor)
    #expect(window.pendingDropSelections.isEmpty)
    // A drop completed while another destination is open is still revealed on return.
    window.navigate(to: .search)
    window.didDrop(["later"], into: "default", scroll: false)
    #expect(window.pendingDropSelections["default"] == ["later"])
    window.navigate(to: .playlist("default"))
    window.revealDrop(in: "default")
    #expect(window.selection == ["later"] && window.scrollAnchor?.id == "later")
}

@MainActor @Test func pendingDropReservesInsertionSlotsAndKeepsFailuresBetweenSuccessfulSiblings() async throws {
    let db = try await fixtureDatabase()
    let publisher = SlowDropPublisher()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: publisher),
        scope: "drop-slots", defaults: UserDefaults(suiteName: UUID().uuidString)!)
    let remote = EpisodeTransfer(episodes: ["one", "missing", "two"].map { (guid: String) in
        DraggedEpisode(episodeID: nil, feedURL: "https://example.com/feed", guid: guid, title: "Title \(guid)")
    }, sourcePlaylistID: nil, title: "Remote", shareURL: nil)
    let task = Task { await EpisodeDrop.add([remote, transfer(["t1"])], to: "default", before: "a", editor: editor) }
    await publisher.waitForRead()
    let reserved = try #require(editor.pendingEpisodeDrops.first)
    #expect(reserved.slots.count == 4)
    #expect(reserved.slots[0].accessibleName == "Adding Title one…")
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "this", now: 1_000)
    func projected(_ ids: [String]) -> [PlaylistDropRow] {
        PlaylistDropRow.rows(ids.map { library.row($0) }, batches: editor.pendingEpisodeDrops, playlistID: "default")
    }
    let originalIDs = fixtureState().playlists[0].entries.map(\.episodeId)
    #expect(projected(originalIDs).map(\.id) == ["b"] + reserved.slots.map(\.id) + ["a", "pending"])
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == originalIDs)
    #expect(PlaylistDropRow.rows([], batches: editor.pendingEpisodeDrops, playlistID: "other").isEmpty)
    try await publisher.finish()
    #expect(await task.value)
    let retained = try #require(editor.pendingEpisodeDrops.first)
    let one = try #require(retained.slots[0].resolvedID), two = try #require(retained.slots[2].resolvedID)
    let committedIDs = try await db.loadState().playlists[0].entries.map(\.episodeId)
    #expect(committedIDs == ["b", one, two, "t1", "a", "pending"])
    #expect(projected(committedIDs).map(\.id) == ["b", one, reserved.slots[1].id, two, "t1", "a", "pending"])
    #expect(retained.slots[1].failure != nil && retained.slots[1].id == reserved.slots[1].id)
    #expect(retained.slots[1].accessibleName == "Could not add Title missing")
    #expect(editor.edits.undoTitle == "Undo Add Dropped Episodes")
    EpisodeDrop.remove(retained.slots[1].id, editor: editor)
    #expect(editor.pendingEpisodeDrops.isEmpty && editor.failedEpisodeDrop == nil)
    #expect(projected(committedIDs).map(\.id) == committedIDs)
    await editor.undo()
    #expect(try await db.loadState().playlists[0].entries == fixtureState().playlists[0].entries)
    #expect(editor.edits.history.undo == nil)
}

@MainActor @Test func failedCommitKeepsSlotsAndRetryCommandFinishesTheirLifecycle() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db),
        scope: "drop-commit", defaults: UserDefaults(suiteName: UUID().uuidString)!)
    #expect(await EpisodeDrop.add([transfer(["t1"])], to: "new-target", editor: editor) == false)
    let failed = try #require(editor.pendingEpisodeDrops.first?.slots.first)
    #expect(failed.failure != nil && failed.resolvedID == "t1" && !failed.committed)
    #expect(editor.edits.history.undo == nil && !editor.edits.canRetry)
    try await db.record(.createPlaylist(playlistId: "new-target", name: "Target", clearOnPlayed: false), at: 1000)
    #expect(PersistentMenuActions.episodeDrops(editor)[.retryEpisodeDrop] != nil)
    let recovery = try #require(editor.failedEpisodeDrop)
    await recovery.retry()
    #expect(editor.pendingEpisodeDrops.isEmpty)
    #expect(try await db.loadState().playlists.first { $0.id == "new-target" }?.entries.map(\.episodeId) == ["t1"])
    await editor.undo()
    #expect(try await db.loadState().playlists.first { $0.id == "new-target" }?.entries.isEmpty == true)
    #expect(editor.edits.history.undo == nil)
    #expect(await EpisodeDrop.add([transfer(["t1"])], to: "another-missing-target", editor: editor) == false)
    #expect(editor.edits.error != nil)
    let removable = try #require(editor.pendingEpisodeDrops.first?.slots.first)
    EpisodeDrop.remove(removable.id, editor: editor)
    #expect(editor.edits.error == nil && editor.failedEpisodeDrop == nil)
    #expect(editor.pendingEpisodeDrops.isEmpty && editor.edits.history.undo == nil)
}
#endif

#if os(macOS)
private actor RetryDropPublisher: PublisherReader {
    private var attempts = 0
    func read(_ url: URL) async throws -> Data {
        attempts += 1
        if attempts == 1 { throw URLError(.timedOut) }
        return try await DropPublisher().read(url)
    }
}

@MainActor @Test func retryingFailedEpisodeDropAddsOnlyTheFailedItemsAndSelectsThem() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: RetryDropPublisher()), scope: "retry-drop", defaults: defaults)
    let remote = EpisodeTransfer(episodes: [.init(episodeID: nil, feedURL: "https://example.com/feed", guid: "one")], sourcePlaylistID: nil, title: "Remote", shareURL: nil)
    var selected: [String] = []
    #expect(await EpisodeDrop.add([remote, transfer(["t1"])], to: "default", editor: editor) { selected = $0 })
    #expect(selected == ["t1"])
    let failure = try #require(editor.failedEpisodeDrop)
    await failure.retry()
    #expect(editor.failedEpisodeDrop == nil && selected.count == 1 && selected != ["t1"])
    let after = try await db.loadState()
    #expect(after.playlists[0].entries.filter { $0.episodeId == "t1" }.count == 1)
    #expect(after.playlists[0].entries.suffix(2).map(\.episodeId) == selected + ["t1"])
    await editor.undo()
    #expect(try await db.loadState().playlists[0].entries.last?.episodeId == "t1")
    await editor.undo()
    let restored = try await db.loadState().playlists[0], original = fixtureState().playlists[0]
    #expect(restored.entries == original.entries && restored.cursor == original.cursor && restored.history == original.history)
}

@MainActor @Test func destinationRowRetryReplacesOnlyItsOwnSlotAndRemoveDoesNotCreateAnEdit() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: RetryDropPublisher()),
        scope: "row-retry", defaults: UserDefaults(suiteName: UUID().uuidString)!)
    let remote = EpisodeTransfer(episodes: ["one", "two"].map { (guid: String) in
        DraggedEpisode(episodeID: nil, feedURL: "https://example.com/feed", guid: guid)
    }, sourcePlaylistID: nil, title: "Remote", shareURL: nil)
    #expect(await EpisodeDrop.add([remote], to: "default", before: "a", editor: editor))
    let batch = try #require(editor.pendingEpisodeDrops.first)
    let failed = batch.slots[0], succeeded = try #require(batch.slots[1].resolvedID)
    #expect(failed.failure != nil && !failed.committed)
    await EpisodeDrop.retry(failed.id, editor: editor)
    #expect(editor.pendingEpisodeDrops.isEmpty && editor.failedEpisodeDrop == nil)
    let snapshot = try await db.readLibrary()
    let first = try #require(snapshot.episodes.first { $0.guid == "one" }?.id)
    #expect(snapshot.state.playlists[0].entries.map(\.episodeId) == ["b", first, succeeded, "a", "pending"])
    await editor.undo()
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["b", succeeded, "a", "pending"])
    await editor.undo()
    #expect(try await db.loadState().playlists[0].entries == fixtureState().playlists[0].entries)
    let missing = EpisodeTransfer(episodes: [.init(episodeID: nil, feedURL: "https://example.com/feed", guid: "missing")],
        sourcePlaylistID: nil, title: "Missing", shareURL: nil)
    #expect(await EpisodeDrop.add([missing], to: "default", editor: editor) == false)
    let removable = try #require(editor.pendingEpisodeDrops.first?.slots.first)
    EpisodeDrop.remove(removable.id, editor: editor)
    #expect(editor.pendingEpisodeDrops.isEmpty && editor.failedEpisodeDrop == nil)
    #expect(editor.edits.history.undo == nil)
}

@MainActor @Test func droppedImportWithOneUnreachableFeedKeepsOneUndoAndRetrySkipsSuccesses() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    try await db.ensureState()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db, publisher: RetryDropPublisher()), scope: "partial-import", defaults: defaults)
    let first = "https://example.com/first", second = "https://example.com/second"
    await editor.selectLibraryDrops(.init(items: [.feed(URL(string: first)!), .feed(URL(string: second)!)]))
    await editor.importSelected()
    #expect(editor.importFailed == [first] && editor.importFailureReasons[first] != nil)
    #expect(editor.importResults[second] == "Added" && editor.edits.undoTitle == "Undo Import Podcasts")
    await editor.retryImport()
    #expect(editor.importFailed.isEmpty && editor.importResults[first] == "Added")
    await editor.undo()
    #expect(try await db.readLibrary().subscriptions.filter { $0.unsubscribedAt == nil }.map(\.feedUrl) == [second])
    await editor.undo()
    #expect(try await db.readLibrary().subscriptions.allSatisfy { $0.unsubscribedAt != nil })
    #expect(editor.edits.history.undo == nil)
    // An already subscribed batch must not add an empty Undo step.
    await editor.selectLibraryDrops(.init(items: [.feed(URL(string: first)!)]))
    await editor.importSelected()
    await editor.selectLibraryDrops(.init(items: [.feed(URL(string: first)!)]))
    await editor.importSelected()
    await editor.undo()
    #expect(editor.edits.history.undo == nil)
}
#endif
