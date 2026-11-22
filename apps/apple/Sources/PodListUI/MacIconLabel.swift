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
            .modifier(MacButtonShape(cornerRadius: 6))
    }
}

struct MacButtonShape: ViewModifier {
    @Environment(\.accessibilityShowButtonShapes) private var showButtonShapes
    let cornerRadius: CGFloat
    var outset: CGFloat = 0

    func body(content: Content) -> some SwiftUI.View {
        content.overlay {
            if showButtonShapes {
                RoundedRectangle(cornerRadius: cornerRadius)
                    .strokeBorder(.foreground.opacity(0.55), lineWidth: 1)
                    .padding(-outset)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
        }
    }
}
#endif
