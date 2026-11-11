import Foundation

public struct ListeningStats: Sendable {
    public struct Total: Sendable { public let name: String; public let seconds: Double; public let finished: Int }
    public struct Day: Identifiable, Sendable { public let date: Date; public let seconds: Double; public var id: Date { date } }
    public let totals: [Total]
    public let days: [Day]
    public let streak: Int
    public let podcasts: [(id: String, seconds: Double)]
    public init(log: ListeningLog, played: [Played], now: Date = Date(), timeZone: TimeZone = .current) {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = timeZone; calendar.firstWeekday = 2
        let today = calendar.startOfDay(for: now)
        func day(_ date: Date) -> String {
            let c = calendar.dateComponents([.year, .month, .day], from: date)
            return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
        }
        let todayKey = day(today)
        let monday = calendar.date(byAdding: .day, value: -((calendar.component(.weekday, from: today) + 5) % 7), to: today)!
        let month = calendar.date(from: calendar.dateComponents([.year, .month], from: today))!
        totals = [("This week", Optional(monday)), ("This month", Optional(month)), ("All time", nil)].map { name, start in
            let startKey = start.map(day)
            let seconds = log.filter { startKey == nil || ($0.key >= startKey! && $0.key <= todayKey) }.values.reduce(0) { $0 + $1.values.reduce(0, +) }
            let finished = played.filter { fact in
                guard case .playback = fact.source else { return false }
                let date = Date(timeIntervalSince1970: Double(fact.at) / 1000)
                return date <= now && (start == nil || date >= start!)
            }.count
            return Total(name: name, seconds: seconds, finished: finished)
        }
        func seconds(_ date: Date) -> Double { log[day(date)]?.values.reduce(0, +) ?? 0 }
        days = (0..<30).reversed().map { offset in let date = calendar.date(byAdding: .day, value: -offset, to: today)!; return Day(date: date, seconds: seconds(date)) }
        var cursor = seconds(today) > 0 ? today : calendar.date(byAdding: .day, value: -1, to: today)!
        var length = 0
        while seconds(cursor) > 0 { length += 1; cursor = calendar.date(byAdding: .day, value: -1, to: cursor)! }
        streak = length
        var amounts: [String: Double] = [:]
        for values in log.values { for (id, amount) in values { amounts[id, default: 0] += amount } }
        podcasts = amounts.filter { $0.value > 0 }.map { (id: $0.key, seconds: $0.value) }.sorted { $0.seconds == $1.seconds ? $0.id < $1.id : $0.seconds > $1.seconds }
    }
}
