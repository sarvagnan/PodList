#if os(macOS)
import AppKit
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
    probe.selection = ["25"]
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
#endif
