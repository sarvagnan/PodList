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

    static func countProblem(_ text: String, locale: Locale) -> String? {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return positiveCount(text, locale: locale) == nil ? "Episodes to Show must be a positive whole number." : nil
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
