#if os(macOS)
import AppKit
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Test func playlistToolbarPreservesNaturalPickerWidthAndPositionAcrossSections() throws {
    func descendants(_ view: NSView) -> [NSView] {
        view.subviews.flatMap { [$0] + descendants($0) }
    }
    for scale in [1.0, 2.0] {
        for appearance in [ColorScheme.light, .dark] {
            var naturalWidth: CGFloat?
            for width in [CGFloat(500), 640, 760, 960, 1180] {
                var frames: [CGRect] = []
                for section in PlaylistTab.allCases {
                    // NSHostingView lays out real AppKit controls without creating a window.
                    let host = NSHostingView(rootView: PlaylistToolbar(selection: .constant(section), busy: false, play: {})
                        .macContentFont(.body)
                        .environment(\.macTextScale, scale)
                        .environment(\.colorScheme, appearance)
                        .frame(width: width))
                    host.frame = CGRect(x: 0, y: 0, width: width, height: 80)
                    host.layoutSubtreeIfNeeded()
                    let controls = descendants(host).compactMap { $0 as? NSSegmentedControl }
                        .filter { !$0.isHiddenOrHasHiddenAncestor }
                    #expect(controls.count == 1)
                    let picker = try #require(controls.first)
                    let frame = host.convert(picker.bounds, from: picker)
                    if let naturalWidth { #expect(abs(frame.width - naturalWidth) < 1) }
                    else { naturalWidth = frame.width }
                    #expect(frame.width > 350) // The native control must never be capped to the pane.
                    #expect(picker.enclosingScrollView == nil)
                    #expect(frame.minX >= 0)
                    #expect(frame.maxX < width - 28) // Leave room for Play This Playlist.
                    frames.append(frame)
                }
                #expect(Set(frames.map(\.minX)).count == 1)
                #expect(Set(frames.map(\.minY)).count == 1)
            }
        }
    }
}
#endif
