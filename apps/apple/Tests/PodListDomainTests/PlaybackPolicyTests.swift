import Foundation
import Testing
import PodListDomain

@Test func playbackAdvancesFromReducedCursorWithAndWithoutClearOnPlayed() {
    for clear in [true, false] {
        var state = State.initial()
        state.playlists[0].clearOnPlayed = clear
        state.playlists[0].entries = [.init(episodeId: "a", position: 70, positionAt: 0), .init(episodeId: "b", position: 20, positionAt: 0)]
        state.playlists[0].cursor = "a"
        state = StateRules.apply(state, change: .markPlayed(episodeId: "a", source: .playback(playlistId: state.activePlaylistId)), at: 1)
        #expect(PlaybackPolicy.target(state)?.entry.episodeId == "b")
        #expect(PlaybackPolicy.target(state)?.entry.position == 20)
        #expect(state.playlists[0].entries.count == (clear ? 1 : 2))
        #expect(state.playlists[0].history.first?.episodeId == "a")
        state = StateRules.apply(state, change: .markPlayed(episodeId: "b", source: .playback(playlistId: state.activePlaylistId)), at: 2)
        #expect(PlaybackPolicy.target(state) == nil)
    }
}
@Test func thresholdAndIntroOutroHaveDistinctBoundaries() {
    #expect(PlayedRules.isFinished(position: 70, duration: 100, threshold: nil))
    #expect(!PlayedRules.isFinished(position: 99, duration: 100, threshold: 0))
    #expect(PlayedRules.isFinished(position: 0, duration: 20, threshold: nil))
    #expect(!PlayedRules.isFinished(position: 100, duration: nil, threshold: nil))
    #expect(PlaybackPolicy.startPosition(0, duration: 100, skipIntro: 10) == 10)
    #expect(PlaybackPolicy.startPosition(0, duration: 5, skipIntro: 10) == 0)
    #expect(PlaybackPolicy.startPosition(20, duration: nil, skipIntro: 10) == 20)
    #expect(PlaybackPolicy.boundary(position: 75, duration: 100, skipOutro: 0, ended: false, sleep: nil, uptime: 0) == .continue)
    #expect(PlaybackPolicy.boundary(position: 100, duration: 100, skipOutro: 0, ended: false, sleep: nil, uptime: 0) == .continue)
    #expect(PlaybackPolicy.boundary(position: 90, duration: 100, skipOutro: 10, ended: false, sleep: nil, uptime: 0) == .advance)
    #expect(PlaybackPolicy.boundary(position: 0, duration: nil, skipOutro: 0, ended: true, sleep: nil, uptime: 0) == .advance)
}
@Test func sleepWinsBeforeAdvancingAndUsesMonotonicDuration() {
    #expect(PlaybackPolicy.boundary(position: 90, duration: 100, skipOutro: 10, ended: false, sleep: .episodeEnd, uptime: 0) == .sleep)
    #expect(PlaybackPolicy.boundary(position: 30, duration: 100, skipOutro: 0, ended: false, sleep: .chapterEnd(position: 30), uptime: 0) == .sleep)
    #expect(PlaybackPolicy.boundary(position: 1, duration: nil, skipOutro: 0, ended: false, sleep: .until(uptime: 10), uptime: 10) == .sleep)
    #expect(PlaybackPolicy.boundary(position: 1, duration: nil, skipOutro: 0, ended: false, sleep: .until(uptime: 10), uptime: 9) == .continue)
}
@Test func loadedEntryHoldSourcesSettingsAndChapterArtwork() {
    #expect(PlaybackPolicy.holdLoaded(playing: true, finished: false, ended: false))
    #expect(PlaybackPolicy.holdLoaded(playing: false, finished: true, ended: false))
    #expect(!PlaybackPolicy.holdLoaded(playing: false, finished: true, ended: true))
    #expect(!PlaybackPolicy.holdLoaded(playing: false, finished: false, ended: false))
    let file = URL(fileURLWithPath: "/audio"), host = URL(string: "https://host/audio")!, proxy = URL(string: "https://server/proxy")!
    #expect(PlaybackPolicy.sources(stored: file, host: host, proxy: proxy) == [file])
    #expect(PlaybackPolicy.sources(stored: nil, host: host, proxy: proxy) == [host, proxy])
    #expect(PlaybackPolicy.sources(stored: nil, host: nil, proxy: proxy) == [proxy])
    #expect(PlaybackPolicy.sources(stored: nil, host: host, proxy: host) == [host])
    let settings = PlaybackSettings(speed: 1.5, skipIntro: 10, skipOutro: 5, volumeBoost: true)
    #expect(PlaybackPolicy.settings(settings, override: .init(speed: 2, skipOutro: 0)) == .init(speed: 2, skipIntro: 10, skipOutro: 0, volumeBoost: true))
    let chapters = [Chapter(start: 0, title: "One", artwork: nil, url: nil), Chapter(start: 60, title: "Two", artwork: .init(url: "chapter"), url: nil)]
    #expect(PlaybackPolicy.artwork(chapters, position: 70, episode: .init(url: "episode"), podcast: .init(url: "podcast"))?.url == "chapter")
    #expect(PlaybackPolicy.artwork(chapters, position: 5, episode: .init(url: "episode"), podcast: nil)?.url == "episode")
    #expect(PlaybackPolicy.chapterSleep(chapters, position: 5) == .chapterEnd(position: 60))
    #expect(PlaybackPolicy.chapterSleep(chapters, position: 70) == .episodeEnd)
}
