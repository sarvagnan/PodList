import Testing
import PodListDomain
import PodListData
import ProtocolTestSupport

@Test func standaloneIntentionsStayLocalAndUpdateLibraryAndStateAtomically() async throws {
    let fixture = try Fixtures.document("views.json")
    let subscriptions = try fixture["subscriptions"].decode([Subscription].self)
    let episodes = try fixture["episodes"].decode([Episode].self)
    let subscription = try #require(subscriptions.first)
    let episode = try #require(episodes.first { $0.subscriptionId == subscription.id })
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    try await db.ensureState()
    try await db.upsertLibrary(subscriptions: subscriptions, episodes: episodes)
    try await db.record(.addEntry(playlistId: defaultPlaylistId, episodeId: episode.id, placement: .last), at: 1, id: "add")
    try await db.record(.markSubscriptionPlayed(subscriptionId: subscription.id), at: 2, id: "played")
    let state = try await db.loadState()
    for episode in episodes where episode.subscriptionId == subscription.id {
        #expect(state.episodeStates[episode.id]?.played?.source == .user)
    }
    #expect(state.playlists[0].entries.isEmpty)
    #expect(state.playlists[0].history.isEmpty)
    #expect(state.listeningLog == nil)
    try await db.record(.setSubscriptionOverrides(subscriptionId: subscription.id, playbackSettings: .init(speed: 1.5), playedThreshold: 0), at: 3, id: "settings")
    let row = try #require(await db.query("SELECT playback_settings, played_threshold FROM subscription WHERE id = ?", [.text(subscription.id)]).first)
    #expect(try ProtocolJSON.decode(PlaybackSettingsOverride.self, from: #require(row["playback_settings"]?.string)).speed == 1.5)
    #expect(row["played_threshold"]?.double == 0)
    #expect(try await db.outbox().isEmpty)
    let before = try await db.loadState()
    await #expect(throws: DatabaseFailure.self) {
        try await db.recordAll([.setStar(episodeId: episode.id, starred: true), .markUnplayed(episodeId: episode.id)], at: 4, ids: ["new", "settings"])
    }
    #expect(try await db.loadState() == before)
    #expect(try await db.getMeta("sequence") == "3")
    #expect(try await db.query("SELECT id FROM local_operation WHERE id = 'new'").isEmpty)
}
