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
    #expect(window.search.isEmpty && window.selection == ["pending"] && window.scrollAnchor?.id == "pending")
    #expect(await EpisodeDrop.add([transfer(["a"])], to: "missing", editor: editor) { ids in
        window.didDrop(ids, into: "missing")
    } == false)
    #expect(window.pendingDropSelections["missing"] == nil)
    window.didDrop(["a"], into: "default", reveal: false)
    #expect(window.selection == ["pending"])
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
