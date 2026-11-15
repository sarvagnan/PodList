/// Validation stays quiet until input changes or submission is attempted.
/// Unchanged text-field commits (including Cancel) do not count as an edit.
struct FormValidationVisibility {
    private(set) var interacted = false
    mutating func edited(from previous: String, to next: String) {
        if previous != next { interacted = true }
    }
    mutating func submitted() { interacted = true }
    func message(_ problem: String?) -> String? { interacted ? problem : nil }
}
