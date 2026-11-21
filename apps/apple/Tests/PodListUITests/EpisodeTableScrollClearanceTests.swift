#if os(macOS)
import AppKit
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Test func episodeTableCanScrollItsLastRowClearOfThePlayerAtMinimumWidth() async throws {
    struct Row: Identifiable {
        let id: Int
        let height: CGFloat
    }

    let playerHeight: CGFloat = 108
    let rows = [54.5, 54.5, 73.5, 73.5, 54.5, 73.5].enumerated().map { Row(id: $0.offset, height: $0.element) }
    let table = Table(rows) {
        TableColumn("Episode") { row in Text("Episode \(row.id)").frame(height: row.height - 4) }
    }
    .tableStyle(.inset)
    .playbackBarScrollClearance(usesNativeInsets: true)
    .environment(\.libraryPlaybackBarInset, playerHeight)
    .frame(width: 490, height: 432)
    let window = NSWindow(contentViewController: NSHostingController(rootView: table))
    window.isReleasedWhenClosed = false
    defer { window.close() }
    window.setContentSize(NSSize(width: 490, height: 432))
    let root = try #require(window.contentView)
    for _ in 0..<5 { root.layoutSubtreeIfNeeded(); await Task.yield() }

    func descendants(_ view: NSView) -> [NSView] { view.subviews.flatMap { [$0] + descendants($0) } }
    let nativeTable = try #require(descendants(root).compactMap { $0 as? NSTableView }.first)
    let scroll = try #require(nativeTable.enclosingScrollView)
    try #require(nativeTable.numberOfRows == rows.count)
    #expect(scroll.contentInsets.bottom == playerHeight)
    let last = nativeTable.rect(ofRow: nativeTable.numberOfRows - 1)
    func clearance() -> CGFloat {
        let row = nativeTable.convert(last, to: root)
        return root.isFlipped ? root.bounds.maxY - row.maxY : row.minY - root.bounds.minY
    }
    #expect(clearance() < playerHeight)

    let clip = scroll.contentView
    let bottom = clip.constrainBoundsRect(CGRect(x: clip.bounds.minX, y: last.maxY + playerHeight,
                                                width: clip.bounds.width, height: clip.bounds.height))
    clip.scroll(to: bottom.origin)
    scroll.reflectScrolledClipView(clip)
    #expect(clearance() >= playerHeight - 1)
    #expect(!window.isVisible)
}
#endif
