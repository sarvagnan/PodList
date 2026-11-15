#if os(macOS)
import SwiftUI

/// Keep field labels subordinate to values without losing reading contrast on
/// the system Inspector’s tinted material.
struct InspectorLabeledContentStyle: LabeledContentStyle {
    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        HStack(alignment: .firstTextBaseline) {
            configuration.label.foregroundStyle(MacReadableSecondaryStyle())
            Spacer()
            configuration.content.multilineTextAlignment(.trailing)
        }.foregroundStyle(.primary)
    }
}
#endif
