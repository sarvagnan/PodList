import Foundation

/// Pure measurement boundaries for one loaded Entry. Persist returned Changes before the next event.
public struct ListeningSession: Sendable {
    public enum Event: Sendable {
        case play, pause, discontinuity, failure, externalPlayed, ended, flush
        case position(seconds: Double, duration: Double?)
        case seek(seconds: Double)
        case metadata(subscriptionId: String?, threshold: Double?)
        case remotePosition(seconds: Double, listenedAt: Int64)
        case speed(Double)
    }
    private let playlistId: String
    private let episodeId: String
    private var subscriptionId: String?
    private var position: Double
    private var speed: Double
    private var duration: Double?
    private var threshold: Double?
    private let reportEveryMillis: Int64
    private var lastReportAt: Int64
    private var lastReportPosition: Double
    private var playing = false
    public private(set) var finished = false
    private var before: Listening.Sample?
    private var pending: [ListeningAmount] = []

    public init(playlistId: String, episodeId: String, subscriptionId: String?, initialPosition: Double,
                initialSpeed: Double, initialDuration: Double?, threshold: Double? = nil,
                reportEveryMillis: Int64 = 15_000, initialAt: Int64 = 0) {
        self.playlistId = playlistId; self.episodeId = episodeId; self.subscriptionId = subscriptionId
        position = initialPosition; speed = initialSpeed; duration = initialDuration; self.threshold = threshold
        self.reportEveryMillis = reportEveryMillis; lastReportAt = initialAt; lastReportPosition = initialPosition
    }

    public mutating func accept(_ event: Event, at: Int64, offsetMinutes: Int) -> [Change] {
        var changes: [Change] = []
        switch event {
        case .play: playing = true; before = Listening.Sample(at: Double(at), position: position)
        case .pause, .failure: playing = false; before = nil; report(at: at, into: &changes)
        case .discontinuity: before = nil
        case let .position(seconds, newDuration):
            let after = Listening.Sample(at: Double(at), position: seconds)
            if playing, let subscriptionId {
                pending += Listening.sample(before: before, after: after, speed: speed, offsetMinutes: offsetMinutes)
                    .map { ListeningAmount(day: $0.day, subscriptionId: subscriptionId, seconds: $0.seconds) }
            }
            before = playing ? after : nil
            position = seconds; duration = newDuration ?? duration
            if PlayedRules.isFinished(position: position, duration: duration, threshold: threshold) { finish(at: at, into: &changes) }
            if playing && at - lastReportAt >= reportEveryMillis { report(at: at, into: &changes) }
        case let .seek(seconds):
            report(at: at, into: &changes); before = nil
            position = max(0, min(seconds, duration ?? seconds)); report(at: at, into: &changes)
        case let .metadata(id, threshold):
            if subscriptionId != id { before = nil }; subscriptionId = id; self.threshold = threshold
        case let .remotePosition(seconds, listenedAt):
            before = nil; position = seconds; lastReportPosition = seconds; lastReportAt = listenedAt
        case let .speed(value): report(at: at, into: &changes); before = nil; speed = value
        case .externalPlayed: finished = true; report(at: at, into: &changes)
        case .ended: report(at: at, into: &changes); finish(at: at, into: &changes); playing = false; before = nil
        case .flush: report(at: at, into: &changes)
        }
        return changes
    }

    private mutating func report(at: Int64, into changes: inout [Change]) {
        if finished && pending.isEmpty { return }
        if abs(position - lastReportPosition) < 1 && pending.isEmpty { return }
        lastReportAt = at; lastReportPosition = position
        changes.append(finished ? .recordListening(amounts: pending) : .reportPosition(playlistId: playlistId,
            episodeId: episodeId, position: max(0, position), listenedAt: at, listening: pending.isEmpty ? nil : pending))
        pending = []
    }

    private mutating func finish(at: Int64, into changes: inout [Change]) {
        guard !finished else { return }
        report(at: at, into: &changes); finished = true
        changes.append(.markPlayed(episodeId: episodeId, source: .playback(playlistId: playlistId)))
    }
}
