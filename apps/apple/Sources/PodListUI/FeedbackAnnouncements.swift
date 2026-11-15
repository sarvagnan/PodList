import Foundation
#if os(macOS)
import AppKit
#endif

/// The model owns announcements, so multiple windows and feedback rows never
/// announce the same update independently. Nil starts a fresh feedback cycle.
@MainActor
final class FeedbackAnnouncements {
    var post: @MainActor (String, Bool) -> Void = { message, isError in
        #if os(macOS)
        NSAccessibility.post(element: NSApplication.shared, notification: .announcementRequested,
                             userInfo: [.announcement: message,
                                        .priority: (isError ? NSAccessibilityPriorityLevel.high : .medium).rawValue])
        #endif
    }
    private var lastMessage: String?
    private var lastWasError = false

    func status(_ message: String?) {
        // Each model notice is a distinct operation, even when its wording repeats.
        lastMessage = nil
        announce(message, isError: false)
    }
    func error(_ message: String?) { announce(message, isError: true) }

    private func announce(_ message: String?, isError: Bool) {
        guard let message, !message.isEmpty else { lastMessage = nil; return }
        guard lastMessage != message || lastWasError != isError else { return }
        lastMessage = message; lastWasError = isError
        post(message, isError)
    }
}
