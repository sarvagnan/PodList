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
                    let host = NSHostingView(rootView: PlaylistToolbar(selection: .constant(section))
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
                    #expect(frame.width > 200) // The native control must never be capped to the pane.
                    #expect(picker.enclosingScrollView == nil)
                    #expect(frame.minX >= 0)
                    #expect(frame.maxX <= width) // Actions occupy a separate trailing toolbar group.
                    frames.append(frame)
                }
                #expect(Set(frames.map(\.minX)).count == 1)
                #expect(Set(frames.map(\.minY)).count == 1)
            }
        }
    }
}
#endif

#if os(macOS)
/// Inspect the real unified toolbar without ordering a window onto the desktop.
@MainActor @Test func playlistPrincipalAndSearchFitDefaultWindow() async throws {
    struct ToolbarFixture: SwiftUI.View {
        let section: PlaylistTab
        let selected: Bool
        var body: some SwiftUI.View {
            NavigationSplitView {
                Text("Sidebar").navigationSplitViewColumnWidth(225)
            } detail: {
                Text("Episodes").navigationTitle("Default").navigationSubtitle("4 Entries")
                    .toolbar {
                        ToolbarItem(placement: .principal) { PlaylistToolbar(selection: .constant(section)) }
                        ToolbarItemGroup(placement: .primaryAction) {
                            Button("Play This Playlist", systemImage: "play.fill") {}.help("Play This Playlist")
                            Menu("Playlist Actions", systemImage: "slider.horizontal.3") {
                                Button("New Playlist…") {}
                                Button("Playlist Settings…") {}
                            }
                            Button("Hide Inspector", systemImage: "sidebar.right") {}
                        }
                        if selected {
                            ToolbarItemGroup(placement: .primaryAction) {
                                Button("Play Now", systemImage: "play.fill") {}
                                Button("Add to a Playlist", systemImage: "text.badge.plus") {}
                                Menu("Episode Actions", systemImage: "ellipsis.circle") { Button("Action") {} }
                                    .menuStyle(.borderlessButton).fixedSize()
                            }
                        }
                    }
                    .searchable(text: .constant(""), placement: .toolbar, prompt: "Search this list")
            }
        }
    }
    let controller = NSHostingController(rootView: ToolbarFixture(section: .entries, selected: false))
    let window = NSWindow(contentViewController: controller)
    window.isReleasedWhenClosed = false
    window.setContentSize(NSSize(width: 1180, height: 760))
    defer { window.close() }
    var frames: [CGRect] = []
    var playFrames: [CGRect] = []
    func descendants(_ view: NSView) -> [NSView] { [view] + view.subviews.flatMap(descendants) }
    for section in PlaylistTab.allCases {
        for selected in [false, true] {
            controller.rootView = ToolbarFixture(section: section, selected: selected)
            for _ in 0..<5 { await Task.yield(); window.contentView?.superview?.layoutSubtreeIfNeeded() }
            let toolbar = try #require(window.toolbar)
            #expect(!toolbar.items.isEmpty)
            if let play = toolbar.items.first(where: { $0.label == "Play This Playlist" })?.view {
                playFrames.append(play.convert(play.bounds, to: nil))
            }
            let root = try #require(window.contentView?.superview)
            let views = descendants(root)
            let picker = try #require(views.compactMap { $0 as? NSSegmentedControl }.first { !$0.isHiddenOrHasHiddenAncestor })
            let frame = picker.convert(picker.bounds, to: root)
            frames.append(frame)
            let search = try #require(views.first { String(describing: type(of: $0)) == "NSSearchToolbarItemView" })
            #expect(search.frame.width > 100, "At 1180 pt, Search must remain a field even with selection actions")
            #expect(!window.isVisible)
        }
    }
    for frame in frames.dropFirst() { #expect(abs(frame.minX - frames[0].minX) < 1) }
    #expect(playFrames.count == frames.count)
    for frame in playFrames.dropFirst() { #expect(abs(frame.minX - playFrames[0].minX) < 1) }
}
#endif
