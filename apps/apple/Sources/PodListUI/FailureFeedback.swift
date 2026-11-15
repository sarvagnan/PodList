#if os(macOS)
import SwiftUI

/// Operation failures share a single recovery verb; glass uses primary text for legibility.
struct FailureFeedback: SwiftUI.View {
    let message: String
    var onGlass = false
    let retry: () -> Void

    var body: some SwiftUI.View {
        HStack {
            Text(message).foregroundStyle(onGlass ? Color.primary : Color.red)
                .fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
            Button("Retry", action: retry)
        }
    }
}
#endif
