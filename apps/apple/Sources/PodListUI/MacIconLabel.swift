#if os(macOS)
import SwiftUI

/// Expand the button's label (and therefore its hit region) without enlarging the glyph.
struct MacIconLabel: SwiftUI.View {
    let title: String
    let systemImage: String

    var body: some SwiftUI.View {
        Label(title, systemImage: systemImage)
            .labelStyle(.iconOnly)
            .frame(width: 28, height: 28)
            .contentShape(Rectangle())
    }
}
#endif
