#if os(macOS)
import AppKit
import Combine
import SwiftUI

public extension Color {
    /// The brand blue in Light, with readable foreground variants for Dark and
    /// Increase Contrast. See AppearanceTests and docs/ui-grade/mac-appearance.md.
    static let podListAccent = Color(nsColor: NSColor(name: "PodList Accent") { appearance in
        MacAccentPalette.color(for: appearance.bestMatch(from: [.accessibilityHighContrastDarkAqua, .accessibilityHighContrastAqua, .darkAqua, .aqua]))
    })

    /// Custom accent-filled controls need a dark glyph on the light Dark accent.
    static let podListOnAccent = Color(nsColor: NSColor(name: "PodList On Accent") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(srgbRed: 17 / 255, green: 24 / 255, blue: 39 / 255, alpha: 1)
            : .white
    })
}

enum MacAccentPalette {
    static func color(for appearance: NSAppearance.Name?) -> NSColor {
        switch appearance {
        case .accessibilityHighContrastDarkAqua: return NSColor(srgbRed: 178 / 255, green: 193 / 255, blue: 1, alpha: 1) // #B2C1FF
        case .accessibilityHighContrastAqua: return NSColor(srgbRed: 25 / 255, green: 58 / 255, blue: 155 / 255, alpha: 1) // #193A9B
        case .darkAqua: return NSColor(srgbRed: 157 / 255, green: 177 / 255, blue: 1, alpha: 1) // #9DB1FF
        default: return NSColor(srgbRed: 43 / 255, green: 80 / 255, blue: 200 / 255, alpha: 1) // #2B50C8
        }
    }
}

/// Read prominence inside each row, rather than at the enclosing List / Table.
/// Primary inherits the selection foreground supplied by SwiftUI; an inactive
/// selection keeps the dynamic accent, which contrasts with its neutral fill.
struct MacRowAccentStyle: ShapeStyle {
    func resolve(in environment: EnvironmentValues) -> AnyShapeStyle {
        environment.backgroundProminence == .increased
            ? AnyShapeStyle(.primary)
            : AnyShapeStyle(Color.podListAccent)
    }
}

/// One app-scoped override, inherited by every window, sheet and Settings pane.
/// A nil appearance leaves macOS in charge, including live System changes and
/// the accessibility contrast variants of Aqua / Dark Aqua.
@MainActor public final class MacAppearanceController {
    private let defaults: UserDefaults
    private let apply: @MainActor (NSAppearance?) -> Void
    private var changes: AnyCancellable?
    private var lastChoice: String?

    public convenience init(defaults: UserDefaults = .standard) {
        self.init(defaults: defaults) { NSApplication.shared.appearance = $0 }
    }

    init(defaults: UserDefaults, apply: @escaping @MainActor (NSAppearance?) -> Void) {
        self.defaults = defaults
        self.apply = apply
        update()
        changes = NotificationCenter.default.publisher(for: UserDefaults.didChangeNotification, object: defaults)
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in self?.update() }
            }
    }

    private func update() {
        let choice = defaults.string(forKey: "PodList.appearance") ?? "System"
        guard choice != lastChoice else { return }
        lastChoice = choice
        switch choice {
        case "Light": apply(NSAppearance(named: .aqua))
        case "Dark": apply(NSAppearance(named: .darkAqua))
        default: apply(nil)
        }
    }
}
#endif
