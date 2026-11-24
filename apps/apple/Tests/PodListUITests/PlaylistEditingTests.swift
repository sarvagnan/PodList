import Foundation
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

@MainActor private func editingFixture(changed: @escaping @MainActor () async -> Void = {}) async throws -> (LocalDatabase, PlaylistEditingModel) {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: "PodListEditingTests-" + UUID().uuidString)!
    return (db, PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "test", defaults: defaults), changed: changed))
}

@MainActor @Test func namedHistoryKeepsItsOriginAcrossUndoAndRedo() async throws {
    let (_, model) = try await editingFixture()
    let playlist = EditOrigin.library(.playlist("commute"))
    let search = EditOrigin.library(.search)
    await EditOrigin.$current.withValue(playlist) { await model.setStar(["a"], starred: true) }
    #expect(model.historyTitle(at: playlist) == "Undo Star")
    #expect(model.historyTitle(at: search) == nil)
    #expect(model.historyTitle(at: nil) == nil)
    await EditOrigin.$current.withValue(search) { await model.reverse() }
    #expect(model.redoTitle == "Redo Star")
    #expect(model.historyTitle(at: playlist, redo: true) == "Redo Star")
    #expect(model.historyTitle(at: search, redo: true) == nil)

    let podcast = EditOrigin.podcast("https://example.com/feed")
    try await EditOrigin.$current.withValue(podcast) {
        try await model.performExternal {
            NamedEdit(name: "Subscribe", changes: [], reload: false, action: {}, inverseAction: {})
        }
    }
    #expect(model.historyTitle(at: podcast) == "Undo Subscribe")
    #expect(model.historyTitle(at: playlist) == nil)
    await model.reverse()
    #expect(model.historyTitle(at: podcast, redo: true) == "Redo Subscribe")
    await model.reverse(redo: true)
    #expect(model.historyTitle(at: podcast) == "Undo Subscribe")
}

@MainActor @Test func episodeActionsMultiSelectUndoRedoAndUserHistory() async throws {
    let (db, model) = try await editingFixture()
    await model.setStar(["a", "b"], starred: true)
    #expect(try await db.loadState().episodeStates["a"]?.starred == true)
    #expect(model.undoTitle == "Undo Star")
    await model.reverse()
    #expect(try await db.loadState().episodeStates["a"]?.starred != true)
    #expect(try await db.loadState().episodeStates["b"]?.starred == true)
    #expect(model.redoTitle == "Redo Star")
    await model.reverse(redo: true)
    #expect(try await db.loadState().episodeStates["a"]?.starred == true)
    let before = try await db.loadState()
    await model.markPlayed(["a", "pending"], played: true)
    var state = try await db.loadState()
    #expect(state.playlists[0].entries.map(\.episodeId) == ["b"])
    #expect(state.playlists[0].history.isEmpty)
    #expect(state.episodeStates["a"]?.played?.source == .user)
    await model.reverse()
    state = try await db.loadState()
    #expect(state.playlists[0].entries.map(\.episodeId) == before.playlists[0].entries.map(\.episodeId))
    #expect(state.playlists[0].entries.map(\.position) == before.playlists[0].entries.map(\.position))
    #expect(state.playlists[0].cursor == before.playlists[0].cursor)
    await model.reverse(redo: true)
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["b"])
    await model.markPlayed(["a"], played: false)
    #expect(try await db.loadState().episodeStates["a"]?.played == nil)
    #expect(model.history.redo == nil)
    #expect(try await db.outbox().count > 0)
}

@MainActor @Test func playlistCreationNamingSettingsAndDraftPersistence() async throws {
    let (db, model) = try await editingFixture()
    #expect(await model.create(name: " default ") == nil)
    #expect(model.error?.contains("already exists") == true)
    let id = try #require(await model.create(name: " Commute "))
    #expect(try await db.loadState().playlists.first { $0.id == id }?.name == "Commute")
    #expect(await model.rename(id, name: "DEFAULT") == false)
    #expect(await model.rename(id, name: "Morning") == true)
    await model.reverse()
    #expect(try await db.loadState().playlists.first { $0.id == id }?.name == "Commute")
    await model.reverse(redo: true)
    #expect(try await db.loadState().playlists.first { $0.id == id }?.name == "Morning")
    _ = await model.edit([.setClearOnPlayed(playlistId: id, clearOnPlayed: true)], name: "Clear on Played")
    #expect(try await db.loadState().playlists.first { $0.id == id }?.clearOnPlayed == true)
    await model.reverse()
    #expect(try await db.loadState().playlists.first { $0.id == id }?.clearOnPlayed == false)
    let suite = "PodListDraftTests-" + UUID().uuidString
    let defaults = UserDefaults(suiteName: suite)!
    defer { defaults.removePersistentDomain(forName: suite) }
    let drafts = PlaylistDrafts(scope: "server-one", defaults: defaults)
    drafts["new/name"] = "Unfinished"
    drafts["rename-open/\(id)"] = "true"
    drafts["rename/\(id)"] = ""
    let reopened = PlaylistDrafts(scope: "server-one", defaults: defaults)
    #expect(reopened["new/name"] == "Unfinished" && reopened["rename-open/\(id)"] == "true" && reopened["rename/\(id)"] == "")
    #expect(PlaylistDrafts(scope: "server-two", defaults: defaults)["new/name"].isEmpty)
}

@MainActor @Test func nextLastNowAndCreateWithAddAreOneUndoStep() async throws {
    let (db, model) = try await editingFixture()
    let before = try await db.loadState()
    #expect(await model.add(["x", "y"], placement: .next) != nil)
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["b", "a", "x", "y", "pending"])
    await model.reverse()
    #expect(try await db.loadState().playlists[0].entries == before.playlists[0].entries)
    await model.reverse(redo: true)
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["b", "a", "x", "y", "pending"])
    #expect(await model.add(["z", "w"], placement: .last) != nil)
    #expect(try await db.loadState().playlists[0].entries.suffix(2).map(\.episodeId) == ["z", "w"])
    let id = try #require(await model.add(["b", "a"], newName: "Road", placement: .now))
    var state = try await db.loadState()
    #expect(state.activePlaylistId == id)
    #expect(state.playlists.first { $0.id == id }?.entries.map(\.episodeId) == ["b", "a"])
    #expect(state.playlists.first { $0.id == id }?.cursor == "b")
    await model.reverse()
    state = try await db.loadState()
    #expect(!state.playlists.contains { $0.id == id })
    #expect(state.activePlaylistId == "default")
    await model.reverse(redo: true)
    state = try await db.loadState()
    #expect(state.activePlaylistId == id)
    #expect(state.playlists.first { $0.id == id }?.entries.map(\.episodeId) == ["b", "a"])
}

#if os(macOS)
@MainActor @Test func doubleClickFromEpisodeListsUsesPlayNowInTheActivePlaylist() async throws {
    let (db, model) = try await editingFixture()
    let activation = try #require(EpisodeRowActivation(orderedIDs: ["a", "t1"], selection: ["t1"]))
    await activation.play(using: model)
    let state = try await db.loadState()
    #expect(state.activePlaylistId == "default")
    #expect(state.playlists[0].cursor == "t1")
    #expect(state.playlists[0].entries.map(\.episodeId) == ["b", "t1", "a", "pending"])
    #expect(model.undoTitle == "Undo Play Now")
    #expect(EpisodeRowActivation(orderedIDs: ["a"], selection: ["failed-slot"]) == nil)
}

@MainActor @Test func doubleClickFromPlaylistEntriesMovesTheExistingEntryBeforeItsCursor() async throws {
    let (db, model) = try await editingFixture()
    let playlistID = try #require(await model.create(name: "Commute"))
    _ = await model.add(["b", "a", "t1"], to: playlistID, placement: .last)
    _ = await model.edit([.reportPosition(playlistId: playlistID, episodeId: "t1", position: 43, listenedAt: 20)], name: "Set Position")
    let before = try await db.loadState()
    #expect(before.activePlaylistId == "default")
    let activation = try #require(EpisodeRowActivation(orderedIDs: ["b", "a", "t1"], selection: ["t1"], entriesPlaylistID: playlistID))
    await activation.play(using: model)
    let after = try await db.loadState()
    let playlist = try #require(after.playlists.first { $0.id == playlistID })
    #expect(after.activePlaylistId == playlistID)
    #expect(after.playlists[0] == before.playlists[0])
    #expect(playlist.cursor == "t1")
    #expect(playlist.entries.map(\.episodeId) == ["t1", "b", "a"])
    #expect(playlist.entries.first?.position == 43)
}
#endif

@MainActor @Test func moveRemovePlayFromHereAndTheirReversals() async throws {
    let (db, model) = try await editingFixture()
    let before = try await db.loadState()
    await model.move(["a", "pending"], playlistID: "default", to: 0)
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["a", "pending", "b"])
    #expect(try await db.loadState().playlists[0].cursor == "a")
    await model.reverse()
    #expect(try await db.loadState().playlists[0].entries == before.playlists[0].entries)
    await model.move(["a"], playlistID: "default", down: false)
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["a", "b", "pending"])
    await model.move(["a", "b"], playlistID: "default", down: true)
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["pending", "a", "b"])
    await model.remove(["a", "pending"], playlistID: "default")
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["b"])
    await model.reverse()
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["pending", "a", "b"])
    #expect(try await db.loadState().playlists[0].entries.first { $0.episodeId == "a" }?.position == 65)
    await model.playFromHere(playlistID: "default", episodeID: "b")
    #expect(try await db.loadState().playlists[0].cursor == "b")
    await model.reverse()
    #expect(try await db.loadState().playlists[0].cursor == "a")
}

@MainActor @Test func trashRestoreRepeatedUndoRedoChoosesNextFreeNameAndRetainsRecords() async throws {
    let (db, model) = try await editingFixture()
    let id = try #require(await model.create(name: "Commute"))
    _ = await model.add(["a"], to: id, placement: .next)
    var state = try await db.loadState()
    let index = try #require(state.playlists.firstIndex { $0.id == id })
    state.activePlaylistId = id
    state.playlists[index].history = [.init(episodeId: "old", finishedAt: 1)]
    state.playlists[index].timeline = [.init(at: 1, episodeId: "a", position: 25)]
    try await db.saveState(state)
    let original = state.playlists[index]
    #expect(await model.delete(original))
    #expect(model.status == "Playlist Commute moved to Trash" && model.undoTitle == "Undo Delete Playlist")
    #expect(try await db.loadState().activePlaylistId == "default")
    // Another Device claims the old name while this edit is on the Undo stack.
    try await db.record(.createPlaylist(playlistId: "other", name: "COMMUTE", clearOnPlayed: false), at: Int64(Date().timeIntervalSince1970 * 1000))
    await model.reverse()
    state = try await db.loadState()
    #expect(state.activePlaylistId == id)
    #expect(state.playlists.first { $0.id == id }?.name == "Commute 2")
    #expect(state.playlists.first { $0.id == id }?.history == original.history)
    #expect(state.playlists.first { $0.id == id }?.timeline == original.timeline)
    await model.reverse(redo: true)
    #expect(try await db.loadState().trash?.first { $0.playlist.id == id }?.playlist.name == "Commute")
    try await db.record(.createPlaylist(playlistId: "third", name: "Commute 2", clearOnPlayed: false), at: Int64(Date().timeIntervalSince1970 * 1000))
    await model.reverse()
    #expect(try await db.loadState().playlists.first { $0.id == id }?.name == "Commute 3")
    // Default protection remains a reducer rule, including direct Operations.
    try await db.record(.deletePlaylist(playlistId: "default"), at: Int64(Date().timeIntervalSince1970 * 1000))
    #expect(try await db.loadState().playlists.contains { $0.id == "default" })
}

@MainActor @Test func undoPlaylistDeleteAfterSyncedRestoreConsumesUndoAndRetainsRedo() async throws {
    let (db, model) = try await editingFixture()
    let id = try #require(await model.create(name: "Commute"))
    #expect(await model.add(["a"], to: id, placement: .last) == id)
    let playlist = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(await model.delete(playlist))
    try await pullPeerChanges([.restorePlaylist(playlistId: id)], into: db)
    let restoredByPeer = try await db.loadState()
    #expect(restoredByPeer.playlists.filter { $0.id == id } == [playlist])

    #expect(await model.restore(id) == false)
    #expect(model.error == "This Playlist is no longer in Trash. Refresh the Library.")
    var announcements: [String] = []
    model.announcements.post = { message, _ in announcements.append(message) }
    var revealed: [RestoredEntries]?
    await model.reverse { revealed = $0 }
    let feedback = "Undone: Delete Playlist · “Commute” is already restored."
    #expect(model.error == nil && model.status == feedback)
    #expect(announcements == [feedback])
    #expect(revealed?.isEmpty == true)
    #expect(model.undoTitle != "Undo Delete Playlist" && model.redoTitle == "Redo Delete Playlist")
    #expect(try await db.loadState() == restoredByPeer)
    #expect(try await db.outbox().isEmpty)

    await model.reverse(redo: true)
    #expect(model.error == nil && model.undoTitle == "Undo Delete Playlist")
    let redone = try await db.loadState()
    #expect(!redone.playlists.contains { $0.id == id })
    #expect(redone.trash?.filter { $0.playlist.id == id }.map(\.playlist) == [playlist])
    #expect(try await db.outbox().map(\.change) == [.deletePlaylist(playlistId: id)])
}

@MainActor @Test func undoPlaylistDeleteRestoresFromTrashAndReportsThePlaylistName() async throws {
    let (db, model) = try await editingFixture()
    let id = try #require(await model.create(name: "Commute"))
    let playlist = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(await model.delete(playlist))
    await model.reverse()
    #expect(model.error == nil && model.status == "Undone: Delete Playlist · Restored Playlist “Commute”")
    #expect(try await db.loadState().playlists.filter { $0.id == id } == [playlist])
    #expect(try await db.outbox().last?.change == .restorePlaylist(playlistId: id))
}

@MainActor @Test func failedUndoKeepsStepAndAtomicWritesRollBack() async throws {
    let (db, model) = try await editingFixture()
    let id = try #require(await model.create(name: "Gone"))
    let playlist = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(await model.delete(playlist))
    try await pullPeerChanges([.purgePlaylist(playlistId: id)], into: db)
    var revealed = false
    await model.reverse { _ in revealed = true }
    #expect(!revealed)
    #expect(model.error == "This Playlist is no longer in Trash.")
    #expect(model.undoTitle == "Undo Delete Playlist" && model.history.redo == nil)
    let count = try await db.outbox().count
    #expect(count == 0)
    do {
        _ = try await db.reversibleEdit(at: 100) { _ in [.setStar(episodeId: "pending", starred: true), .createPlaylist(playlistId: "bad", name: "Default", clearOnPlayed: false)] }
        Issue.record("Duplicate name should fail")
    } catch {}
    #expect(try await db.outbox().count == count)
    #expect(try await db.loadState().episodeStates["pending"]?.starred != true)
}

@MainActor @Test func undoEntryRemovalAfterSyncedAddKeepsOneEntry() async throws {
    let (db, model) = try await editingFixture()
    await model.remove(["a"], playlistID: "default")
    try await pullPeerChanges([.addEntry(playlistId: "default", episodeId: "a", placement: .last)], into: db)
    await model.reverse()
    #expect(model.error == nil && model.status == "Undone: Remove from Playlist")
    #expect(try await db.loadState().playlists[0].entries.map(\.episodeId) == ["b", "a", "pending"])
}

@MainActor @Test func undoPlaylistRenameAcceptsAnAlreadyRestoredNameDespiteASyncedDuplicate() async throws {
    let (db, model) = try await editingFixture()
    let id = try #require(await model.create(name: "Commute"))
    #expect(await model.rename(id, name: "Morning"))
    try await pullPeerChanges([
        .renamePlaylist(playlistId: id, name: "Commute"),
        .createPlaylist(playlistId: "peer-playlist", name: "Commute", clearOnPlayed: false)
    ], into: db)
    let alreadyRenamed = try await db.loadState()
    await model.reverse()
    #expect(model.error == nil && model.status == "Undone: Rename Playlist")
    #expect(try await db.loadState() == alreadyRenamed)
    #expect(try await db.outbox().isEmpty)
}

@MainActor @Test func rewindCanUndoRedoWithoutReplacingTheListeningLog() async throws {
    let (db, model) = try await editingFixture()
    var state = try await db.loadState()
    state.playlists[0].timeline = [.init(at: 1_000, episodeId: "a", position: 15)]
    state = StateRules.apply(state, change: .markPlayed(episodeId: "a", source: .playback(playlistId: "default")), at: 80_000)
    state.listeningLog = ["2026-11-11": ["s": 33]]
    try await db.saveState(state)
    #expect(await model.rewind("default", to: 1_000))
    var after = try await db.loadState()
    #expect(after.episodeStates["a"]?.played == nil && after.playlists[0].cursor == "a")
    #expect(after.playlists[0].entries.first { $0.episodeId == "a" }?.position == 15)
    await model.reverse()
    after = try await db.loadState()
    #expect(after.playlists[0].entries.map(\.episodeId) == state.playlists[0].entries.map(\.episodeId))
    #expect(after.episodeStates["a"]?.played?.source == .playback(playlistId: "default"))
    #expect(after.listeningLog == state.listeningLog)
    await model.reverse(redo: true)
    after = try await db.loadState()
    #expect(after.episodeStates["a"]?.played == nil && after.playlists[0].cursor == "a")
    #expect(after.listeningLog == state.listeningLog)
}

@MainActor @Test func directRestoreNamesItsResultAndClearOnPlayedIsNotRetroactive() async throws {
    let (db, model) = try await editingFixture()
    let original = try await db.loadState().playlists[0]
    #expect(await model.delete(original) == false)
    #expect(await model.rename("default", name: "Renamed") == false)
    _ = await model.edit([.setClearOnPlayed(playlistId: "default", clearOnPlayed: false)], name: "Clear on Played")
    _ = await model.edit([.setClearOnPlayed(playlistId: "default", clearOnPlayed: true)], name: "Clear on Played")
    #expect(try await db.loadState().playlists[0].entries.contains { $0.episodeId == "b" })
    let id = try #require(await model.create(name: "Commute"))
    let playlist = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(await model.delete(playlist))
    _ = await model.create(name: "COMMUTE")
    #expect(await model.restore(id))
    #expect(model.status == "Restored Playlist “Commute 2”")
    await model.reverse()
    #expect(try await db.loadState().trash?.first { $0.playlist.id == id }?.playlist.name == "Commute")
    await model.reverse(redo: true)
    #expect(try await db.loadState().playlists.first { $0.id == id }?.name == "Commute 2")
    #expect(await model.restore("deleted") == false) // The fixture's old Trash entry has expired.
}

@MainActor @Test func undoAndRedoRevealRestoredEntriesOnlyInTheInitiatingWindow() async throws {
    let (db, model) = try await editingFixture()
    let window = WindowModel()
    window.navigate(to: .playlist("default"))
    window.scrollAnchor = RowAnchor(id: "b", index: 0)
    let other = WindowModel()
    other.navigate(to: .playlist("default")); other.selection = ["b"]
    other.scrollAnchor = RowAnchor(id: "b", index: 0)
    let untouched = other.context(libraryID: "test", columns: .all)
    await model.remove(["a", "pending"], playlistID: "default")
    var restored: [RestoredEntries] = []
    var origin = window.restorationOrigin
    // The completion uses a snapshot refreshed after the database edit.
    await model.reverse { entries in restored = entries }
    var library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "test")
    #expect(window.revealRestoredEntries(restored, in: library, from: origin))
    #expect(restored == [RestoredEntries(playlistID: "default", episodeIDs: ["a", "pending"])])
    #expect(window.selection == ["a", "pending"])
    #expect(window.search.isEmpty && window.scrollAnchor?.id == "a")
    #expect(other.context(libraryID: "test", columns: .all) == untouched)

    #expect(await model.add(["t1"], to: "default", placement: .last) == "default")
    await model.reverse()
    window.navigate(to: .subscriptions)
    origin = window.restorationOrigin
    await model.reverse(redo: true) { entries in restored = entries }
    library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "test")
    #expect(window.revealRestoredEntries(restored, in: library, from: origin))
    #expect(window.destination == .playlist("default"))
    #expect(window.selection == ["t1"] && window.scrollAnchor?.id == "t1")
    #expect(try await db.loadState().playlists[0].entries.last?.episodeId == "t1")
    #expect(other.context(libraryID: "test", columns: .all) == untouched)
}

@MainActor @Test func undoRevealsClearOnPlayedRestorationsAndLeavesSelectionForOtherEdits() async throws {
    let (db, model) = try await editingFixture()
    let window = WindowModel()
    window.navigate(to: .playlist("default"))
    let origin = window.restorationOrigin
    var restored: [RestoredEntries] = []
    #expect(await model.markPlayed(["a", "pending"], played: true))
    await model.reverse { restored = $0 }
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "test")
    #expect(restored == [RestoredEntries(playlistID: "default", episodeIDs: ["a", "pending"])])
    #expect(window.revealRestoredEntries(restored, in: library, from: origin))
    #expect(window.selection == ["a", "pending"])
    #expect(await model.setStar(["a"], starred: true))
    await model.reverse { restored = $0 }
    #expect(restored.isEmpty)
    #expect(!window.revealRestoredEntries(restored, in: library, from: origin))
    #expect(window.selection == ["a", "pending"] && window.scrollAnchor?.id == "a")
}

@MainActor @Test func entryUndoPreservesSearchEditedWhileTheReversalIsPending() async throws {
    let window = WindowModel()
    window.navigate(to: .playlist("default"))
    window.search = "Science"
    window.selection = ["b"]
    window.scrollAnchor = RowAnchor(id: "b", index: 0)
    var duringRefresh: (() -> Void)?
    let (db, editing) = try await editingFixture(changed: { duringRefresh?() })
    await editing.remove(["a"], playlistID: "default")

    let origin = window.restorationOrigin
    duringRefresh = {
        // This runs after the database commit and before the UI completion, as
        // it would if someone typed while the Library was refreshing.
        window.search += " "
    }
    var restored: [RestoredEntries] = []
    await editing.reverse { restored = $0 }
    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "test")

    #expect(!window.revealRestoredEntries(restored, in: library, from: origin))
    #expect(window.listID == .playlist("default", .entries))
    #expect(window.search == "Science ")
    #expect(window.rows(in: library).contains { $0.id == "a" })
    #expect(window.selection == ["b"] && window.scrollAnchor?.id == "b")
    #expect(library.state.playlists[0].entries.contains { $0.episodeId == "a" })
    #expect(window.canShowRestoredEntries(in: library))

    window.showRestoredEntries(in: library)
    #expect(window.search.isEmpty && window.selection == ["a"] && window.scrollAnchor?.id == "a")
    #expect(!window.canShowRestoredEntries(in: library))
}

@MainActor @Test func entryUndoRevealsAMatchingResultWithoutClearingAnUnchangedQuery() async throws {
    let (db, editing) = try await editingFixture()
    await editing.remove(["a"], playlistID: "default")
    let window = WindowModel()
    window.navigate(to: .playlist("default"))
    window.search = "Alpha"
    let origin = window.restorationOrigin
    var restored: [RestoredEntries] = []
    await editing.reverse { restored = $0 }

    let library = LibraryModel(snapshot: try await db.readLibrary(), deviceID: "test")
    #expect(window.revealRestoredEntries(restored, in: library, from: origin))
    #expect(window.search == "Alpha")
    #expect(window.selection == ["a"] && window.scrollAnchor?.id == "a")
    #expect(!window.canShowRestoredEntries(in: library))
}
