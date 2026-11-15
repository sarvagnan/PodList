#if os(macOS)
import AppKit
import SwiftUI
import Testing
@testable import PodListUI

/// WCAG relative luminance in sRGB, including compositing semantic text colours.
private struct RGB {
    let r: Double, g: Double, b: Double
    init(_ hex: Int) {
        r = Double((hex >> 16) & 255) / 255
        g = Double((hex >> 8) & 255) / 255
        b = Double(hex & 255) / 255
    }
    init(_ color: NSColor, over background: RGB) {
        let color = color.usingColorSpace(.sRGB)!
        let a = color.alphaComponent
        r = color.redComponent * a + background.r * (1 - a)
        g = color.greenComponent * a + background.g * (1 - a)
        b = color.blueComponent * a + background.b * (1 - a)
    }
    var luminance: Double {
        func linear(_ v: Double) -> Double { v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
        return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
    }
    func contrast(_ other: RGB) -> Double {
        (max(luminance, other.luminance) + 0.05) / (min(luminance, other.luminance) + 0.05)
    }
    func isClose(to other: RGB) -> Bool {
        abs(r - other.r) < 0.0001 && abs(g - other.g) < 0.0001 && abs(b - other.b) < 0.0001
    }
}

@Test @MainActor func dynamicAccentTracksTheDrawingAppearance() {
    // AppKit's accessibility appearance names are bestMatch targets, not a way
    // to force Increase Contrast with NSAppearance(named:). Check the provider
    // against the actual match so this test also works with Increase Contrast on.
    let matches: [NSAppearance.Name] = [.accessibilityHighContrastDarkAqua, .accessibilityHighContrastAqua, .darkAqua, .aqua]
    for name in [NSAppearance.Name.aqua, .darkAqua] {
        let appearance = NSAppearance(named: name)!
        appearance.performAsCurrentDrawingAppearance {
            let expected = MacAccentPalette.color(for: appearance.bestMatch(from: matches))
            let actual = RGB(NSColor(Color.podListAccent), over: RGB(0))
            #expect(actual.isClose(to: RGB(expected, over: RGB(0))))
        }
    }
}

@Test @MainActor func darkAccentContrastsWithSystemAndAuditedSurfaces() {
    // AppKit macOS 26 sRGB colours, plus composited surfaces sampled in round 1.
    // Materials vary with the wallpaper; retain the audit's tinted samples as
    // well as semantic colours. Emphasised selections use the selection foreground.
    let documentedSurfaces: [(String, Int)] = [
        ("window / control", 0x1E1E1E), ("under-page", 0x282828),
        ("inactive selected row", 0x464646),
        ("sidebar", 0x222B38), ("Inspector", 0x212931), ("row / player", 0x212427),
        ("sheet", 0x22262F)
    ]
    for name in [NSAppearance.Name.darkAqua, .accessibilityHighContrastDarkAqua] {
        NSAppearance(named: name)!.performAsCurrentDrawingAppearance {
            let accent = RGB(MacAccentPalette.color(for: name), over: RGB(0))
            #expect(accent.contrast(RGB(0xFFFFFF)) >= 1.6, "Dark accent must remain distinct from white primary text")
            for (label, hex) in documentedSurfaces {
                #expect(accent.contrast(RGB(hex)) >= 4.5, "\(name.rawValue): \(label)")
            }
            let systemSurfaces: [(String, NSColor)] = [
                ("window", .windowBackgroundColor), ("control / sheet", .controlBackgroundColor),
                ("under-page", .underPageBackgroundColor),
                ("inactive selected row", .unemphasizedSelectedContentBackgroundColor)
            ]
            for (label, color) in systemSurfaces {
                #expect(accent.contrast(RGB(color, over: RGB(0))) >= 4.5, "\(name.rawValue): \(label)")
            }
        }
    }
}

@Test @MainActor func accentResolvesAllFourVariantsAndKeepsArtworkAndPlayGlyphReadable() {
    let variants: [(NSAppearance.Name, Int)] = [
        (.aqua, 0x2B50C8), (.darkAqua, 0x9DB1FF),
        (.accessibilityHighContrastAqua, 0x193A9B), (.accessibilityHighContrastDarkAqua, 0xB2C1FF)
    ]
    for (name, hex) in variants {
        NSAppearance(named: name)!.performAsCurrentDrawingAppearance {
            let color = MacAccentPalette.color(for: name)
            let accent = RGB(color, over: RGB(0))
            #expect(accent.isClose(to: RGB(hex)))
            let window = RGB(NSColor.windowBackgroundColor, over: RGB(0))
            let artwork = RGB(color.withAlphaComponent(0.12), over: window)
            #expect(accent.contrast(window) >= 4.5)
            #expect(accent.contrast(artwork) >= 4.5)
            #expect(accent.contrast(RGB(NSColor(Color.podListOnAccent), over: accent)) >= 4.5)
            if name == .aqua || name == .accessibilityHighContrastAqua {
                for hex in [0xFFFFFF, 0xF6F6F6, 0xDCDCDC] {
                    #expect(accent.contrast(RGB(hex)) >= 4.5)
                }
            }
        }
    }
    #expect(RGB(0x193A9B).luminance < RGB(0x2B50C8).luminance)
    #expect(RGB(0xB2C1FF).luminance > RGB(0x9DB1FF).luminance)
}

@Test @MainActor func rowAccentInheritsSelectionForegroundOnlyOnEmphasisedRows() {
    // Render the same ShapeStyle used by row labels, symbols and buttons without
    // a window or screen. Distinct supplied foregrounds catch hard-coded white.
    for name in [NSAppearance.Name.aqua, .darkAqua] {
        NSAppearance(named: name)!.performAsCurrentDrawingAppearance {
            for foreground in [Color.white, Color.green] {
                for prominence in [BackgroundProminence.standard, .increased] {
                    @MainActor func render(_ style: AnyShapeStyle) -> Data? {
                        let renderer = ImageRenderer(content: Rectangle()
                            .fill(style)
                            .foregroundStyle(foreground)
                            .environment(\.backgroundProminence, prominence)
                            .environment(\.colorScheme, name == .aqua ? .light : .dark)
                            .frame(width: 8, height: 8))
                        guard let image = renderer.cgImage else { return nil }
                        return NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
                    }
                    let actual = render(AnyShapeStyle(MacRowAccentStyle()))
                    let accent = render(AnyShapeStyle(Color.podListAccent))
                    let selected = render(AnyShapeStyle(foreground))
                    // Compare rendered pixels in the same output colour space.
                    #expect(actual != nil)
                    #expect(accent != selected)
                    #expect(actual == (prominence == .increased ? selected : accent))
                }
            }
        }
    }
}

@Test @MainActor func inspectorPrimaryTextContrastsWithAuditedTintedFill() {
    // Light: AppKit underPageBackgroundColor; Dark: round-1 Inspector sample.
    for (name, hex) in [(NSAppearance.Name.aqua, 0xF6F6F6), (.darkAqua, 0x212931)] {
        NSAppearance(named: name)!.performAsCurrentDrawingAppearance {
            let background = RGB(hex)
            #expect(RGB(NSColor.labelColor, over: background).contrast(background) >= 4.5)
        }
    }
}

@Test @MainActor func glassAccessibilityFallbackBlocksTheBackdropAndKeepsTextReadable() {
    for name in [NSAppearance.Name.aqua, .darkAqua] {
        NSAppearance(named: name)!.performAsCurrentDrawingAppearance {
            for (reduceTransparency, contrast) in [(true, ColorSchemeContrast.standard), (false, .increased), (true, .increased)] {
                var firstBackdrop: RGB?
                for backdrop in [Color.red, .green] {
                    let renderer = ImageRenderer(content: Color.clear.frame(width: 64, height: 64)
                        .modifier(MacGlassSurface(cornerRadius: 16, reduceTransparency: reduceTransparency, contrast: contrast))
                        .background(backdrop)
                        .environment(\.colorScheme, name == .aqua ? .light : .dark))
                    guard let image = renderer.cgImage else { Issue.record("No fallback image"); continue }
                    let bitmap = NSBitmapImageRep(cgImage: image)
                    guard let center = bitmap.colorAt(x: 32, y: 32) else { Issue.record("No center pixel"); continue }
                    #expect(center.alphaComponent == 1)
                    let actual = RGB(center, over: RGB(0))
                    // Semantic window colors can resolve to a different elevation
                    // in SwiftUI. Compare pixels across adversarial backdrops instead
                    // of comparing that composited color to an AppKit color swatch.
                    if let firstBackdrop { #expect(actual.isClose(to: firstBackdrop)) }
                    else { firstBackdrop = actual }
                    #expect(RGB(NSColor.labelColor, over: actual).contrast(actual) >= 4.5)
                }
            }
        }
    }
}

@Test @MainActor func appearanceObservesDefaultsForTheApplicationLifetimeAndClearsSystemOverride() async throws {
    let suite = "PodListAppearanceTests-\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite)!
    defer { defaults.removePersistentDomain(forName: suite) }
    defaults.set("Dark", forKey: "PodList.appearance")
    var applied: [NSAppearance.Name?] = []
    let controller = MacAppearanceController(defaults: defaults) { applied.append($0?.name) }
    #expect(applied == [.darkAqua]) // Applied before the first window is opened.
    for (choice, expected) in [("Light", NSAppearance.Name.aqua), ("Dark", .darkAqua)] {
        defaults.set(choice, forKey: "PodList.appearance")
        for _ in 0..<100 {
            if applied.last == expected { break }
            try await Task.sleep(for: .milliseconds(1))
        }
        #expect(applied.last == expected)
    }
    defaults.set("System", forKey: "PodList.appearance")
    for _ in 0..<100 {
        if applied.count == 4 { break }
        try await Task.sleep(for: .milliseconds(1))
    }
    #expect(applied.count == 4)
    #expect(applied.last == .some(nil)) // nil follows live macOS changes; no cached scheme.
    withExtendedLifetime(controller) {}
}
#endif

#if os(macOS)
@Test @MainActor func readableSecondaryRestoresHierarchyOnReadingSurfaces() {
    let variants: [(NSAppearance.Name, Int, [Int])] = [
        (.aqua, 0x606060, [0xFFFFFF, 0xF6F6F6]),
        (.darkAqua, 0xA0A0A0, [0x1E1E1E, 0x222222, 0x282828, 0x2F2D2B, 0x212931, 0x222B38]),
        (.accessibilityHighContrastAqua, 0x505050, [0xFFFFFF, 0xF6F6F6]),
        (.accessibilityHighContrastDarkAqua, 0xC0C0C0, [0x1E1E1E, 0x222222, 0x282828, 0x2F2D2B, 0x212931, 0x222B38])
    ]
    for (name, hex, surfaces) in variants {
        let secondary = RGB(MacSecondaryPalette.color(for: name), over: RGB(0))
        #expect(secondary.isClose(to: RGB(hex)))
        for surface in surfaces {
            let ratio = secondary.contrast(RGB(surface))
            #expect(ratio >= 4.5)
            if name == .aqua || name == .darkAqua {
                #expect(ratio >= 5 && ratio <= 7, "Keep a visible secondary level on #\(String(surface, radix: 16))")
            }
            print(String(format: "Readable secondary %@ #%06X on #%06X: %.2f", name.rawValue, hex, surface, ratio))
        }
    }
    for name in [NSAppearance.Name.aqua, .darkAqua] {
        let appearance = NSAppearance(named: name)!
        appearance.performAsCurrentDrawingAppearance {
            let matches: [NSAppearance.Name] = [.accessibilityHighContrastDarkAqua, .accessibilityHighContrastAqua, .darkAqua, .aqua]
            #expect(RGB(NSColor(Color.podListReadableSecondary), over: RGB(0)).isClose(to:
                RGB(MacSecondaryPalette.color(for: appearance.bestMatch(from: matches)), over: RGB(0))))
        }
    }
}

@Test @MainActor func readableSecondaryInheritsActiveAndInactiveSelectionForeground() {
    for name in [NSAppearance.Name.aqua, .darkAqua] {
        NSAppearance(named: name)!.performAsCurrentDrawingAppearance {
            for foreground in [Color.white, .green] {
                for prominence in [BackgroundProminence.standard, .increased] {
                    for selected in [false, true] {
                        @MainActor func render(_ style: AnyShapeStyle) -> Data? {
                            let renderer = ImageRenderer(content: Rectangle().fill(style)
                                .foregroundStyle(foreground)
                                .environment(\.backgroundProminence, prominence)
                                .environment(\.colorScheme, name == .aqua ? .light : .dark)
                                .frame(width: 8, height: 8))
                            return renderer.cgImage.flatMap { NSBitmapImageRep(cgImage: $0).representation(using: .png, properties: [:]) }
                        }
                        let actual = render(AnyShapeStyle(MacReadableSecondaryStyle(isSelected: selected)))
                        #expect(actual != nil)
                        #expect(actual == render(selected || prominence == .increased
                            ? AnyShapeStyle(foreground) : AnyShapeStyle(Color.podListReadableSecondary)))
                    }
                }
            }
            // Inactive selection explicitly switches to primary; the ordinary
            // Dark secondary token is not intended for #464646 selection fills.
            let background = RGB(name == .aqua ? 0xDCDCDC : 0x464646)
            #expect(RGB(NSColor.labelColor, over: background).contrast(background) >= 4.5)
        }
    }
}

@Test @MainActor func defaultActionsRenderReadableLabelsOnTheBrandFill() throws {
    for scheme in [ColorScheme.light, .dark] {
        for enabled in [true, false] {
            @MainActor func render(_ kind: Int) throws -> Data {
                let button = Button("Apply") {}
                let content = Group {
                    if kind == 0 { button.macDefaultAction() }
                    else if kind == 1 {
                        Button {} label: { Text("Apply").foregroundStyle(Color.podListOnAccent) }
                            .keyboardShortcut(.defaultAction).buttonStyle(.borderedProminent).tint(.podListAccent)
                    }
                    else { button.keyboardShortcut(.defaultAction) }
                }.tint(.podListAccent)
                    .environment(\.colorScheme, scheme)
                    .disabled(!enabled)
                    .padding(12)
                let bitmap = NSBitmapImageRep(cgImage: try #require(ImageRenderer(content: content).cgImage))
                return try #require(bitmap.representation(using: .png, properties: [:]))
            }
            let actual = try render(0)
            #expect(actual == (try render(1)))
            if enabled {
                if scheme == .dark {
                    #expect(actual != (try render(2)), "Dark default action must use its contrasting label")
                }
                let bitmap = try #require(NSBitmapImageRep(data: actual))
                var colors: [Int: Int] = [:]
                for y in 0..<bitmap.pixelsHigh { for x in 0..<bitmap.pixelsWide {
                    guard let color = bitmap.colorAt(x: x, y: y), color.alphaComponent == 1 else { continue }
                    let srgb = try #require(color.usingColorSpace(.sRGB))
                    let hex = Int((srgb.redComponent * 255).rounded()) << 16
                        | Int((srgb.greenComponent * 255).rounded()) << 8
                        | Int((srgb.blueComponent * 255).rounded())
                    colors[hex, default: 0] += 1
                } }
                let swatch = ImageRenderer(content: Rectangle().fill(Color.podListOnAccent)
                    .environment(\.colorScheme, scheme).frame(width: 8, height: 8))
                let swatchBitmap = NSBitmapImageRep(cgImage: try #require(swatch.cgImage))
                let glyph = try #require(swatchBitmap.colorAt(x: 4, y: 4)?.usingColorSpace(.sRGB))
                let glyphHex = Int((glyph.redComponent * 255).rounded()) << 16
                    | Int((glyph.greenComponent * 255).rounded()) << 8
                    | Int((glyph.blueComponent * 255).rounded())
                // Fully covered glyph interiors must actually carry on-accent;
                // checking palette tokens alone missed the native white label.
                #expect(colors[glyphHex, default: 0] >= 8)
                let fill = try #require(colors.max { $0.value < $1.value }?.key)
                let ratio = RGB(glyphHex).contrast(RGB(fill))
                #expect(ratio >= 4.5)
                print(String(format: "Rendered brand default %@: #%06X on #%06X, %.2f:1", String(describing: scheme), glyphHex, fill, ratio))
            }
        }
    }
}

@Test @MainActor func roundTwoErrorsAndSecondaryTextMeetContrastInBothAppearances() {
    for (name, surfaces) in [(NSAppearance.Name.aqua, [0xFFFFFF, 0xF6F6F6, 0xFFF5F5, 0xF5FCF7]),
                             (.darkAqua, [0x222222, 0x2F2D2B, 0x292726, 0x2F2424, 0x252B25, 0x464646])] {
        NSAppearance(named: name)!.performAsCurrentDrawingAppearance {
            for hex in surfaces {
                let background = RGB(hex)
                let error = RGB(NSColor(Color.podListError), over: background)
                let primary = RGB(NSColor.labelColor, over: background)
                #expect(error.contrast(background) >= 4.5, "Error on \(String(hex, radix: 16)) in \(name)")
                #expect(primary.contrast(background) >= 4.5, "Metadata / Subscribed on \(String(hex, radix: 16)) in \(name)")
                print(String(format: "Contrast %@ #%06X: error %.2f, primary %.2f", name.rawValue, hex, error.contrast(background), primary.contrast(background)))
            }
            // The section picker opts out of the brand tint; selected labels use
            // macOS's selection foreground on its native selection background.
            let fill = RGB(NSColor.selectedContentBackgroundColor, over: RGB(0))
            #expect(RGB(NSColor.alternateSelectedControlTextColor, over: fill).contrast(fill) >= 4.5)
            print(String(format: "Contrast %@ native selection: %.2f", name.rawValue, RGB(NSColor.alternateSelectedControlTextColor, over: fill).contrast(fill)))
        }
    }
    for name in [NSAppearance.Name.accessibilityHighContrastAqua, .accessibilityHighContrastDarkAqua] {
        let background = RGB(name == .accessibilityHighContrastAqua ? 0xFFFFFF : 0x464646)
        #expect(RGB(MacErrorPalette.color(for: name), over: background).contrast(background) >= 4.5)
    }
}
#endif
