import Foundation
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

@MainActor @Test func playlistSheetStagesSettingsAndSavesThemAsOneUndoStep() async throws {
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let id = try #require(await editing.create(name: "Commute"))
    let original = try #require(try await db.loadState().playlists.first { $0.id == id })
    var draft = PlaylistSettingsDraft(original)
    draft.name = "Morning"; draft.clearOnPlayed = true
    // Typing and toggling remain local. Discarding this value is a truthful Cancel.
    #expect(try await db.loadState().playlists.first { $0.id == id } == original)
    #expect(await editing.edit(draft.changes, name: "Playlist Settings"))
    let saved = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(saved.name == "Morning" && saved.clearOnPlayed)
    await editing.reverse()
    #expect(try await db.loadState().playlists.first { $0.id == id } == original)
    #expect(PlaylistSettingsDraft(original).changes.isEmpty)
}

@MainActor @Test func subscriptionSheetStagesEverySettingIncludingPlayedAndSupportsUndo() async throws {
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let before = try await db.readLibrary()
    let sub = try #require(before.subscriptions.first { $0.id == "s" })
    var draft = SubscriptionSettingsDraft(sub, rule: nil, deviceID: "this")
    #expect(draft.changes(episodeIDs: ["a", "b"]).isEmpty)
    draft.overrides.speed = 2; draft.threshold = 60
    draft.mode = .allNew; draft.cap = 5; draft.markAllPlayed = true
    let staged = try await db.readLibrary()
    #expect(staged.state == before.state && staged.subscriptions == before.subscriptions)
    #expect(await editing.edit(draft.changes(episodeIDs: ["a", "b"]), name: "Subscription Settings", reload: true))
    let saved = try await db.readLibrary()
    #expect(saved.subscriptions.first { $0.id == "s" }?.playbackSettings.speed == 2)
    #expect(saved.subscriptions.first { $0.id == "s" }?.playedThreshold == 60)
    #expect(saved.state.downloadRules.contains { $0.subscriptionId == "s" && $0.deviceId == "this" && $0.mode == .allNew && $0.keepAtMost == 5 })
    #expect(saved.state.episodeStates["a"]?.played?.source == .user)
    await editing.reverse()
    let restored = try await db.readLibrary()
    #expect(restored.subscriptions == before.subscriptions)
    #expect(restored.state.downloadRules.filter { $0.subscriptionId != "s" || $0.deviceId != "this" } == before.state.downloadRules)
    #expect(restored.state.downloadRules.first { $0.subscriptionId == "s" && $0.deviceId == "this" }?.mode == .never)
    #expect(restored.state.episodeStates["a"]?.played == nil)
    #expect(restored.state.episodeStates["b"]?.played?.source == .user)
    #expect(restored.state.episodeStates["b"]?.starred == true)
    #expect(restored.state.playlists[0].entries.map(\.episodeId) == before.state.playlists[0].entries.map(\.episodeId))
    #expect(restored.state.playlists[0].entries.map(\.position) == before.state.playlists[0].entries.map(\.position))
    #expect(restored.state.playlists[0].cursor == before.state.playlists[0].cursor)
}

@Test func sheetDraftDoesNotOverwriteUntouchedFieldsOrRenameDefault() {
    let original = State.initial().playlists[0]
    var draft = PlaylistSettingsDraft(original)
    draft.name = "Renamed"; draft.clearOnPlayed = !original.clearOnPlayed
    #expect(draft.changes == [.setClearOnPlayed(playlistId: original.id, clearOnPlayed: !original.clearOnPlayed)])
    var subscriptionDraft = SubscriptionSettingsDraft(subscription(), rule: nil, deviceID: "this")
    subscriptionDraft.mode = .onEntry
    #expect(subscriptionDraft.changes(episodeIDs: []).count == 1)
    #expect(subscriptionDraft.changes(episodeIDs: []) == [.setDownloadRule(rule: .init(subscriptionId: "s", deviceId: "this", mode: .onEntry, keepAtMost: nil))])
}
