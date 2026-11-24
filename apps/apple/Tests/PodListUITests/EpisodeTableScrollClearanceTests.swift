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

@MainActor @Test func emptyingThePlaylistReplacesTheNativeEntriesTable() async throws {
    struct Fixture: SwiftUI.View {
        let app: ApplicationModel
        let window: WindowModel
        let playlistID: String

        var body: some SwiftUI.View {
            if let library = app.library, let editing = app.editing,
               let playlist = library.state.playlists.first(where: { $0.id == playlistID }) {
                let rows = window.rows(in: library)
                PlaylistContentView(playlist: playlist, library: library, rows: rows, isTrashed: false,
                                    window: window, app: app, editing: editing, presentation: PlaylistPresentation())
                    .environment(\.libraryPlaybackBarInset, rows.isEmpty ? 0 : 108)
            }
        }
    }

    let db = try await fixtureDatabase()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    await app.startStandalone()
    let editing = try #require(app.editing)
    let library = try #require(app.library)
    let playlist = try #require(library.state.playlists.first)
    let window = WindowModel()
    window.navigate(to: .playlist(playlist.id))
    let ids = playlist.entries.map(\.episodeId)
    window.selection = Set(ids)

    let host = NSHostingView(rootView: Fixture(app: app, window: window, playlistID: playlist.id))
    host.frame = CGRect(x: 0, y: 0, width: 735, height: 552)
    func nativeTable(in view: NSView) -> NSTableView? {
        (view as? NSTableView) ?? view.subviews.lazy.compactMap { nativeTable(in: $0) }.first
    }
    func settle() async {
        for _ in 0..<5 { host.layoutSubtreeIfNeeded(); await Task.yield() }
    }

    await settle()
    try #require(nativeTable(in: host)?.numberOfRows == ids.count)
    await editing.remove(ids, playlistID: playlist.id)
    await settle()
    #expect(window.rows(in: try #require(app.library)).isEmpty)
    #expect(nativeTable(in: host) == nil, "Remove the native table before laying out the empty state")

    await editing.reverse()
    await settle()
    #expect(nativeTable(in: host)?.numberOfRows == ids.count, "Undo must bring back the Entries table")
}
#endif
