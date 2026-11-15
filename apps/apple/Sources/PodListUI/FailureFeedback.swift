#if os(macOS)
import SwiftUI

/// Operation failures share a colour and a single recovery verb.
struct FailureFeedback: SwiftUI.View {
    let message: String
    let retry: () -> Void

    var body: some SwiftUI.View {
        HStack {
            Text(message).foregroundStyle(.red)
                .fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
            Button("Retry", action: retry)
        }
    }
}
#endif
