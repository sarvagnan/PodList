#if os(macOS)
import AppKit
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Test(arguments: [CGFloat(0), 108, 152])
func largeSidebarCanScrollItsLastRowAboveThePlayer(playerHeight: CGFloat) async throws {
    struct Fixture: SwiftUI.View {
        let playerHeight: CGFloat
        @State private var selection: String? = "Subscriptions"

        var body: some SwiftUI.View {
            NavigationSplitView {
                List(selection: $selection) {
                    Section("Views") {
                        ForEach(1...30, id: \.self) { Text("View \($0)").tag("view-\($0)") }
                    }
                    Section("Playlists") {
                        ForEach(1...30, id: \.self) { Text("Playlist \($0)").tag("playlist-\($0)") }
                    }
                    Section("Library") {
                        Button("Add Podcasts…") {}.buttonStyle(.plain).selectionDisabled()
                        Text("Subscriptions").tag("Subscriptions")
                        Text("Search").tag("Search")
                    }
                }
                .listStyle(.sidebar)
                .safeAreaPadding(.bottom, playerHeight)
                .background(MacSidebarWidth { _ in })
                .navigationSplitViewColumnWidth(min: 180, ideal: 225, max: 320)
            } detail: {
                Text("Subscriptions")
            }
            .overlay(alignment: .bottom) { Color.clear.frame(height: playerHeight) }
        }
    }
    let controller = NSHostingController(rootView: Fixture(playerHeight: playerHeight))
    let window = NSWindow(contentViewController: controller)
    window.isReleasedWhenClosed = false
    window.setContentSize(NSSize(width: 1180, height: 760))
    defer { window.close() }
    let root = try #require(window.contentView)
    for _ in 0..<5 { root.layoutSubtreeIfNeeded(); await Task.yield() }
    func descendants(_ view: NSView) -> [NSView] { view.subviews.flatMap { [$0] + descendants($0) } }
    let outline = try #require(descendants(root).compactMap { $0 as? NSOutlineView }.first)
    let scroll = try #require(outline.enclosingScrollView)
    #expect(outline.numberOfRows >= 63)
    #expect(scroll.contentInsets.bottom == playerHeight)
    let clip = scroll.contentView
    let last = outline.rect(ofRow: outline.numberOfRows - 1)
    let bottom = clip.constrainBoundsRect(CGRect(origin: CGPoint(x: clip.bounds.minX, y: outline.bounds.maxY + playerHeight),
                                                  size: clip.bounds.size))
    clip.scroll(to: bottom.origin)
    scroll.reflectScrolledClipView(clip)
    let row = outline.convert(last, to: root)
    let clearance = root.isFlipped ? root.bounds.maxY - row.maxY : row.minY - root.bounds.minY
    #expect(clearance >= playerHeight - 1)
    #expect(!window.isVisible)
}
#endif
