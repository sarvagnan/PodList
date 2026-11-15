import Foundation

/// Success and cancellation feedback is transient; errors and Undo history are separate.
struct EditingNotice {
    let id = UUID()
    let message: String
    let expiresAt: Date

    init(_ message: String, at now: Date = .now) {
        self.message = message
        expiresAt = now.addingTimeInterval(5)
    }
}

/// A new feedback row must not inherit a notice from another screen or sheet.
struct EditingFeedbackLifetime {
    private let initialNoticeID: UUID?

    init(currentNotice: EditingNotice?) {
        initialNoticeID = currentNotice?.id
    }

    func message(for notice: EditingNotice?, at now: Date) -> String? {
        guard let notice, notice.id != initialNoticeID, now < notice.expiresAt else { return nil }
        return notice.message
    }
}
