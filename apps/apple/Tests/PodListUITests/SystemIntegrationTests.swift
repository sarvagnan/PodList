import Foundation
import Testing
import PodListData
import PodListDomain
@testable import PodListUI

@Test func spotlightPolicyAllowsReleaseAndTourButNeverOrdinaryDebug() {
    #expect(!ActionDonations.spotlightIsEnabled(bundleIdentifier: "app.podlist.mac", isReleaseBuild: false))
    #expect(!ActionDonations.spotlightIsEnabled(bundleIdentifier: nil, isReleaseBuild: false))
    #expect(!ActionDonations.spotlightIsEnabled(bundleIdentifier: "app.podlist.uitour", isReleaseBuild: false))
    #expect(ActionDonations.spotlightIsEnabled(bundleIdentifier: "app.podlist.mac", isReleaseBuild: true))
    for release in [false, true] {
        #expect(ActionDonations.spotlightIsEnabled(bundleIdentifier: "app.podlist.uitour.system", isReleaseBuild: release))
        #expect(!ActionDonations.isEnabled(bundleIdentifier: "app.podlist.uitour.system", environment: [:], isReleaseBuild: release))
    }
}

@Test func libraryLinksRoundTripAndRejectMalformedDestinations() {
    for link in [PodListLink.episode("episode-1"), .playlist("playlist-1"), .view("view-1"),
                 .podcast("https://example.com/中文/feed.xml?q=one&other=two#fragment")] {
        #expect(PodListLink(url: link.url) == link)
    }
    for invalid in ["https://episode/id", "podlist://episode/", "podlist://episode/a/b", "podlist://episode/id?play=true",
                    "podlist://playlist/id#play", "podlist://other/id", "podlist://podcast/javascript%3Aalert(1)",
                    "podlist://user@episode/id", "podlist://episode:123/id", "podlist://podcast/https%3A%2F%2Fu%3Ap%40example.com"] {
        #expect(PodListLink(url: URL(string: invalid)!) == nil)
    }
}

@Test func spotlightProjectionKeepsOnlyLibraryObjectsAndTracksRenames() {
    var state = State.initial()
    state.playlists = [Playlist(id: "p", name: "Commute", isDefault: false, clearOnPlayed: false, entries: [], cursor: nil, history: [], timeline: [])]
    let active = subscription(), removed = subscription("gone", removed: true)
    let orphan = episode("orphan", subscriptionID: "gone")
    state.episodeStates[orphan.id] = EpisodeState(episodeId: orphan.id, played: nil, starred: true)
    let library = LibraryModel(snapshot: LibrarySnapshot(state: state, subscriptions: [active, removed],
                                                        episodes: [episode(), orphan, episode("discarded", subscriptionID: "gone")]), deviceID: "d")
    let records = SpotlightRecord.library(library)
    #expect(Set(records.map(\.id)) == Set([PodListLink.episode("a").url.absoluteString, PodListLink.episode("orphan").url.absoluteString,
                                          PodListLink.podcast(active.feedUrl).url.absoluteString, PodListLink.playlist("p").url.absoluteString]))
    #expect(records.first { $0.link == .episode("a") }?.podcast == "Science")
    #expect(records.first { $0.link == .episode("a") }?.published == Date(timeIntervalSince1970: 0.1))
    state.playlists[0].name = "Evening"
    let renamed = LibraryModel(snapshot: LibrarySnapshot(state: state, subscriptions: [], episodes: []), deviceID: "d")
    #expect(SpotlightRecord.library(renamed).first?.title == "Evening")
    #expect(!PodListLink.episode("a").exists(in: renamed))
    #expect(!PodListLink.podcast(active.feedUrl).exists(in: renamed))
    #expect(PodListLink.playlist("p").exists(in: renamed))
}

#if os(macOS)
@MainActor @Test func appLinksReopenLibraryAndConsumeOnceWithoutPlaybackOrSheets() {
    let navigation = NowPlayingLibraryNavigation()
    #expect(!navigation.perform(.link(.episode("a"))))
    let window = WindowModel(), presentation = PlaylistPresentation()
    var links: [PodListLink] = []
    navigation.attach(window: window, presentation: presentation, activate: { true }, openLink: { links.append($0) })
    navigation.attach(window: window, presentation: presentation, activate: { true }, openLink: { links.append($0) })
    #expect(links == [.episode("a")])
    #expect(presentation.sheet == nil)
    #expect(navigation.perform(.link(.playlist("p"))))
    #expect(links == [.episode("a"), .playlist("p")])
}

@MainActor @Test func serviceStagesValidatedAddressInExistingDiscoveryFlow() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "service", defaults: defaults)
    editor.podcastDiscovery.query = "previous"
    #expect(editor.stagePodcastAddress(" https://example.com/feed.xml\n"))
    #expect(editor.podcastDiscovery.query == "https://example.com/feed.xml")
    #expect(editor.draft("addPodcasts") == "https://example.com/feed.xml")
    #expect(!editor.podcastDiscovery.searched)
    for invalid in ["some selected words", "https://a.test https://b.test", "file:///tmp/feed", "https://u:p@a.test", "javascript:alert(1)"] {
        #expect(!editor.stagePodcastAddress(invalid))
    }
    #expect(editor.podcastDiscovery.query == "https://example.com/feed.xml")
    #expect(try await db.readLibrary().subscriptions.count == 4)
}
#endif

@MainActor @Test func libraryLinksResolveEveryDestinationAndPreserveContextOnMissingItems() async throws {
    let library = try await fixtureModel()
    let window = WindowModel()
    window.search = "previous query"
    #expect(window.open(.episode("a"), in: library))
    #expect(window.destination == .search && window.selection == ["a"] && window.search.isEmpty)
    #expect(window.scrollAnchor?.id == "a")
    let playlist = try #require(library.state.playlists.first)
    #expect(window.open(.playlist(playlist.id), in: library))
    #expect(window.destination == .playlist(playlist.id))
    #expect(window.open(.view("all"), in: library))
    #expect(window.destination == .view("all"))
    #expect(window.open(.podcast(subscription().feedUrl), in: library))
    #expect(window.destination == .subscription("s"))
    for link in [PodListLink.episode("removed"), .playlist("removed"), .view("removed"), .podcast("https://removed.test/feed")] {
        #expect(!window.open(link, in: library))
        #expect(window.destination == .subscription("s"))
    }
}
