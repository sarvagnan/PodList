#if os(macOS)
import SwiftUI

extension EnvironmentValues {
    /// Playback recovery is already indexed in Controls, including both player surfaces.
    @Entry var podListRecoveryIndexed = false
}

enum FocusedRecoveryActions {
    static func context(enabled: Bool, title: String = "Retry Failed Operation", retry: @escaping () -> Void) -> MenuActionContext {
        MenuActionContext(actions: enabled ? [.retry: retry] : [:], retryTitle: title)
    }
}

/// Publish only an available recovery. An idle status bar must not mask another
/// failure in the same window; focus on a failure takes precedence over the fallback.
struct FocusedRetry: ViewModifier {
    var action: (() -> Void)?
    var title = "Retry Last Edit"
    @ViewBuilder func body(content: Content) -> some SwiftUI.View {
        if let action {
            let context = FocusedRecoveryActions.context(enabled: true, title: title, retry: action)
            content.focusedValue(\.podListRecoveryActions, context)
                .focusedSceneValue(\.podListRecoveryActions, context)
        } else { content }
    }
}

/// Operation failures share a single recovery verb; glass uses primary text for legibility.
struct FailureFeedback: SwiftUI.View {
    let message: String
    var onGlass = false
    var announcements: FeedbackAnnouncements? = nil
    var indexedElsewhere = false
    var retryTitle = "Retry Failed Operation"
    let retry: () -> Void
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.podListRecoveryIndexed) private var recoveryIndexed

    @ViewBuilder
    var body: some SwiftUI.View {
        if indexedElsewhere || recoveryIndexed { feedback }
        else {
            feedback.modifier(FocusedRetry(action: isEnabled ? { announcements?.error(nil); retry() } : nil, title: retryTitle))
        }
    }
    private var feedback: some SwiftUI.View {
        HStack {
            Text(message).foregroundStyle(onGlass ? Color.primary : Color.podListError)
                .fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
            Button("Retry") { announcements?.error(nil); retry() }
        }
        .onChange(of: message, initial: true) { _, message in announcements?.error(message) }
    }
}
#endif
