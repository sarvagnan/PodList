#if os(macOS)
import AppKit
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Test func podcastViewportDoesNotPropagateTheNativeTablesIdealHeight() throws {
    struct Row: Identifiable { let id: Int }
    for height: CGFloat in [260, 420, 560] {
        for scale: CGFloat in [1, 2] {
            let root = PodcastPageLayout { _, _ in
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

@MainActor @Test(arguments: [1.0, 2.0])
func expandedPodcastHeaderLeavesControlsAndEpisodeSpaceAbovePlayer(scale: CGFloat) async throws {
    let viewport: CGFloat = 400
    let player: CGFloat = 132
    var subscribeFrame = CGRect.zero
    var ruleFrame = CGRect.zero
    var episodesFrame = CGRect.zero
    let root = PodcastPageLayout { descriptionHeight, compact in
        VStack(alignment: .leading, spacing: compact ? 6 : 12) {
            HStack(alignment: .top, spacing: 16) {
                ArtworkView(url: nil, title: "A podcast", size: compact ? 48 : 96)
                VStack(alignment: .leading, spacing: compact ? 2 : 6) {
                    Text("A Podcast with a Longer Title").macContentFont(compact ? .headline : .title2).lineLimit(compact ? 1 : 2)
                    if !compact { Text("The author").lineLimit(1) }
                    PodcastDescription(text: String(repeating: "A description with more to read. ", count: 80),
                        expanded: .constant(true), truncated: .constant(true), maximumHeight: descriptionHeight,
                        showsToggle: !compact, toggle: {})
                }
            }
            HStack(spacing: 4) {
                Button("Subscribed") {}
                Button("Share Podcast", systemImage: "square.and.arrow.up") {}.labelStyle(.iconOnly)
                Button("Copy Feed Address", systemImage: "doc.on.doc") {}.labelStyle(.iconOnly)
                Button("Subscription Settings", systemImage: "gearshape") {}.labelStyle(.iconOnly)
                Button("Show Less", systemImage: "chevron.up") {}.labelStyle(.iconOnly)
            }
            .onGeometryChange(for: CGRect.self) { $0.frame(in: .named("podcast")) } action: { subscribeFrame = $0 }
            DownloadRuleFields(mode: .constant(.allNew), cap: .constant(nil), compact: compact)
                .onGeometryChange(for: CGRect.self) { $0.frame(in: .named("podcast")) } action: { ruleFrame = $0 }
            Text("30 Episodes").macContentFont(compact ? .caption : .body)
        }
    } episodes: {
        Color.clear
            .onGeometryChange(for: CGRect.self) { $0.frame(in: .named("podcast")) } action: { episodesFrame = $0 }
    }
    .coordinateSpace(name: "podcast")
    .macContentFont(.body)
    .environment(\.macTextScale, scale)
    .environment(\.libraryPlaybackBarInset, player)
    let host = NSHostingView(rootView: root)
    host.frame = CGRect(x: 0, y: 0, width: 320, height: viewport)
    for _ in 0..<5 { host.layoutSubtreeIfNeeded(); await Task.yield() }
    #expect(!subscribeFrame.isEmpty)
    #expect(subscribeFrame.maxY <= ruleFrame.minY)
    #expect(!ruleFrame.isEmpty)
    #expect(ruleFrame.maxY < episodesFrame.minY)
    #expect(episodesFrame.minY <= viewport - player - 44, "There must be space to read an Episode above the player.")
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

@MainActor @Test(arguments: [400.0, 480.0, 640.0, 735.0, 955.0])
func podcastColumnsFitAndStayStableWhenTheViewportHeightChanges(width: CGFloat) throws {
    struct Row: Identifiable { let id: Int }
    let layout = EpisodeTableLayout(width: width)
    let rows = (0..<6).map { Row(id: $0) }
    let root = Table(rows) {
        TableColumn("Episode") { row in Text("Episode \(row.id)") }.width(min: EpisodeTableLayout.minimumTitleWidth, ideal: layout.podcastTitleWidth)
        if layout.showsDateOrPosition {
            TableColumn("Published") { _ in Text("Nov 23, 2026") }.width(min: 95, ideal: EpisodeTableLayout.podcastPublishedWidth, max: 150)
        }
        if layout.showsLength {
            TableColumn("Length") { _ in Text("25:34") }.width(min: 60, ideal: EpisodeTableLayout.podcastLengthWidth, max: 100)
        }
        if layout.showsState {
            TableColumn("State") { _ in Text("In progress") }.width(min: 120, ideal: EpisodeTableLayout.podcastStateWidth, max: 200)
        }
    }.tableStyle(.inset)
        .scrollIndicators(.never, axes: .vertical)
    let host = NSHostingView(rootView: root)
    host.frame = CGRect(x: 0, y: 0, width: width, height: 393)
    host.layoutSubtreeIfNeeded()
    let table = try #require(descendants(host).compactMap { $0 as? NSTableView }.first)
    let scroll = try #require(table.enclosingScrollView)
    scroll.scrollerStyle = .legacy
    #expect(table.tableColumns.allSatisfy { $0.resizingMask.contains(.userResizingMask) })
    let columns = 0..<table.numberOfColumns
    var initialFrames: [CGRect]?
    for height: CGFloat in [393, 100, 393] {
        host.frame.size.height = height
        host.layoutSubtreeIfNeeded()
        scroll.tile()
        let frames = columns.map { table.rect(ofColumn: $0) }
        let requiredWidth = try #require(frames.last).maxX
        let visibleWidth = scroll.documentVisibleRect.width
        #expect(requiredWidth <= visibleWidth + 1,
                "The final column ends at \(requiredWidth) pt in a \(visibleWidth) pt viewport")
        let clip = scroll.contentView
        var proposed = clip.bounds
        proposed.origin.x = width
        #expect(clip.constrainBoundsRect(proposed).minX <= clip.bounds.minX + 1,
                "Podcast columns must fit without horizontal scrolling")
        if let initialFrames {
            for (before, after) in zip(initialFrames, frames) {
                #expect(abs(before.minX - after.minX) <= 1 && abs(before.width - after.width) <= 1)
            }
        } else {
            initialFrames = frames
        }
    }
    host.frame.size.height = 100
    host.layoutSubtreeIfNeeded()
    let clip = scroll.contentView
    clip.scroll(to: CGPoint(x: 0, y: table.rect(ofRow: rows.count - 1).maxY))
    #expect(scroll.documentVisibleRect.minY > 0, "The table must still scroll when the rows overflow")
}

@MainActor private func descendants(_ view: NSView) -> [NSView] {
    view.subviews.flatMap { [$0] + descendants($0) }
}
#endif
