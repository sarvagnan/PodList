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
@MainActor @Test func playlistSectionAndSearchFitDefaultWindow() async throws {
    let db = try await fixtureDatabase()
    let library = try await fixtureModel()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "toolbar", defaults: UserDefaults(suiteName: UUID().uuidString)!))
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    let presentation = PlaylistPresentation()
    struct ToolbarFixture: SwiftUI.View {
        let section: PlaylistTab
        let selected: Bool
        let library: LibraryModel
        let editing: PlaylistEditingModel
        let app: ApplicationModel
        let presentation: PlaylistPresentation
        var body: some SwiftUI.View {
            NavigationSplitView {
                Text("Sidebar")
                    .toolbar(removing: .sidebarToggle)
                    .navigationSplitViewColumnWidth(225)
            } detail: {
                Text("Episodes").navigationTitle("Default").navigationSubtitle("4 Entries")
                    .toolbar {
                        ToolbarItem(placement: .navigation) {
                            Button("Hide Sidebar", systemImage: "sidebar.left") {}
                        }
                        ToolbarItem(placement: .primaryAction) { PlaylistToolbar(selection: .constant(section)) }
                        EpisodeActionButtons(ids: selected ? [library.snapshot.episodes[0].id] : [], library: library,
                            editing: editing, presentation: presentation, app: app, playlist: library.state.playlists[0])
                        ToolbarSpacer(.fixed, placement: .primaryAction)
                        ToolbarItem(placement: .primaryAction) {
                            Button("Hide Inspector", systemImage: "sidebar.right") {}
                        }
                        ToolbarItem(placement: .primaryAction) {
                            LibraryToolbarSearch(text: .constant(""), scope: .list)
                        }
                    }
                    .inspector(isPresented: .constant(true)) {
                        Text("Select an Episode")
                            .inspectorColumnWidth(min: 260, ideal: PaneWidths().inspector, max: 440)
                    }
            }
        }
    }
    let controller = NSHostingController(rootView: ToolbarFixture(section: .entries, selected: false, library: library, editing: editing, app: app, presentation: presentation))
    let window = NSWindow(contentViewController: controller)
    window.isReleasedWhenClosed = false
    window.setContentSize(NSSize(width: 1180, height: 760))
    defer { window.close() }
    var frames: [CGRect] = []
    var playFrames: [CGRect] = []
    var inspectorFrames: [CGRect] = []
    func descendants(_ view: NSView) -> [NSView] { [view] + view.subviews.flatMap(descendants) }
    for section in PlaylistTab.allCases {
        for selected in [false, true] {
            controller.rootView = ToolbarFixture(section: section, selected: selected, library: library, editing: editing, app: app, presentation: presentation)
            for _ in 0..<5 { await Task.yield(); window.contentView?.superview?.layoutSubtreeIfNeeded() }
            let toolbar = try #require(window.toolbar)
            #expect(!toolbar.items.isEmpty)
            // The live tour checks for duplicates in the accessibility tree.
            #expect(toolbar.items.filter { $0.label == "Hide Sidebar" }.count == 1)
            let inspector = try #require(toolbar.items.first(where: { $0.label == "Hide Inspector" })?.view)
            inspectorFrames.append(inspector.convert(inspector.bounds, to: nil))
            let root = try #require(window.contentView?.superview)
            let views = descendants(root)
            #expect(!toolbar.items.contains { $0.label == "New Playlist…" })
            let picker = try #require(views.compactMap { $0 as? NSSegmentedControl }.first { !$0.isHiddenOrHasHiddenAncestor })
            let frame = picker.convert(picker.bounds, to: nil)
            frames.append(frame)
            let actionItems = toolbar.items.compactMap { $0.view }.map { $0.convert($0.bounds, to: nil) }.filter {
                $0.width > 20 && $0.minX >= frame.maxX && $0.maxX <= inspectorFrames.last!.minX
            }
            #expect(actionItems.count == 1, "The toolbar hosts one view for the Episode actions")
            playFrames.append(try #require(actionItems.first))
            let search = try #require(views.compactMap { $0 as? NSTextField }.first { $0.placeholderString == "Search" })
            #expect(inspectorFrames.last!.maxX < search.convert(search.bounds, to: nil).minX)
            #expect(search.frame.width > 80, "At 1180 pt, Search must leave room for typing beside its scope")
            #expect(!window.isVisible)
        }
    }
    for frame in frames.dropFirst() { #expect(abs(frame.minX - frames[0].minX) < 1) }
    #expect(inspectorFrames.count == frames.count)
    for frame in inspectorFrames.dropFirst() { #expect(abs(frame.minX - inspectorFrames[0].minX) < 1) }
    #expect(playFrames.count == frames.count)
    for frame in playFrames.dropFirst() { #expect(abs(frame.minX - playFrames[0].minX) < 1) }
}
#endif
