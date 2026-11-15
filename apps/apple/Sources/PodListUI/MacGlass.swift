#if os(macOS)
import SwiftUI

/// Glass belongs to the control layer, never to Episode rows or show notes.
/// Use semantic foregrounds on these untinted surfaces: wallpaper-dependent glass
/// isn't one of the known backgrounds against which the brand blue is measured.
private struct MacGlassSurfaceEnvironment: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.colorSchemeContrast) private var contrast
    let cornerRadius: CGFloat

    func body(content: Content) -> some SwiftUI.View {
        content.modifier(MacGlassSurface(cornerRadius: cornerRadius, reduceTransparency: reduceTransparency, contrast: contrast))
    }
}

/// Separate rendering from the read-only system environment so opaque modes can
/// be pixel-tested headlessly without changing the user's accessibility settings.
struct MacGlassSurface: ViewModifier {
    let cornerRadius: CGFloat
    let reduceTransparency: Bool
    let contrast: ColorSchemeContrast

    func body(content: Content) -> some SwiftUI.View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius)
        Group {
            if reduceTransparency || contrast == .increased {
                content
                    .background(Color(nsColor: .windowBackgroundColor), in: shape)
                    .overlay {
                        shape.strokeBorder(.primary.opacity(contrast == .increased ? 0.6 : 0.2), lineWidth: 1)
                            .allowsHitTesting(false).accessibilityHidden(true)
                    }
            } else {
                content.glassEffect(.regular, in: shape)
            }
        }
        .foregroundStyle(.primary)
        .tint(.primary)
    }
}

extension SwiftUI.View {
    /// Apply after padding and layout, so the effect covers the full control surface.
    func macGlassSurface(cornerRadius: CGFloat = 16) -> some SwiftUI.View {
        modifier(MacGlassSurfaceEnvironment(cornerRadius: cornerRadius))
    }
}

/// Keep native button interaction and accessibility, including in the opaque mode.
struct MacGlassButtonStyle: PrimitiveButtonStyle {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.colorSchemeContrast) private var contrast

    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        if reduceTransparency || contrast == .increased {
            Button(configuration).buttonStyle(.bordered)
        } else {
            Button(configuration).buttonStyle(.glass)
        }
    }
}
#endif
