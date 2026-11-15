#if os(macOS)
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Test func subscriptionButtonReservesBothLabelsAcrossArmingAndDisarming() throws {
    for scale in [1.0, 2.0] {
        for appearance in [ColorScheme.light, .dark] {
            var sizes: [CGSize] = []
            for (subscribed, armed) in [(true, false), (true, true), (true, false), (false, false)] {
                let renderer = ImageRenderer(content: Button {} label: {
                    SubscriptionButtonLabel(subscribed: subscribed, armed: armed)
                }
                    .macContentFont(.body)
                    .environment(\.macTextScale, scale)
                    .environment(\.colorScheme, appearance))
                let image = try #require(renderer.cgImage)
                sizes.append(CGSize(width: image.width, height: image.height))
            }
            #expect(sizes.allSatisfy { $0 == sizes.first })
        }
    }
}
#endif
