#if os(macOS)
import AppKit
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Test func podcastViewportDoesNotPropagateTheNativeTablesIdealHeight() throws {
    struct Row: Identifiable { let id: Int }
    for height: CGFloat in [260, 420, 560] {
        for scale: CGFloat in [1, 2] {
            let root = PodcastPageLayout { _ in
                VStack(alignment: .leading) {
                    Text("A Podcast title").macContentFont(.title2).lineLimit(2)
                    Text(String(repeating: "A long description. ", count: 100)).lineLimit(3)
                }
            } episodes: {
                Table([Row(id: 1)]) { TableColumn("Episode") { _ in Text("An Episode") } }
            }
            .macContentFont(.body).environment(\.macTextScale, scale)
            let host = NSHostingView(rootView: root)
            host.frame = CGRect(x: 0, y: 0, width: 600, height: height)
            host.layoutSubtreeIfNeeded()
            #expect(host.fittingSize.height <= height)
            let tables = descendants(host).compactMap { $0 as? NSTableView }
            let table = try #require(tables.first)
            let viewport = try #require(table.enclosingScrollView)
            let frame = host.convert(viewport.bounds, from: viewport)
            #expect(frame.minY >= 0 && frame.maxY <= height)
            #expect(frame.height > 0)
        }
    }
}

@MainActor @Test func podcastDescriptionMeasuresTruncationAndBoundsExpandedProse() async throws {
    for scale: CGFloat in [1, 2] {
        for text in ["A short description.", String(repeating: "A long description with more to read. ", count: 80)] {
            var truncated = false
            let host = NSHostingView(rootView: PodcastDescription(text: text, expanded: .constant(false),
                truncated: Binding(get: { truncated }, set: { truncated = $0 }), toggle: {})
                .macContentFont(.body).environment(\.macTextScale, scale))
            host.frame = CGRect(x: 0, y: 0, width: 360, height: 500)
            for _ in 0..<5 { host.layoutSubtreeIfNeeded(); await Task.yield() }
            #expect(truncated == (text.count > 100))
            if truncated {
                let renderer = ImageRenderer(content: PodcastDescription(text: text, expanded: .constant(true),
                    truncated: .constant(true), toggle: {})
                    .macContentFont(.body).environment(\.macTextScale, scale).frame(width: 360))
                let image = try #require(renderer.cgImage)
                #expect(image.height < 240, "Only the prose viewport grows to its cap; the toggle remains outside it")
            }
        }
    }
}

@MainActor @Test func nativeEpisodeTableCanScrollItsLastRowAboveThePlayer() throws {
    struct Row: Identifiable { let id: Int }
    let inset: CGFloat = 108
    let root = Table((0..<30).map { Row(id: $0) }) {
        TableColumn("Episode") { row in Text("Episode \(row.id)") }
    }
    .tableStyle(.inset)
    .playbackBarScrollClearance()
    .environment(\.libraryPlaybackBarInset, inset)
    let host = NSHostingView(rootView: root)
    host.frame = CGRect(x: 0, y: 0, width: 600, height: 350)
    host.layoutSubtreeIfNeeded()
    let table = try #require(descendants(host).compactMap { $0 as? NSTableView }.first)
    #expect(table.numberOfRows == 30)
    let clip = try #require(table.enclosingScrollView?.contentView)
    clip.scroll(to: CGPoint(x: 0, y: table.bounds.maxY))
    host.layoutSubtreeIfNeeded()
    let row = table.convert(table.rect(ofRow: table.numberOfRows - 1), to: host)
    let clearance = host.isFlipped ? host.bounds.maxY - row.maxY : row.minY - host.bounds.minY
    #expect(clearance >= inset - 1)
}

@MainActor private func descendants(_ view: NSView) -> [NSView] {
    view.subviews.flatMap { [$0] + descendants($0) }
}
#endif
