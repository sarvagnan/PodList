import Foundation
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

func subscription(_ id: String = "s", title: String = "Science", removed: Bool = false) -> Subscription {
    Subscription(id: id, feedUrl: "https://example.com/\(id)", title: title, author: "Author", description: "Podcast description",
        artwork: Artwork(url: "https://example.com/podcast.png"), subscribedAt: 1, unsubscribedAt: removed ? 2 : nil,
        playedThreshold: 20, playbackSettings: .init(speed: 1.5))
}
func episode(_ id: String = "a", subscriptionID: String = "s", title: String = "Alpha", published: Int64 = 100, duration: Double? = 300) -> Episode {
    Episode(id: id, subscriptionId: subscriptionID, guid: "guid-\(id)", title: title,
        description: "<p>Notes &amp; details &#169;</p><script>bad()</script>", published: published, duration: duration,
        audioUrl: "https://example.com/\(id).mp3", artwork: nil,
        chapters: [Chapter(start: 0, title: "Start", artwork: Artwork(url: "https://example.com/chapter.png"), url: nil)], audioUpdatedAt: 9)
}
func fixtureState() -> State {
    var state = State.initial()
    state.views = [.init(id: "all", name: "All Episodes", filter: .init(), sort: .publishedDesc, limit: nil),
                   .init(id: "unplayed", name: "Unplayed", filter: .init(played: .unplayed), sort: .durationAsc, limit: 1)]
    state.playlists[0].entries = [Entry(episodeId: "b", position: 0, positionAt: 0), Entry(episodeId: "a", position: 65, positionAt: 1), Entry(episodeId: "pending", position: 8, positionAt: 2)]
    state.playlists[0].cursor = "a"
    state.episodeStates["b"] = EpisodeState(episodeId: "b", played: Played(at: 9, source: .user), starred: true)
    state.downloadRules = [DownloadRule(subscriptionId: "s", deviceId: "other", mode: .allNew, keepAtMost: nil),
                           DownloadRule(subscriptionId: "t", deviceId: "this", mode: .onEntry, keepAtMost: nil),
                           DownloadRule(subscriptionId: "u", deviceId: "this", mode: .allNew, keepAtMost: 2)]
    state.trash = [TrashedPlaylist(playlist: .init(id: "deleted", name: "Deleted", isDefault: false, clearOnPlayed: false, entries: [], cursor: nil, history: [], timeline: []), deletedAt: 500)]
    return state
}
func fixtureDatabase() async throws -> LocalDatabase {
    let db = try LocalDatabase(path: ":memory:")
    try await db.saveState(fixtureState())
    try await db.upsertLibrary(subscriptions: [subscription(), subscription("t", title: "Talk"), subscription("u", title: "Universe"), subscription("removed", removed: true)],
        episodes: [episode(), episode("b", title: "Beta", published: 200, duration: nil), episode("orphan", subscriptionID: "removed"), episode("t1", subscriptionID: "t")])
    return db
}
func fixtureModel() async throws -> LibraryModel {
    LibraryModel(snapshot: try await fixtureDatabase().readLibrary(), deviceID: "this", now: 1_000)
}

@Test func typedLibraryReadRoundTripsAllMetadataAndState() async throws {
    let db = try await fixtureDatabase()
    let snapshot = try await db.readLibrary()
    #expect(snapshot.state == fixtureState())
    #expect(snapshot.subscriptions.first { $0.id == "s" } == subscription())
    #expect(snapshot.episodes.first { $0.id == "a" } == episode())
    #expect(snapshot.subscriptions.contains { $0.unsubscribedAt != nil })
    #expect(snapshot.episodes.contains { $0.id == "orphan" })
    #expect(try await db.outbox().isEmpty)
}

@Test func sidebarCountsAndDeviceDownloadRuleGroups() async throws {
    let model = try await fixtureModel()
    #expect(model.sidebar.map(\.name) == ["Views", "Playlists", "Library"])
    #expect(model.sidebar[0].items.map(\.count) == [3, 1])
    #expect(model.sidebar[1].items.map(\.name) == ["Default", "Trash"])
    #expect(model.sidebar[1].items[0].active)
    #expect(model.sidebar[1].items[0].count == 3)
    #expect(model.sidebar[1].items[1].count == 1)
    #expect(model.sidebar[2].items[0].count == 3)
    #expect(model.subscriptionGroups().map(\.name) == ["Stream", "When Episodes become an Entry", "As Episodes are published"])
    #expect(model.subscriptionGroups().first?.subscriptions.map(\.id) == ["s"])
    #expect(model.subscriptionGroups(search: "uNivérse").map(\.mode) == [.allNew])
}

@MainActor @Test func viewRowsFilteringSortingAndWindowIsolation() async throws {
    let library = try await fixtureModel()
    let first = WindowModel(), second = WindowModel()
    first.navigate(to: .view("all"))
    #expect(first.rows(in: library).map(\.id) == ["b", "a", "t1"])
    first.sortOrder = [KeyPathComparator(\.title, order: .reverse)]
    #expect(first.rows(in: library).map(\.id) == ["b", "a", "t1"])
    first.sortOrder = [KeyPathComparator(\.published)]
    #expect(first.rows(in: library).map(\.id) == ["a", "t1", "b"])
    first.search = "béTA science"
    #expect(first.rows(in: library).map(\.id) == ["b"])
    first.selection = ["a", "b"]
    first.reconcile(in: library)
    #expect(first.selection == ["b"])
    #expect(second.destination == .subscriptions)
    #expect(second.search.isEmpty)
    first.navigate(to: .view("unplayed"))
    #expect(first.selection.isEmpty && first.search.isEmpty && first.sortOrder.isEmpty)
    #expect(first.rows(in: library).map(\.id) == ["a"])
    first.navigate(to: .view("missing"))
    first.reconcile(in: library)
    #expect(first.destination == .subscriptions)
}

@MainActor @Test func playlistKeepsOrderCursorAndPerEntryPosition() async throws {
    let model = try await fixtureModel()
    let window = WindowModel()
    window.navigate(to: .playlist("default"))
    window.sortOrder = [KeyPathComparator(\.title)]
    let rows = window.rows(in: model)
    #expect(rows.map(\.id) == ["b", "a", "pending"])
    #expect(rows.map(\.ordinal) == [1, 2, 3])
    #expect(rows.filter(\.isCursor).map(\.id) == ["a"])
    #expect(rows[1].position == 65)
    #expect(rows[1].stateText == "In progress")
    #expect(rows[0].stateText == "Played · Starred")
    #expect(rows[2].title == "Episode details pending sync")
    #expect(model.memberships("a").first?.position == 65)
}

@Test func playerUsesActivePlaylistCurrentEntryWithoutStartingPlayback() async throws {
    let model = try await fixtureModel()
    let player = try #require(model.player)
    #expect(player.row.title == "Alpha")
    #expect(player.row.podcast == "Science")
    #expect(player.headingLines == ["Alpha", "Science"])
    #expect(player.artworkURL?.absoluteString == "https://example.com/podcast.png")
    #expect(player.elapsed == "1:05")
    #expect(player.remaining == "−3:55")
    #expect(player.speed == 1.5)
    #expect(player.entriesAfter == 1)
    #expect(player.queueText == "Default · 1 Entry after current")
    var state = model.state
    state.playlists[0].cursor = nil
    let ended = LibraryModel(snapshot: .init(state: state, subscriptions: model.snapshot.subscriptions, episodes: model.snapshot.episodes), deviceID: "this")
    #expect(ended.player == nil)
    state.playlists[0].cursor = "pending"
    let pending = LibraryModel(snapshot: .init(state: state, subscriptions: [], episodes: []), deviceID: "this")
    #expect(pending.player?.elapsed == "0:08")
    #expect(pending.player?.remaining == "—")
}

@Test func playerKeepsFullCentredHeadingsAndUsesPodcastArtworkOrInitials() throws {
    let title = "The long life of a shipping container, and why every box is the same size"
    var podcast = subscription(title: "Market Hours")
    var current = episode(title: title)
    current.artwork = Artwork(url: "https://example.com/episode.png")
    func player() throws -> PlayerPresentation {
        try #require(LibraryModel(snapshot: .init(state: fixtureState(), subscriptions: [podcast], episodes: [current]), deviceID: "this").player)
    }
    let withArtwork = try player()
    // Each centred heading gets the entire middle width; only the view may truncate it.
    #expect(withArtwork.headingLines == [title, "Market Hours"])
    #expect(withArtwork.artworkURL?.absoluteString == "https://example.com/podcast.png")
    podcast.artwork = nil
    let placeholder = try player()
    #expect(placeholder.artworkURL == nil)
    #expect(Presentation.initials(placeholder.row.podcast) == "MH")
    #expect(Presentation.initials("  Deep\tField\nPodcast ") == "DF")
}

@Test func notesArePlainTextAndViewConditionsAreReadable() async throws {
    #expect(Presentation.plainShowNotes(episode().description) == "Notes & details ©")
    #expect(Presentation.plainShowNotes("&lt;b&gt;text&lt;/b&gt;") == "<b>text</b>")
    let library = try await fixtureModel()
    #expect(ViewDescription.text(library.state.views[1], library: library) == "Unplayed · Shortest first · Show 1")
}
