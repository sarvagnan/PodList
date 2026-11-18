#if os(macOS)
import AppKit
import SwiftUI
import Testing
@testable import PodListUI

@MainActor @Test func nativeRowTypeSelectionRevealsMatchAndLeavesTextAndCommandsAlone() throws {
    final class Rows: NSObject, NSTableViewDataSource {
        func numberOfRows(in tableView: NSTableView) -> Int { 30 }
    }
    let data = Rows()
    // An unordered window: no app activation, screen input or visible UI.
    let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 500, height: 200),
                          styleMask: [.titled], backing: .buffered, defer: false)
    window.isReleasedWhenClosed = false
    defer { window.close() }
    let root = try #require(window.contentView)
    let scroll = NSScrollView(frame: root.bounds)
    let table = NSTableView(frame: root.bounds)
    table.addTableColumn(NSTableColumn(identifier: .init("title")))
    table.dataSource = data; table.rowHeight = 30
    scroll.documentView = table
    root.addSubview(scroll)
    table.reloadData()
    let probe = MacRowScroll.Probe(frame: .zero)
    probe.ids = (0..<30).map { Optional(String($0)) }
    probe.titles = (0..<30).map { TypeSelectionRow(id: String($0), title: $0 == 25 ? "Joinery without screws" : "Episode \($0)") }
    var selected: String?
    var anchor: RowAnchor?
    probe.select = { selected = $0 }
    probe.changed = { anchor = $0 }
    root.addSubview(probe)
    probe.updateTable()
    defer { probe.stopObserving() }
    #expect(window.makeFirstResponder(table))
    func key(_ text: String, modifiers: NSEvent.ModifierFlags = [], at time: Double = 1) throws -> NSEvent {
        try #require(NSEvent.keyEvent(with: .keyDown, location: .zero, modifierFlags: modifiers, timestamp: time,
            windowNumber: window.windowNumber, context: nil, characters: text, charactersIgnoringModifiers: text,
            isARepeat: false, keyCode: 0))
    }
    #expect(probe.handleKey(try key("j")) == nil)
    #expect(probe.handleKey(try key("o", at: 1.1)) == nil)
    #expect(selected == "25")
    #expect(anchor?.id == "25")
    #expect(table.visibleRect.intersects(table.rect(ofRow: 25)))
    #expect(probe.handleKey(try key("j", modifiers: .command)) != nil)
    #expect(probe.handleKey(try key("j", modifiers: .control)) != nil)
    #expect(probe.handleKey(try key(" ")) != nil) // Playback keeps Space.
    #expect(probe.handleKey(try key("\t")) != nil)
    var activated: [Set<String>] = []
    probe.selection = .constant(["25"])
    probe.activate = { activated.append($0) }
    #expect(probe.handleKey(try key("\r")) == nil)
    #expect(probe.handleKey(try key("\r", modifiers: .command)) != nil)
    #expect(activated == [["25"]])
    let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 100, height: 24))
    root.addSubview(field)
    #expect(window.makeFirstResponder(field))
    #expect(window.firstResponder is NSTextView)
    selected = nil
    #expect(probe.handleKey(try key("j", at: 4)) != nil)
    #expect(probe.handleKey(try key("\r")) != nil)
    #expect(activated == [["25"]])
    #expect(selected == nil)
    #expect(!window.isVisible)
}

@MainActor @Test func nativeEpisodeSelectAllSurvivesOpeningTheInspectorFromTheSelectedRow() async throws {
    struct Row: Identifiable { let id: String }
    struct Fixture: SwiftUI.View {
        let ids: [String]
        let selection: Binding<Set<String>>

        var body: some SwiftUI.View {
            Table(of: Row.self, selection: selection) {
                TableColumn("Episode", value: \.id)
            } rows: {
                ForEach(ids, id: \.self) { id in
                    TableRow(Row(id: id)).draggable(id)
                }
            }
            .typeSelectingRows(ids.map { TypeSelectionRow(id: $0, title: $0) }, selection: selection, anchor: .constant(nil),
                               reselect: { selection.wrappedValue = [$0] })
        }
    }
    let ids = ["one", "two", "three"]
    let model = WindowModel()
    model.navigate(to: .view("all"))
    var inspectorVisible = false
    let selection = model.episodeSelection(episodeIDs: ids) { inspectorVisible = true }
    let window = NSWindow(contentViewController: NSHostingController(rootView: Fixture(ids: ids, selection: selection)))
    window.isReleasedWhenClosed = false
    window.setContentSize(NSSize(width: 500, height: 300))
    defer { window.close() }
    let root = try #require(window.contentView)
    func descendants(_ view: NSView) -> [NSView] { view.subviews.flatMap { [$0] + descendants($0) } }
    root.layoutSubtreeIfNeeded()
    let table = try #require(descendants(root).compactMap { $0 as? NSOutlineView }.first)
    let probe = try #require(descendants(root).compactMap { $0 as? MacRowScroll.Probe }.first)
    #expect(window.makeFirstResponder(table))
    table.selectRowIndexes([0], byExtendingSelection: false)
    #expect(model.selection == ["one"] && inspectorVisible)

    // Click a remembered selection from outside the table, then immediately press ⌘A.
    inspectorVisible = false
    for _ in 0..<3 { await Task.yield(); root.layoutSubtreeIfNeeded() }
    #expect(probe.selection.wrappedValue == ["one"])
    #expect(window.makeFirstResponder(window))
    let row = table.rect(ofRow: 0)
    let point = table.convert(NSPoint(x: row.midX, y: row.midY), to: nil)
    let click = try #require(NSEvent.mouseEvent(with: .leftMouseDown, location: point, modifierFlags: [], timestamp: 1,
        windowNumber: window.windowNumber, context: nil, eventNumber: 1, clickCount: 1, pressure: 1))
    let selectAll = try #require(NSEvent.keyEvent(with: .keyDown, location: point, modifierFlags: .command, timestamp: 2,
        windowNumber: window.windowNumber, context: nil, characters: "a", charactersIgnoringModifiers: "a", isARepeat: false, keyCode: 0))
    probe.handleMouseDown(click)
    #expect(window.firstResponder === table)
    #expect(probe.handleKey(selectAll) == nil)
    #expect(model.selection == Set(ids))
    await withCheckedContinuation { done in DispatchQueue.main.async { done.resume() } }
    #expect(model.selection == Set(ids))
    #expect(table.selectedRowIndexes.count == ids.count)
    #expect(inspectorVisible)

    let search = NSSearchField(frame: NSRect(x: 0, y: 0, width: 100, height: 24))
    root.addSubview(search)
    #expect(window.makeFirstResponder(search))
    #expect(probe.handleKey(selectAll) != nil)
    #expect(!window.isVisible)
}
#endif
