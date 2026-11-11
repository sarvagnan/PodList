import Foundation
import Testing
@testable import PodListDomain

@Test func statsUsePermanentLogMondayWeeksAndOnlyPlaybackFinishedFacts() {
    let zone = TimeZone(secondsFromGMT: 0)!
    let now = ISO8601DateFormatter().date(from: "2026-11-11T12:00:00Z")!
    let log: ListeningLog = ["2026-11-08": ["a": 100], "2026-11-09": ["a": 60], "2026-11-10": ["b": 120], "2026-11-12": ["a": 50], "2026-10-31": ["a": 10]]
    let at = Int64(now.timeIntervalSince1970 * 1000)
    let stats = ListeningStats(log: log, played: [.init(at: at, source: .playback(playlistId: "p")), .init(at: at, source: .user), .init(at: at + 1000, source: .playback(playlistId: "p"))], now: now, timeZone: zone)
    #expect(stats.totals.map(\.seconds) == [180, 280, 340])
    #expect(stats.totals.map(\.finished) == [1, 1, 1])
    #expect(stats.streak == 3)
    #expect(stats.days.count == 30 && stats.days.last?.seconds == 0)
    #expect(stats.podcasts.first?.id == "a" && stats.podcasts.first?.seconds == 220)
    #expect(ListeningStats(log: [:], played: [], now: now, timeZone: zone).streak == 0)
}
@Test func statsCalendarFollowsViewingDeviceAndStreakMayEndToday() {
    let now = ISO8601DateFormatter().date(from: "2026-11-01T00:30:00Z")!
    let at = Int64(now.timeIntervalSince1970 * 1000)
    let stats = ListeningStats(log: ["2026-10-31": ["x": 10], "2026-10-30": ["x": 20]], played: [.init(at: at, source: .playback(playlistId: "p"))], now: now, timeZone: TimeZone(secondsFromGMT: -7 * 3600)!)
    #expect(stats.streak == 2)
    #expect(stats.totals[1].seconds == 30 && stats.totals[1].finished == 1)
    #expect(stats.days.last?.seconds == 10)
    #expect(ListeningStats(log: [:], played: [], now: now).totals.allSatisfy { $0.finished == 0 })
}
