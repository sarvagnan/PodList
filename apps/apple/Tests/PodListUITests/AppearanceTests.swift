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
