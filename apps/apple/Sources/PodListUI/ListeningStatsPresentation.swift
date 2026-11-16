import Foundation

/// Keep short listening sessions visible in the totals and on the chart alike.
enum ListeningStatsPresentation {
    static func time(_ seconds: Double) -> String {
        guard seconds > 0 else { return CountText.format(0, .second) }
        if seconds < 60 { return CountText.seconds(max(0.1, (seconds * 10).rounded() / 10)) }
        return Presentation.time(seconds.rounded())
    }
    static func usesSeconds(_ dailySeconds: [Double]) -> Bool {
        (dailySeconds.max() ?? 0) < 60
    }
}
