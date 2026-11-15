#if os(macOS)
import Foundation
import SwiftUI
import Testing
@testable import PodListUI

@MainActor private func textSizeDefaults() -> (UserDefaults, String) {
    let suite = "PodListTextSizeTests-\(UUID().uuidString)"
    return (UserDefaults(suiteName: suite)!, suite)
}

@Test @MainActor func textSizeDefaultsToActualSizeAndSurvivesReopening() {
    let (defaults, suite) = textSizeDefaults()
    defer { defaults.removePersistentDomain(forName: suite) }
    let preference = MacTextSizePreference(defaults: defaults)
    #expect(preference.percent == 100)
    #expect(preference.scale == 1)
    #expect(!preference.canShrink)
    preference.bigger()
    #expect(preference.percent == 110)
    #expect(defaults.integer(forKey: MacTextSizePreference.key) == 110)
    #expect(MacTextSizePreference(defaults: defaults).percent == 110)
    preference.percent = 180 // The Settings picker uses this same property.
    #expect(MacTextSizePreference(defaults: defaults).scale == 1.8)
    preference.smaller()
    #expect(preference.percent == 170)
    preference.actualSize()
    #expect(MacTextSizePreference(defaults: defaults).percent == 100)
}

@Test @MainActor func textSizeCommandsAndSettingsCannotExceedBounds() {
    let (defaults, suite) = textSizeDefaults()
    defer { defaults.removePersistentDomain(forName: suite) }
    let preference = MacTextSizePreference(defaults: defaults)
    for _ in 0..<30 { preference.bigger() }
    #expect(preference.percent == 200)
    #expect(preference.scale == 2)
    #expect(!preference.canGrow)
    #expect(defaults.integer(forKey: MacTextSizePreference.key) == 200)
    for _ in 0..<30 { preference.smaller() }
    #expect(preference.percent == 100)
    #expect(!preference.canShrink)
    for invalid in [Int.min, -1, 0, 99, 201, Int.max] {
        preference.percent = invalid
        let expected = invalid < 100 ? 100 : 200
        #expect(preference.percent == expected)
        #expect(defaults.integer(forKey: MacTextSizePreference.key) == expected)
        #expect(MacTextSizePreference(defaults: defaults).percent == expected)
    }
}

@Test @MainActor func textSizeClampsPreviouslyStoredOutOfRangeValues() {
    let (defaults, suite) = textSizeDefaults()
    defer { defaults.removePersistentDomain(forName: suite) }
    for (stored, expected) in [(-100, 100), (0, 100), (150, 150), (1000, 200)] {
        defaults.set(stored, forKey: MacTextSizePreference.key)
        #expect(MacTextSizePreference(defaults: defaults).percent == expected)
    }
    defaults.set("invalid", forKey: MacTextSizePreference.key)
    #expect(MacTextSizePreference(defaults: defaults).percent == 100)
}

@Test @MainActor func macSemanticFontsNeedExplicitScalingInsteadOfDynamicType() {
    var environment = EnvironmentValues()
    for style in [Font.body, .caption, .headline, .title2] {
        let original = style.resolve(in: environment.fontResolutionContext).pointSize
        environment.dynamicTypeSize = .accessibility5
        #expect(style.resolve(in: environment.fontResolutionContext).pointSize == original)
        let enlarged = style.scaled(by: 2).resolve(in: environment.fontResolutionContext)
        #expect(abs(enlarged.pointSize - original * 2) < 0.01)
        environment.dynamicTypeSize = .large
    }
}

@Test @MainActor func readingRowsGrowAndWrapAtTwoHundredPercentWithoutAScreen() throws {
    @MainActor func height(scale: CGFloat, width: CGFloat) throws -> Int {
        let row = MacReadingRow {
            Text("An Episode title long enough to wrap across several lines in the reading layout")
                .macContentFont(.headline)
        } metadata: { "Published 15 Nov 2026 · Length 1:25:30 · Unplayed" }
        let renderer = ImageRenderer(content: row.macContentFont(.body)
            .environment(\.macTextScale, scale).frame(width: width))
        return try #require(renderer.cgImage).height
    }
    let actual = try height(scale: 1, width: 320)
    let enlarged = try height(scale: 2, width: 320)
    #expect(enlarged > actual * 2) // Bigger glyphs and additional wrapped lines.
    #expect(try height(scale: 2, width: 220) > enlarged)
}
#endif
