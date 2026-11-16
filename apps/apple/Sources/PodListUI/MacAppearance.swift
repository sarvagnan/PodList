#if os(macOS)
import AppKit
import Combine
import SwiftUI

public extension Color {
    /// Identity only: artwork placeholders and the Welcome mark. Controls use the
    /// system accent; the app bundle supplies the Multicolor accent asset.
    /// See AppearanceTests and docs/ui-grade/mac-appearance.md.
    static let podListBrand = Color(nsColor: NSColor(name: "PodList Brand") { appearance in
        MacBrandPalette.color(for: appearance.bestMatch(from: [.accessibilityHighContrastDarkAqua, .accessibilityHighContrastAqua, .darkAqua, .aqua]))
    })

    /// System red is too light for regular-sized error text in Aqua. Keep
    /// errors red with opaque, appearance-specific foregrounds on reading surfaces.
    static let podListError = Color(nsColor: NSColor(name: "PodList Error") { appearance in
        MacErrorPalette.color(for: appearance.bestMatch(from: [.accessibilityHighContrastDarkAqua, .accessibilityHighContrastAqua, .darkAqua, .aqua]))
    })

    static let podListReadableSecondary = Color(nsColor: NSColor(name: "PodList Readable Secondary") { appearance in
        MacSecondaryPalette.color(for: appearance.bestMatch(from: [.accessibilityHighContrastDarkAqua, .accessibilityHighContrastAqua, .darkAqua, .aqua]))
    })
}

enum MacSecondaryPalette {
    static func color(for appearance: NSAppearance.Name?) -> NSColor {
        let value: CGFloat
        switch appearance {
        case .accessibilityHighContrastDarkAqua: value = 192 / 255 // #C0C0C0
        case .accessibilityHighContrastAqua: value = 80 / 255 // #505050
        case .darkAqua: value = 160 / 255 // #A0A0A0
        default: value = 96 / 255 // #606060
        }
        return NSColor(srgbRed: value, green: value, blue: value, alpha: 1)
    }
}

/// Native Sidebar typography and spacing, with opaque readable secondary ink.
struct MacSidebarSectionHeader: SwiftUI.View {
    let title: String
    init(_ title: String) { self.title = title }
    var body: some SwiftUI.View {
        Text(title).foregroundStyle(MacReadableSecondaryStyle())
    }
}

/// Secondary reading text on ordinary surfaces. Selections use the inherited
/// foreground, including inactive selections whose gray fill needs primary text.
struct MacReadableSecondaryStyle: ShapeStyle {
    var isSelected = false
    func resolve(in environment: EnvironmentValues) -> AnyShapeStyle {
        isSelected || environment.backgroundProminence == .increased
            ? AnyShapeStyle(.primary)
            : AnyShapeStyle(Color.podListReadableSecondary)
    }
}

extension SwiftUI.View {
    /// Keep native default-button interaction and readable labels for pale accents.
    func macDefaultAction() -> some SwiftUI.View {
        keyboardShortcut(.defaultAction).buttonStyle(MacDefaultButtonStyle())
    }
}

/// Native chrome and keyboard behavior, with a contrast-safe enabled label.
/// User-chosen pale system accents can make native white default labels unreadable.
struct MacDefaultButtonStyle: PrimitiveButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        Group {
            if isEnabled {
                Button(role: configuration.role, action: configuration.trigger) {
                    configuration.label.foregroundStyle(MacOnAccentStyle())
                }.buttonStyle(.borderedProminent)
            } else {
                Button(configuration).buttonStyle(.borderedProminent)
            }
        }
        // Clear the neutral tint of an enclosing glass footer; use the same
        // system accent for the native fill and the label contrast decision.
        .tint(nil)
    }
}

struct MacOnAccentStyle: ShapeStyle {
    func resolve(in environment: EnvironmentValues) -> Color {
        let accent = Color.accentColor.resolve(in: environment)
        let black = Color.black.resolve(in: environment), white = Color.white.resolve(in: environment)
        return MacAccentContrast.ratio(accent, black) >= MacAccentContrast.ratio(accent, white) ? .black : .white
    }
}

enum MacBrandPalette {
    static func color(for appearance: NSAppearance.Name?) -> NSColor {
        switch appearance {
        case .accessibilityHighContrastDarkAqua: return NSColor(srgbRed: 178 / 255, green: 193 / 255, blue: 1, alpha: 1) // #B2C1FF
        case .accessibilityHighContrastAqua: return NSColor(srgbRed: 25 / 255, green: 58 / 255, blue: 155 / 255, alpha: 1) // #193A9B
        case .darkAqua: return NSColor(srgbRed: 157 / 255, green: 177 / 255, blue: 1, alpha: 1) // #9DB1FF
        default: return NSColor(srgbRed: 43 / 255, green: 80 / 255, blue: 200 / 255, alpha: 1) // #2B50C8
        }
    }
}

enum MacErrorPalette {
    static func color(for appearance: NSAppearance.Name?) -> NSColor {
        switch appearance {
        case .accessibilityHighContrastDarkAqua: return NSColor(srgbRed: 1, green: 0.72, blue: 0.73, alpha: 1)
        case .accessibilityHighContrastAqua: return NSColor(srgbRed: 0.6, green: 0.06, blue: 0.08, alpha: 1)
        case .darkAqua: return NSColor(srgbRed: 1, green: 159 / 255, blue: 161 / 255, alpha: 1) // #FF9FA1
        default: return NSColor(srgbRed: 185 / 255, green: 28 / 255, blue: 28 / 255, alpha: 1) // #B91C1C
        }
    }
}

/// Accent text and symbols must also work with pale system accents (e.g. Yellow).
/// Native controls own their contrast; custom foregrounds use primary when the
/// accent cannot reach 4.5:1 on ordinary or inactive-selection reading surfaces.
enum MacAccentContrast {
    static func ratio(_ first: Color.Resolved, _ second: Color.Resolved) -> Double {
        func luminance(_ color: Color.Resolved) -> Double {
            func linear(_ component: Float) -> Double {
                let value = Double(component)
                return value <= 0.04045 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4)
            }
            return 0.2126 * linear(color.red) + 0.7152 * linear(color.green) + 0.0722 * linear(color.blue)
        }
        let a = luminance(first), b = luminance(second)
        return (max(a, b) + 0.05) / (min(a, b) + 0.05)
    }

    static func needsPrimary(_ accent: Color.Resolved, on surfaces: [Color.Resolved]) -> Bool {
        accent.opacity < 1 || surfaces.contains { ratio(accent, $0) < 4.5 }
    }
}

struct MacAccentForegroundStyle: ShapeStyle {
    func resolve(in environment: EnvironmentValues) -> AnyShapeStyle {
        let surfaces: [NSColor] = [.windowBackgroundColor, .underPageBackgroundColor, .unemphasizedSelectedContentBackgroundColor]
        let needsPrimary = MacAccentContrast.needsPrimary(Color.accentColor.resolve(in: environment),
            on: surfaces.map { Color(nsColor: $0).resolve(in: environment) })
        return needsPrimary ? AnyShapeStyle(.primary) : AnyShapeStyle(Color.accentColor)
    }
}

/// Native keyboard interaction, with an underlined, contrast-safe link label.
/// The system .link style uses a separate link color rather than our readable accent.
struct MacReadableLinkStyle: PrimitiveButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some SwiftUI.View {
        Button(role: configuration.role, action: configuration.trigger) {
            configuration.label
                .foregroundStyle(isEnabled ? AnyShapeStyle(MacAccentForegroundStyle()) : AnyShapeStyle(.tertiary))
                .underline()
        }.buttonStyle(.plain)
    }
}

/// Resolve inside each row so emphasized selections inherit SwiftUI's foreground.
struct MacRowAccentStyle: ShapeStyle {
    func resolve(in environment: EnvironmentValues) -> AnyShapeStyle {
        environment.backgroundProminence == .increased
            ? AnyShapeStyle(.primary)
            : AnyShapeStyle(MacAccentForegroundStyle())
    }
}

/// Repeated row actions stay quiet until the pointer or selection reaches the row.
private struct MacRowActionsActiveKey: EnvironmentKey {
    static let defaultValue = false
}

struct MacRowActionStyle: ShapeStyle {
    func resolve(in environment: EnvironmentValues) -> AnyShapeStyle {
        environment[MacRowActionsActiveKey.self]
            ? AnyShapeStyle(MacRowAccentStyle())
            : AnyShapeStyle(MacReadableSecondaryStyle())
    }
}

extension SwiftUI.View {
    func macRowActions(isSelected: Bool) -> some SwiftUI.View {
        modifier(MacRowActions(isSelected: isSelected))
    }
}

private struct MacRowActions: ViewModifier {
    let isSelected: Bool
    @State private var hovered = false
    @State private var nativeHovered = false
    func body(content: Content) -> some SwiftUI.View {
        content
            .transformEnvironment(\.self) { $0[MacRowActionsActiveKey.self] = isSelected || hovered || nativeHovered }
            .onHover { hovered = $0 }
            .background(MacRowHover { nativeHovered = $0 })
    }
}

/// The pointer can enter any table column, not just the title cell containing the
/// actions. Observe the native row without intercepting selection or button hits.
private struct MacRowHover: NSViewRepresentable {
    let changed: (Bool) -> Void
    func makeNSView(context: Context) -> Probe { Probe(changed: changed) }
    func updateNSView(_ view: Probe, context: Context) { view.changed = changed; view.refresh() }

    final class Probe: NSView {
        var changed: (Bool) -> Void
        private weak var row: NSTableRowView?
        private var area: NSTrackingArea?
        init(changed: @escaping (Bool) -> Void) { self.changed = changed; super.init(frame: .zero) }
        required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
        override func hitTest(_ point: NSPoint) -> NSView? { nil }
        override func viewDidMoveToWindow() { super.viewDidMoveToWindow(); refresh() }
        override func viewDidMoveToSuperview() { super.viewDidMoveToSuperview(); refresh() }
        override func updateTrackingAreas() { super.updateTrackingAreas(); refresh() }
        func refresh() {
            var ancestor = superview
            while ancestor != nil && !(ancestor is NSTableRowView) { ancestor = ancestor?.superview }
            let next = window == nil ? nil : ancestor as? NSTableRowView
            guard next !== row else { return }
            if let row, let area { row.removeTrackingArea(area) }
            row = next; area = nil
            if let row {
                let tracking = NSTrackingArea(rect: .zero, options: [.mouseEnteredAndExited, .activeInKeyWindow, .inVisibleRect], owner: self, userInfo: nil)
                row.addTrackingArea(tracking); area = tracking
            }
            let inside = row.flatMap { row in window.map { row.visibleRect.contains(row.convert($0.mouseLocationOutsideOfEventStream, from: nil)) } } ?? false
            DispatchQueue.main.async { [weak self] in self?.changed(inside) }
        }
        override func mouseEntered(with event: NSEvent) { changed(true) }
        override func mouseExited(with event: NSEvent) { changed(false) }
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
