#if os(macOS)
import SwiftUI

/// Operation failures share a single recovery verb; glass uses primary text for legibility.
struct FailureFeedback: SwiftUI.View {
    let message: String
    var onGlass = false
    var announcements: FeedbackAnnouncements? = nil
    let retry: () -> Void

    var body: some SwiftUI.View {
        HStack {
            Text(message).foregroundStyle(onGlass ? Color.primary : Color.podListError)
                .fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
            Button("Retry") { announcements?.error(nil); retry() }
        }
        .onChange(of: message, initial: true) { _, message in announcements?.error(message) }
    }
}
#endif
