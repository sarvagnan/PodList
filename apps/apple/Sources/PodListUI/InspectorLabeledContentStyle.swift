#if os(macOS)
import SwiftUI

/// Both halves carry information; secondary styling loses contrast on the
/// system Inspector's tinted material.
struct InspectorLabeledContentStyle: LabeledContentStyle {
    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        HStack(alignment: .firstTextBaseline) {
            configuration.label
            Spacer()
            configuration.content.multilineTextAlignment(.trailing)
        }.foregroundStyle(.primary)
    }
}
#endif
