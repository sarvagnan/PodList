import Testing
import PodListDomain

private func downloadEpisode(_ id: String, published: Int64 = 100, entry: Bool = false, played: Bool = false, starred: Bool = false) -> DownloadEpisode {
    .init(id: id, subscriptionId: "s", published: published, entry: entry, played: played, starred: starred)
}
@Test func downloadPlannerFiltersDeviceAndKeepsEntriesOutsidePublishedCap() {
    let episodes = [downloadEpisode("entry", published: 1, entry: true), downloadEpisode("old", published: 99), downloadEpisode("new"), downloadEpisode("newest", published: 110), downloadEpisode("played", published: 120, played: true)]
    let rule = DownloadRule(subscriptionId: "s", deviceId: "mac", mode: .allNew, keepAtMost: 1, since: 100)
    #expect(DownloadPlanner.plan(deviceId: "mac", rules: [rule], episodes: episodes, stored: [], legacySince: [:], now: 200).fetch == ["entry", "newest"])
    #expect(DownloadPlanner.plan(deviceId: "other", rules: [rule], episodes: episodes, stored: [], legacySince: [:], now: 200).fetch.isEmpty)
    let entries = DownloadRule(subscriptionId: "s", deviceId: "mac", mode: .onEntry, keepAtMost: nil)
    #expect(DownloadPlanner.plan(deviceId: "mac", rules: [entries], episodes: episodes, stored: [], legacySince: [:], now: 200).fetch == ["entry"])
}
@Test func downloadPlannerProtectsManualAndStarsButDoesNotFetchStarsAlone() {
    let stored = [StoredDownload(episodeId: "star", manual: false), StoredDownload(episodeId: "manual", manual: true), StoredDownload(episodeId: "rule", manual: false)]
    let plan = DownloadPlanner.plan(deviceId: "mac", rules: [], episodes: [downloadEpisode("star", starred: true)], stored: stored, legacySince: [:], now: 200)
    #expect(plan.discard == ["rule"])
    #expect(plan.fetch.isEmpty)
}
@Test func downloadPlannerPreservesLegacySinceAndRetiresItAfterModeTransition() {
    let rule = DownloadRule(subscriptionId: "s", deviceId: "mac", mode: .allNew, keepAtMost: nil)
    let plan = DownloadPlanner.plan(deviceId: "mac", rules: [rule], episodes: [downloadEpisode("new", published: 150)], stored: [], legacySince: ["s": 100], now: 200)
    #expect(plan.fetch == ["new"] && plan.legacySince == ["s": 100])
    let off = DownloadPlanner.plan(deviceId: "mac", rules: [], episodes: [], stored: [], legacySince: plan.legacySince, now: 300)
    #expect(off.legacySince.isEmpty)
    let fresh = DownloadPlanner.plan(deviceId: "mac", rules: [rule], episodes: [downloadEpisode("new", published: 150)], stored: [], legacySince: off.legacySince, now: 300)
    #expect(fresh.fetch.isEmpty && fresh.legacySince == ["s": 300])
}
@Test func downloadProgressHandlesUnknownAndLargeLengths() {
    #expect(DownloadProgress(received: 10, total: -1).fraction == nil)
    #expect(DownloadProgress(received: 3_000_000_000, total: 6_000_000_000).fraction == 0.5)
    #expect(DownloadProgress(received: 100, total: 10).fraction == 1)
    #expect(DownloadProgress(received: -1, total: 10).fraction == 0)
}
