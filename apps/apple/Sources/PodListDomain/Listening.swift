import Foundation

public struct ListeningAmount: Codable, Equatable, Sendable {
    public var day: String
    public var subscriptionId: String
    public var seconds: Double

    public init(day: String, subscriptionId: String, seconds: Double) {
        self.day = day
        self.subscriptionId = subscriptionId
        self.seconds = seconds
    }
}

public enum Listening {
    public struct Sample: Equatable, Sendable {
        public var at: Double
        public var position: Double
        public init(at: Double, position: Double) { self.at = at; self.position = position }
    }
    public struct Measured: Equatable, Sendable {
        public var day: String
        public var seconds: Double
    }

    public static func sample(before: Sample?, after: Sample, speed: Double, offsetMinutes: Int) -> [Measured] {
        guard let before, speed > 0 else { return [] }
        let elapsed = (after.at - before.at) / 1000
        let progress = (after.position - before.position) / speed
        guard elapsed > 0, elapsed <= 30, progress > 0, progress <= elapsed + 1 else { return [] }
        let seconds = min(elapsed, progress)
        guard seconds.isFinite else { return [] }
        let offset = Double(offsetMinutes) * 60_000
        let start = after.at - seconds * 1000
        let midnight = (floor((start - offset) / 86_400_000) + 1) * 86_400_000 + offset
        func day(_ at: Double) -> String {
            let date = Date(timeIntervalSince1970: floor(at - offset) / 1000)
            let calendar = Calendar(identifier: .gregorian)
            var utc = calendar; utc.timeZone = TimeZone(secondsFromGMT: 0)!
            let c = utc.dateComponents([.year, .month, .day], from: date)
            return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
        }
        if midnight >= after.at { return [Measured(day: day(start), seconds: seconds)] }
        return [Measured(day: day(start), seconds: (midnight - start) / 1000),
                Measured(day: day(after.at), seconds: (after.at - midnight) / 1000)]
    }

    public static func add(_ log: ListeningLog, amounts: [ListeningAmount]) -> ListeningLog {
        var next = log
        for amount in amounts { next[amount.day, default: [:]][amount.subscriptionId, default: 0] += amount.seconds }
        return next
    }
}
