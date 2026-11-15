import Foundation

/// Counted UI phrases use locale plural rules rather than appending an English “s”.
enum CountText {
    enum Kind: String, CaseIterable {
        case episode, matchingEpisode, entry, playlist, view, subscription
        case day, second, result, podcast, download, position
    }

    static func seconds(_ count: Double) -> String {
        let template = NSLocalizedString("count.fractionalSecond", bundle: .module, comment: "Seconds, including fractional durations")
        return String.localizedStringWithFormat(template, count)
    }

    static func format(_ count: some BinaryInteger, _ kind: Kind) -> String {
        let template = NSLocalizedString("count.\(kind.rawValue)", bundle: .module, comment: "Counted library item or duration")
        return String.localizedStringWithFormat(template, Int64(count))
    }
}
