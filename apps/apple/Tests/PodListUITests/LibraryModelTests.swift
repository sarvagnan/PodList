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
    #expect(first.destination == .views)
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

@MainActor @Test func listPositionsRememberSelectionSortAndAnchorWithoutKeepingSearch() {
    let window = WindowModel()
    let view = Destination.view("all")
    let playlist = Destination.playlist("default")
    let viewAnchor = RowAnchor(id: "b", index: 8)
    let entryAnchor = RowAnchor(id: "a", index: 3)
    let historyAnchor = RowAnchor(id: "old", index: 10)
    let sort = [WindowSort(column: .title, reversed: true).comparator]

    window.navigate(to: view)
    window.selection = ["b"]; window.scrollAnchor = viewAnchor; window.sortOrder = sort
    window.search = "view filter"
    window.navigate(to: playlist)
    #expect(window.selection.isEmpty && window.scrollAnchor == nil && window.sortOrder.isEmpty && window.search.isEmpty)

    window.selection = ["a"]; window.scrollAnchor = entryAnchor
    window.showPlaylistTab(.history)
    #expect(window.selection.isEmpty && window.scrollAnchor == nil)
    window.selection = ["old"]; window.scrollAnchor = historyAnchor
    window.navigate(to: .search)
    window.search = "library filter"
    window.navigate(to: view)
    #expect(window.selection == ["b"] && window.scrollAnchor == viewAnchor && window.sortOrder == sort && window.search.isEmpty)
    window.navigate(to: playlist)
    #expect(window.playlistTab == .history && window.selection == ["old"] && window.scrollAnchor == historyAnchor)
    window.showPlaylistTab(.entries)
    #expect(window.selection == ["a"] && window.scrollAnchor == entryAnchor)
    window.navigate(to: .search)
    #expect(window.search.isEmpty)

    window.clearListMemory()
    window.navigate(to: view)
    #expect(window.selection.isEmpty && window.scrollAnchor == nil && window.sortOrder.isEmpty)
}

@MainActor @Test func podcastPagesRememberTheirSortAndPositionAcrossNavigation() {
    let window = WindowModel()
    let sort = [WindowSort(column: .length)]
    let anchor = RowAnchor(id: "episode", index: 5)
    window.navigate(to: .subscription("s"))
    window.podcastSort = sort; window.scrollAnchor = anchor; window.selection = ["episode"]
    window.search = "podcast filter"
    window.navigate(to: .view("all"))
    window.navigate(to: .subscription("s"))
    #expect(window.podcastSort == sort && window.scrollAnchor == anchor && window.selection == ["episode"] && window.search.isEmpty)

    let feed = "https://example.com/discovery"
    window.beginPodcastPage(feed)
    window.podcastSort = sort; window.scrollAnchor = anchor; window.selection = ["episode"]
    window.navigate(to: .subscriptions)
    window.beginPodcastPage(feed)
    #expect(window.podcastSort == sort && window.scrollAnchor == anchor && window.selection == ["episode"] && window.search.isEmpty)
}

@Test func cachedEpisodeListsMatchUncachedListsAndSearch() async throws {
    let library = try await fixtureModel()
    let copy = library
    let snapshot = library.snapshot
    func evaluate(_ view: PodListDomain.View) -> [Episode] {
        ViewRules.evaluate(view, subscriptions: snapshot.subscriptions, episodes: snapshot.episodes, state: snapshot.state, now: library.now)
    }
    let all = evaluate(.init(id: "library", name: "Library", filter: .init(), sort: .publishedDesc, limit: nil))
    var destinations: [(Destination, [String])] = [
        (.search, all.map(\.id)),
        (.subscription("s"), all.filter { $0.subscriptionId == "s" }.map(\.id)),
        (.playlist("default"), snapshot.state.playlists[0].entries.map(\.episodeId)),
    ]
    for (index, view) in snapshot.state.views.enumerated() {
        let expected = evaluate(view)
        #expect(library.sidebar[0].items[index].count == expected.count)
        #expect(copy.viewEpisodes(view) == expected)
        destinations.append((.view(view.id), expected.map(\.id)))
    }
    #expect(copy.libraryEpisodes == all)
    #expect(library.sidebar[2].items.first { $0.destination == .search }?.count == all.count)

    for (destination, ids) in destinations {
        for search in ["", " \t\u{feff}", "béTA SCIENCE", "notes alpha", "pending sync", "no matches"] {
            let words = Mentions.words(search)
            let expected = ids.filter { id in
                let episode = snapshot.episodes.first { $0.id == id }
                let podcast = snapshot.subscriptions.first { $0.id == episode?.subscriptionId }
                let fields = [episode?.title ?? "Episode details pending sync", podcast?.title ?? "Podcast details pending sync", episode?.description ?? ""].map(Mentions.fold)
                return words.allSatisfy { word in fields.contains { $0.contains(word) } }
            }
            #expect(library.rows(for: destination, search: search).map(\.id) == expected)
            #expect(copy.rows(for: destination, search: search).map(\.id) == expected)
        }
    }
}

@Test func positionCacheMatchesThePlaylistEntryScan() {
    var state = fixtureState()
    state.playlists.append(.init(id: "other", name: "Other", isDefault: false, clearOnPlayed: false, entries: [
        Entry(episodeId: "a", position: 90, positionAt: 0),
        Entry(episodeId: "pending", position: 7, positionAt: 8),
        Entry(episodeId: "negative", position: -1, positionAt: 0),
    ], cursor: nil, history: [], timeline: []))
    let library = LibraryModel(snapshot: .init(state: state, subscriptions: [subscription()], episodes: [episode()]), deviceID: "this")
    for id in ["a", "b", "pending", "negative", "missing"] {
        let expected = state.playlists.flatMap(\.entries).filter { $0.episodeId == id }.map(\.position).max()
        #expect(library.row(id).position == expected)
    }
    #expect(library.rows(for: .playlist("default")).map(\.position) == [0, 65, 8])
    #expect(library.rows(for: .playlist("other")).map(\.position) == [90, 7, -1])
}

@Test func aFreshSnapshotRebuildsCachesAndDraftsUseTheirOwnRules() {
    let recent = PodListDomain.View(id: "library", name: "Recent", filter: .init(published: .lastDays(days: 1)), sort: .publishedDesc, limit: 1)
    var state = fixtureState()
    state.views = [recent]
    let old = LibraryModel(snapshot: .init(state: state, subscriptions: [subscription()], episodes: [episode()]), deviceID: "this", now: 1_000)
    #expect(old.sidebar[0].items.map(\.count) == [1])
    #expect(old.rows(for: .view(recent.id), search: "alpha").map(\.id) == ["a"])
    #expect(old.libraryEpisodes.map(\.id) == ["a"])
    #expect(old.row("a").position == 65)

    var draft = recent
    draft.filter.starred = true
    #expect(old.viewEpisodes(draft).isEmpty)
    #expect(old.viewEpisodes(recent).map(\.id) == ["a"])

    state.playlists[0].entries.removeAll { $0.episodeId == "a" }
    let fresh = LibraryModel(snapshot: .init(state: state, subscriptions: [subscription()], episodes: [episode(title: "Gamma"), episode("new", title: "Delta", published: 200)]),
                             deviceID: "this", now: 86_401_000)
    #expect(fresh.sidebar[0].items.map(\.count) == [0])
    #expect(fresh.rows(for: .view(recent.id)).isEmpty)
    #expect(fresh.libraryEpisodes.map(\.id) == ["new", "a"])
    #expect(fresh.rows(for: .search, search: "alpha").isEmpty)
    #expect(fresh.rows(for: .search, search: "gamma").map(\.id) == ["a"])
    #expect(fresh.row("a").position == nil)
    #expect(old.rows(for: .view(recent.id), search: "alpha").map(\.id) == ["a"])
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

@Test func episodeSelectionSummaryCountsEveryEpisodeAndReportsIncompleteLengths() async throws {
    let library = try await fixtureModel()
    let selection = EpisodeSelectionSummary(ids: ["a", "t1", "a"], library: library)
    #expect(selection.ids == ["a", "t1"])
    #expect(selection.title == "2 Episodes selected")
    #expect(selection.knownLength == 600)
    #expect(selection.lengthText == "10:00")
    #expect(selection.allAvailable)

    let partial = EpisodeSelectionSummary(ids: ["a", "b", "pending"], library: library)
    #expect(partial.title == "3 Episodes selected")
    #expect(partial.knownLength == 300 && partial.unknownLengths == 2)
    #expect(partial.lengthText == "5:00 known · 2 unavailable")
    #expect(!partial.allAvailable)
    let unknown = EpisodeSelectionSummary(ids: ["b", "pending"], library: library)
    #expect(unknown.lengthText == "Unavailable")
}

@MainActor @Test func podcastBackRestoresTheOriginatingListAndBrowsingState() {
    for destination in [Destination.subscriptions, .search, .view("all")] {
        let window = WindowModel()
        window.navigate(to: destination)
        window.search = "Science"
        window.selection = ["a", "b"]
        window.sortOrder = [KeyPathComparator(\.title, order: .reverse)]
        window.scrollAnchor = RowAnchor(id: "b", index: 1)
        window.navigate(to: .subscription("s"))
        #expect(window.search.isEmpty && window.selection.isEmpty)
        #expect(window.destination == .subscription("s"))
        // Opening another Podcast must keep the same list as the Back destination.
        window.navigate(to: .subscription("t"))
        window.backFromPodcast()
        #expect(window.destination == destination)
        #expect(window.search == "Science" && window.selection == ["a", "b"])
        #expect(window.sortOrder == [KeyPathComparator(\.title, order: .reverse)])
        #expect(window.scrollAnchor == RowAnchor(id: "b", index: 1))
        #expect(window.podcastOrigin == nil)
    }
}

@MainActor @Test func discoveryPodcastBackSurvivesRestorationAndAbandonedNavigation() throws {
    let window = WindowModel()
    window.navigate(to: .search)
    window.search = "Alpha"
    window.selection = ["a"]
    // Discovery overlays Search without changing its sidebar destination.
    window.beginPodcastPage("https://example.com/new-feed")
    #expect(window.search.isEmpty && window.selection.isEmpty)
    window.search = "Podcast filter"
    let saved = window.context(libraryID: "standalone", columns: .all)
    let reopened = WindowModel()
    reopened.restore(try #require(WindowContext.decode(saved.encoded)))
    reopened.backFromPodcast()
    #expect(reopened.destination == .search && reopened.search == "Alpha")
    #expect(reopened.selection == ["a"])

    window.navigate(to: .playlist("default"))
    #expect(window.podcastOrigin == nil)
    window.navigate(to: .subscription("s"))
    window.backFromPodcast()
    #expect(window.destination == .playlist("default"))

    // A page restored from an older archive has no origin; Subscriptions is safe.
    let legacy = WindowModel()
    legacy.destination = .subscription("s")
    legacy.backFromPodcast()
    #expect(legacy.destination == .subscriptions)
}
