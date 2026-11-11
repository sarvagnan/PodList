import Foundation
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

@MainActor private func editingFixture() async throws -> (LocalDatabase, PlaylistEditingModel) {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: "PodListEditingTests-" + UUID().uuidString)!
    return (db, PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "test", defaults: defaults)))
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
    #expect(model.status == "Playlist Commute moved to Trash" && model.undoTitle == "Undo Move to Trash")
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

@MainActor @Test func failedUndoKeepsStepAndAtomicWritesRollBack() async throws {
    let (db, model) = try await editingFixture()
    let id = try #require(await model.create(name: "Gone"))
    let playlist = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(await model.delete(playlist))
    var state = try await db.loadState(); state.trash = []
    try await db.saveState(state)
    await model.reverse()
    #expect(model.error != nil && model.undoTitle == "Undo Move to Trash" && model.history.redo == nil)
    let count = try await db.outbox().count
    do {
        _ = try await db.reversibleEdit(at: 100) { _ in [.setStar(episodeId: "pending", starred: true), .createPlaylist(playlistId: "bad", name: "Default", clearOnPlayed: false)] }
        Issue.record("Duplicate name should fail")
    } catch {}
    #expect(try await db.outbox().count == count)
    #expect(try await db.loadState().episodeStates["pending"]?.starred != true)
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
