import Foundation

/// Parse the whole draft, using the same locale as the displayed number. Keep the
/// string in the editor so incomplete and invalid input is never replaced by zero.
enum FormNumbers {
    static func nonnegative(_ text: String, locale: Locale) -> Double? {
        let raw = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let style = FloatingPointFormatStyle<Double>.number.locale(locale).grouping(.never)
        guard let match = raw.wholeMatch(of: style), match.output.isFinite, match.output >= 0 else { return nil }
        return match.output
    }

    static func positiveCount(_ text: String, locale: Locale) -> Int64? {
        let raw = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let style = IntegerFormatStyle<Int64>.number.locale(locale).grouping(.never)
        guard !raw.isEmpty, raw.allSatisfy({ $0.isNumber }),
              let match = raw.wholeMatch(of: style), match.output > 0 else { return nil }
        return match.output
    }

    static func lastDays(_ text: String, locale: Locale) -> Int64? {
        guard let days = positiveCount(text, locale: locale), days <= 3650 else { return nil }
        return days
    }

    static func lastDaysProblem(_ text: String, locale: Locale) -> String? {
        lastDays(text, locale: locale) == nil ? "Last days must be a whole number from 1 to 3650." : nil
    }

    static func seekPosition(_ text: String, duration: Double?, locale: Locale) -> Double? {
        guard let duration, duration.isFinite, duration > 0,
              let seconds = nonnegative(text, locale: locale), seconds <= duration else { return nil }
        return seconds
    }

    static func seekProblem(_ text: String, duration: Double?, locale: Locale) -> String? {
        guard seekPosition(text, duration: duration, locale: locale) == nil else { return nil }
        guard let duration, duration.isFinite, duration > 0 else { return "The Episode duration is unavailable." }
        return "Enter a time from 0:00 to \(Presentation.time(duration)) (in seconds)."
    }

    static func countProblem(_ text: String, locale: Locale) -> String? {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return positiveCount(text, locale: locale) == nil ? "Episodes to show must be a positive whole number." : nil
    }

    static func string(_ value: Double, locale: Locale) -> String {
        value.formatted(.number.locale(locale).grouping(.never).precision(.significantDigits(1...17)))
    }

    static func minutesProblem(_ text: String, label: String, locale: Locale) -> String? {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        guard seconds(fromMinutes: text, locale: locale) != nil else {
            return "\(label) must be a nonnegative number of minutes."
        }
        return nil
    }

    static func seconds(fromMinutes text: String, locale: Locale) -> Double? {
        guard let number = nonnegative(text, locale: locale), (number * 60).isFinite else { return nil }
        return number * 60
    }
}
