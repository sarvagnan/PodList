#if os(macOS)
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Test func sheetReadingSurfaceKeepsMarginsAndWrapsAtBothTextSizesWithoutAScreen() throws {
    for width: CGFloat in [420, 500, 520, 540, 560, 600] {
        for appearance in [ColorScheme.light, .dark] {
            var heights: [Int] = []
            for scale: CGFloat in [1, 2] {
                let renderer = ImageRenderer(content: PodListSheetReadingSurface(
                    title: "A Podcast with a Long Name Settings", width: width) {
                        Form {
                            LabeledContent("Name", value: "A long Playlist name that needs to wrap at enlarged text sizes")
                            Text("When Clear on Played is on, Entries leave this Playlist when their Episode next becomes Played. Turning it on does not remove Entries whose Episodes are already Played.")
                                .macContentFont(.caption).fixedSize(horizontal: false, vertical: true)
                            Text("Save applies these settings and any Mark All Played selection. Cancel discards changes.")
                                .macContentFont(.caption).fixedSize(horizontal: false, vertical: true)
                        }.formStyle(PodListSheetFormStyle())
                    }
                    .macContentFont(.body).environment(\.macTextScale, scale)
                    .environment(\.colorScheme, appearance))
                let image = try #require(renderer.cgImage)
                #expect(image.width == Int(width))
                let bounds = try horizontalInkBounds(image)
                // Allow two points for native glyph overhang, not the 5–8 pt
                // margins and clipped trailing text in the round-5 captures.
                #expect(bounds.lowerBound >= 22)
                #expect(bounds.upperBound < Int(width) - 22)
                heights.append(image.height)
            }
            #expect(heights[1] > heights[0] * 3 / 2)
        }
    }
}

private func horizontalInkBounds(_ image: CGImage) throws -> ClosedRange<Int> {
    let width = image.width, height = image.height
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    try pixels.withUnsafeMutableBytes { bytes in
        let context = try #require(CGContext(data: bytes.baseAddress, width: width, height: height,
            bitsPerComponent: 8, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    }
    var first = width, last = -1
    for y in 0..<height {
        for x in 0..<width where pixels[(y * width + x) * 4 + 3] > 8 {
            first = min(first, x); last = max(last, x)
        }
    }
    #expect(last >= first, "The reading surface must render its text")
    return first...max(first, last)
}
#endif
