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

@MainActor @Test func subscriptionSheetStagesSettingsWithoutMarkingPlayedAndSupportsUndo() async throws {
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let before = try await db.readLibrary()
    let sub = try #require(before.subscriptions.first { $0.id == "s" })
    var draft = SubscriptionSettingsDraft(sub, rule: nil, deviceID: "this")
    #expect(draft.changes.isEmpty)
    draft.overrides.speed = 2; draft.threshold = 60
    draft.mode = .allNew; draft.cap = 5
    let staged = try await db.readLibrary()
    #expect(staged.state == before.state && staged.subscriptions == before.subscriptions)
    #expect(await editing.edit(draft.changes, name: "Subscription Settings", reload: true))
    let saved = try await db.readLibrary()
    #expect(saved.subscriptions.first { $0.id == "s" }?.playbackSettings.speed == 2)
    #expect(saved.subscriptions.first { $0.id == "s" }?.playedThreshold == 60)
    #expect(saved.state.downloadRules.contains { $0.subscriptionId == "s" && $0.deviceId == "this" && $0.mode == .allNew && $0.keepAtMost == 5 })
    #expect(saved.state.episodeStates == before.state.episodeStates)
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
    #expect(subscriptionDraft.changes.count == 1)
    #expect(subscriptionDraft.changes == [.setDownloadRule(rule: .init(subscriptionId: "s", deviceId: "this", mode: .onEntry, keepAtMost: nil))])
}

@MainActor @Test func playlistSettingsJournalSurvivesReopeningAndRelaunchWithBothRenameStages() async throws {
    let suite = UUID().uuidString, scope = "library"
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: scope, defaults: defaults))
    let id = try #require(await editing.create(name: "Commute"))
    let original = try #require(try await db.loadState().playlists.first { $0.id == id })
    var draft = editing.drafts.playlistSettings(original)
    draft.clearOnPlayed.toggle()
    editing.drafts.stage(draft)
    editing.drafts["rename/\(id)"] = "Unfinished name"
    editing.drafts["rename-open/\(id)"] = "true"
    let reopened = PlaylistDrafts(scope: scope, defaults: try #require(UserDefaults(suiteName: suite)))
    #expect(reopened.playlistSettings(original).clearOnPlayed == draft.clearOnPlayed)
    #expect(reopened["rename/\(id)"] == "Unfinished name")
    #expect(reopened["rename-open/\(id)"] == "true")
    // Save Name journals the complete stage before removing the inline input.
    draft.name = "Morning"
    reopened.stage(draft)
    reopened.remove("rename/\(id)"); reopened.remove("rename-open/\(id)")
    let relaunched = PlaylistDrafts(scope: scope, defaults: try #require(UserDefaults(suiteName: suite)))
    #expect(relaunched.playlistSettings(original).changes == draft.changes)
    #expect(try await db.loadState().playlists.first { $0.id == id } == original)
    #expect(await editing.edit(relaunched.playlistSettings(original).changes, name: "Playlist Settings"))
    relaunched.discardPlaylistSettings(id)
    let saved = try #require(try await db.loadState().playlists.first { $0.id == id })
    #expect(saved.name == "Morning" && saved.clearOnPlayed == draft.clearOnPlayed)
    #expect(PlaylistDrafts(scope: scope, defaults: defaults).playlistSettings(saved).changes.isEmpty)
}

@MainActor @Test func settingsJournalsRetainOriginalBaselinesAndStayScopedToLibraryObjectAndDevice() throws {
    let suite = UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let drafts = PlaylistDrafts(scope: "one", defaults: defaults)
    var original = State.initial().playlists[0]
    var playlistDraft = drafts.playlistSettings(original)
    playlistDraft.clearOnPlayed.toggle(); drafts.stage(playlistDraft)
    original.name = "Changed by sync"
    #expect(drafts.playlistSettings(original).changes == playlistDraft.changes)
    var sub = subscription()
    sub.playbackSettings = .init(speed: 1.5, skipIntro: 30, skipOutro: 10, volumeBoost: true)
    sub.playedThreshold = 60
    let rule = DownloadRule(subscriptionId: sub.id, deviceId: "this", mode: .allNew, keepAtMost: 5)
    var stage = drafts.subscriptionSettings(sub, rule: rule, deviceID: "this")
    stage.overrides = .init(); stage.threshold = nil; stage.cap = nil; stage.mode = .onEntry
    drafts.stage(stage)
    let relaunched = PlaylistDrafts(scope: "one", defaults: try #require(UserDefaults(suiteName: suite)))
    let restored = relaunched.subscriptionSettings(sub, rule: rule, deviceID: "this")
    #expect(restored.changes == stage.changes)
    #expect(restored.overrides == .init() && restored.threshold == nil && restored.cap == nil)
    #expect(relaunched.subscriptionSettings(sub, rule: nil, deviceID: "other").changes.isEmpty)
    #expect(PlaylistDrafts(scope: "two", defaults: defaults).subscriptionSettings(sub, rule: rule, deviceID: "this").changes.isEmpty)
    var synced = sub; synced.title = "Updated elsewhere"
    #expect(relaunched.subscriptionSettings(synced, rule: nil, deviceID: "this").changes == stage.changes)
    relaunched.remove(stage.field) // Explicit Cancel and successful Save use the same removal.
    #expect(PlaylistDrafts(scope: "one", defaults: defaults).subscriptionSettings(sub, rule: rule, deviceID: "this").changes.isEmpty)
    #expect(!relaunched[playlistDraft.field].isEmpty) // Cancelling one sheet keeps other drafts.
    relaunched["rename/\(original.id)"] = "Unfinished"; relaunched["rename-open/\(original.id)"] = "true"
    relaunched.discardPlaylistSettings(original.id)
    #expect(relaunched[playlistDraft.field].isEmpty && relaunched["rename/\(original.id)"].isEmpty && relaunched["rename-open/\(original.id)"].isEmpty)
}

@MainActor @Test func failedSettingsSaveKeepsTheCompleteDraftForRetry() async throws {
    let suite = UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "test", defaults: defaults))
    let id = try #require(await editing.create(name: "Commute"))
    _ = await editing.create(name: "Morning")
    let original = try #require(try await db.loadState().playlists.first { $0.id == id })
    var draft = editing.drafts.playlistSettings(original)
    draft.name = "Morning"; draft.clearOnPlayed.toggle(); editing.drafts.stage(draft)
    #expect(await editing.edit(draft.changes, name: "Playlist Settings") == false)
    #expect(PlaylistDrafts(scope: "test", defaults: defaults).playlistSettings(original).changes == draft.changes)
    #expect(try await db.loadState().playlists.first { $0.id == id } == original)
}

@Test func oldSubscriptionSettingsJournalsCannotStageMarkAllPlayed() throws {
    let draft = SubscriptionSettingsDraft(subscription(), rule: nil, deviceID: "this")
    let encoded = try JSONEncoder().encode(draft)
    var object = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
    object["markAllPlayed"] = true
    let restored = try JSONDecoder().decode(SubscriptionSettingsDraft.self, from: JSONSerialization.data(withJSONObject: object))
    #expect(restored.changes.isEmpty)
}

@MainActor @Test func bulkDownloadRulesJournalSurvivesFailureRelaunchRetryAndDiscard() async throws {
    let suite = UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let db = try await fixtureDatabase()
    let state = try await db.loadState()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "one", defaults: defaults))
    var draft = editing.drafts.bulkDownloadRules(ids: ["s", "s"], deviceID: "this", rules: state.downloadRules)
    draft.mode = .allNew; draft.cap = 5
    editing.drafts.stage(draft)
    let reopened = PlaylistDrafts(scope: "one", defaults: defaults).bulkDownloadRules(ids: ["s"], deviceID: "this", rules: [])
    #expect(reopened.mode == .allNew && reopened.cap == 5 && reopened.failure == nil)
    editing.endSession()
    #expect(await draft.apply(using: editing) == false)
    let retryEditor = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "one", defaults: try #require(UserDefaults(suiteName: suite))))
    let restored = retryEditor.drafts.bulkDownloadRules(ids: ["s"], deviceID: "this", rules: [])
    #expect(restored.mode == .allNew && restored.cap == 5)
    #expect(restored.failure?.contains("Retry") == true)
    #expect(PlaylistDrafts(scope: "two", defaults: defaults).bulkDownloadRules(ids: ["s"], deviceID: "this", rules: []).mode == .never)
    #expect(retryEditor.drafts.bulkDownloadRules(ids: ["s"], deviceID: "other", rules: []).mode == .never)
    #expect(retryEditor.drafts.bulkDownloadRules(ids: ["other", "s"], deviceID: "this", rules: []).mode == .never)
    #expect(await restored.apply(using: retryEditor))
    let saved = try await db.loadState()
    #expect(saved.downloadRules.contains { $0.subscriptionId == "s" && $0.deviceId == "this" && $0.mode == .allNew && $0.keepAtMost == 5 })
    #expect(PlaylistDrafts(scope: "one", defaults: defaults)[draft.field].isEmpty)
    retryEditor.drafts.stage(draft)
    retryEditor.drafts.remove(draft.field) // Explicit Cancel discards only this editor.
    #expect(PlaylistDrafts(scope: "one", defaults: defaults)[draft.field].isEmpty)
}
