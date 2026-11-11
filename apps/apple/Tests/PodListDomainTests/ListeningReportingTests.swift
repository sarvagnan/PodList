import Testing
import PodListDomain

private func listeningSession(duration: Double? = 1000, subscription: String? = "s") -> ListeningSession {
    ListeningSession(playlistId: "p", episodeId: "e", subscriptionId: subscription, initialPosition: 0, initialSpeed: 1, initialDuration: duration)
}
@Test func listeningReportsEveryFifteenSecondsAndFlushesSubsecondAmounts() {
    var session = listeningSession()
    #expect(session.accept(.play, at: 0, offsetMinutes: 0).isEmpty)
    #expect(session.accept(.position(seconds: 14.5, duration: nil), at: 14_500, offsetMinutes: 0).isEmpty)
    let periodic = session.accept(.position(seconds: 15, duration: nil), at: 15_000, offsetMinutes: 0)
    #expect(periodic == [.reportPosition(playlistId: "p", episodeId: "e", position: 15, listenedAt: 15_000, listening: [ListeningAmount(day: "1970-01-01", subscriptionId: "s", seconds: 14.5), ListeningAmount(day: "1970-01-01", subscriptionId: "s", seconds: 0.5)])])
    _ = session.accept(.position(seconds: 15.5, duration: nil), at: 15_500, offsetMinutes: 0)
    let tail = session.accept(.pause, at: 15_500, offsetMinutes: 0)
    if case let .reportPosition(_, _, position, _, amounts) = tail.first {
        #expect(position == 15.5 && amounts?.map(\.seconds).reduce(0, +) == 0.5)
    } else { Issue.record("Missing subsecond listening report") }
    #expect(session.accept(.flush, at: 15_501, offsetMinutes: 0).isEmpty)
}
@Test func listeningSeekSpeedFailureAndRemoteAdoptionClearMeasurementBoundary() {
    var session = listeningSession()
    _ = session.accept(.play, at: 0, offsetMinutes: 0)
    _ = session.accept(.position(seconds: 5, duration: nil), at: 5000, offsetMinutes: 0)
    let seek = session.accept(.seek(seconds: 100), at: 5000, offsetMinutes: 0)
    #expect(seek.count == 2)
    if case let .reportPosition(_, _, _, _, amounts) = seek[0] { #expect(amounts?.reduce(0) { $0 + $1.seconds } == 5) }
    if case let .reportPosition(_, _, position, _, amounts) = seek[1] { #expect(position == 100 && amounts == nil) }
    _ = session.accept(.position(seconds: 101, duration: nil), at: 6000, offsetMinutes: 0)
    #expect(session.accept(.speed(2), at: 6000, offsetMinutes: 0).count == 1)
    _ = session.accept(.position(seconds: 103, duration: nil), at: 7000, offsetMinutes: 0)
    _ = session.accept(.position(seconds: 105, duration: nil), at: 8000, offsetMinutes: 0)
    let failure = session.accept(.failure, at: 8000, offsetMinutes: 0)
    if case let .reportPosition(_, _, _, _, amounts) = failure.first { #expect(amounts?.reduce(0) { $0 + $1.seconds } == 1) }
    _ = session.accept(.remotePosition(seconds: 200, listenedAt: 9000), at: 10_000, offsetMinutes: 0)
    #expect(session.accept(.flush, at: 10_000, offsetMinutes: 0).isEmpty)
}
@Test func listeningPlayedTailNeverResurrectsPositionAndReplayDeduplicates() {
    var session = listeningSession(duration: 100)
    _ = session.accept(.play, at: 0, offsetMinutes: 0)
    let finished = session.accept(.position(seconds: 70, duration: nil), at: 1000, offsetMinutes: 0)
    #expect(finished.count == 2)
    #expect(finished.last == .markPlayed(episodeId: "e", source: .playback(playlistId: "p")))
    _ = session.accept(.position(seconds: 75, duration: nil), at: 6000, offsetMinutes: 0)
    let tail = session.accept(.pause, at: 6000, offsetMinutes: 0)
    #expect(tail == [.recordListening(amounts: [.init(day: "1970-01-01", subscriptionId: "s", seconds: 5)])])
    let op = Operation(id: "stable", deviceId: "mac", sequence: 0, recordedAt: 6000, change: tail[0])
    let once = StateRules.replay(.initial(), operations: [op])
    let retried = StateRules.replay(once.state, operations: [op], applied: once.applied)
    #expect(once == retried)
}
@Test func listeningLateMetadataAndExternallyPlayedPreserveOnlyKnownAmounts() {
    var session = listeningSession(subscription: nil)
    _ = session.accept(.play, at: 0, offsetMinutes: 0)
    _ = session.accept(.position(seconds: 5, duration: nil), at: 5000, offsetMinutes: 0)
    _ = session.accept(.metadata(subscriptionId: "s", threshold: 0), at: 5000, offsetMinutes: 0)
    _ = session.accept(.position(seconds: 10, duration: nil), at: 10_000, offsetMinutes: 0)
    _ = session.accept(.position(seconds: 15, duration: nil), at: 15_000, offsetMinutes: 0)
    _ = session.accept(.position(seconds: 20, duration: nil), at: 20_000, offsetMinutes: 0)
    let played = session.accept(.externalPlayed, at: 20_000, offsetMinutes: 0)
    #expect(played == [.recordListening(amounts: [.init(day: "1970-01-01", subscriptionId: "s", seconds: 5)])])
    #expect(session.finished)
}
