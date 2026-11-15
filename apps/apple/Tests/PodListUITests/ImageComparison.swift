#if os(macOS)
import AppKit

/// Pixels that clearly differ (summed RGBA delta > 0.1); anti-aliasing noise between renders
/// under parallel tests changes only a handful.
func differingPixels(_ a: NSBitmapImageRep, _ b: NSBitmapImageRep) -> Int {
    guard a.pixelsWide == b.pixelsWide, a.pixelsHigh == b.pixelsHigh else { return .max }
    var count = 0
    for y in 0..<a.pixelsHigh {
        for x in 0..<a.pixelsWide {
            guard let p = a.colorAt(x: x, y: y), let q = b.colorAt(x: x, y: y) else { continue }
            let delta = abs(p.redComponent - q.redComponent) + abs(p.greenComponent - q.greenComponent)
                + abs(p.blueComponent - q.blueComponent) + abs(p.alphaComponent - q.alphaComponent)
            if delta > 0.1 { count += 1 }
        }
    }
    return count
}
#endif
