#if os(macOS)
import AppKit
import SwiftUI

/// Tables and Lists use AppKit row scrolling on macOS. Observe the clip view,
/// preserving reading position independently of selection, focus and playback.
struct MacRowScroll: NSViewRepresentable {
    var ids: [String?]
    @Binding var anchor: RowAnchor?
    var titles: [TypeSelectionRow] = []
    var selection: Binding<Set<String>> = .constant([])
    var select: ((String) -> Void)?
    var reselect: ((String) -> Void)?
    var activate: ((Set<String>) -> Void)?

    func makeNSView(context: Context) -> Probe { Probe() }
    func updateNSView(_ view: Probe, context: Context) {
        if view.titles != titles { view.typing = RowTypeSelection() }
        view.ids = ids; view.anchor = anchor
        view.titles = titles; view.selection = selection; view.select = select
        view.reselect = reselect; view.activate = activate
        view.changed = { anchor = $0 }
        view.scheduleUpdate()
    }
    static func dismantleNSView(_ view: Probe, coordinator: ()) { view.stopObserving() }

    final class Probe: NSView {
        var ids: [String?] = []
        var anchor: RowAnchor?
        var changed: ((RowAnchor) -> Void)?
        var titles: [TypeSelectionRow] = []
        var selection: Binding<Set<String>> = .constant([])
        var select: ((String) -> Void)?
        var reselect: ((String) -> Void)?
        var activate: ((Set<String>) -> Void)?
        var typing = RowTypeSelection()
        private var inputMonitor: Any?
        private weak var table: NSTableView?
        private var observation: NSObjectProtocol?
        private var applied: RowAnchor?
        private var scheduled = false
        private var restoring = false
        override func hitTest(_ point: NSPoint) -> NSView? { nil }
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            if window == nil { stopObserving() } else { scheduleUpdate() }
        }
        override func layout() { super.layout(); scheduleUpdate() }
        func scheduleUpdate() {
            guard !scheduled else { return }; scheduled = true
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }; self.scheduled = false; self.updateTable()
            }
        }
        func stopObserving() {
            if let observation { NotificationCenter.default.removeObserver(observation) }
            observation = nil; table = nil
            if let inputMonitor { NSEvent.removeMonitor(inputMonitor) }
            inputMonitor = nil
        }
        isolated deinit {
            if let observation { NotificationCenter.default.removeObserver(observation) }
            if let inputMonitor { NSEvent.removeMonitor(inputMonitor) }
        }
        private func findTable(_ view: NSView) -> NSTableView? {
            if let table = view as? NSTableView { return table }
            for child in view.subviews { if let result = findTable(child) { return result } }
            return nil
        }
        func updateTable() {
            guard window != nil else { return }
            var parent = superview
            var found: NSTableView?
            while let view = parent {
                found = findTable(view)
                if found != nil { break }
                parent = view.superview
            }
            guard let found, let scrollView = found.enclosingScrollView else { return }
            let clip = scrollView.contentView
            if table !== found {
                stopObserving(); table = found; applied = nil
                inputMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .leftMouseDown]) { [weak self] event in
                    guard let self else { return event }
                    if event.type == .keyDown { return self.handleKey(event) }
                    self.handleMouseDown(event)
                    return event
                }
                clip.postsBoundsChangedNotifications = true
                observation = NotificationCenter.default.addObserver(forName: NSView.boundsDidChangeNotification, object: clip, queue: .main) { [weak self] _ in
                    MainActor.assumeIsolated { self?.capture() }
                }
            }
            // The data source must have caught up before using its row ordinals.
            guard found.numberOfRows == ids.count else { return }
            if let anchor, anchor != applied, let index = ids.firstIndex(of: anchor.id) {
                restoring = true
                // Rects are in document coordinates. Leave the row below the
                // floating header and keep short lists at their native top.
                let header = found.headerView?.frame.height ?? 0
                let top = clip.documentRect.minY - scrollView.contentInsets.top
                let lastRow = found.rect(ofRow: found.numberOfRows - 1)
                let fits = lastRow.maxY <= top + clip.bounds.height - scrollView.contentInsets.bottom
                var bounds = clip.bounds
                bounds.origin.y = fits || index == 0 ? top : max(top, found.rect(ofRow: index).minY - header)
                clip.scroll(to: clip.constrainBoundsRect(bounds).origin)
                scrollView.reflectScrolledClipView(clip)
                applied = anchor; restoring = false
            }
        }
        func handleMouseDown(_ event: NSEvent) {
            guard let reselect, let table, let window,
                  event.windowNumber == window.windowNumber, event.clickCount == 1 else { return }
            let point = table.convert(event.locationInWindow, from: nil)
            guard event.modifierFlags.intersection([.command, .shift, .control]).isEmpty,
                  table.visibleRect.contains(point), table.numberOfRows == ids.count,
                  let content = window.contentView,
                  let hit = content.hitTest(content.superview?.convert(event.locationInWindow, from: nil) ?? event.locationInWindow),
                  hit === table || hit.isDescendant(of: table) else { return }
            var hitView: NSView? = hit
            while let view = hitView, view !== table {
                if view is NSControl { return }
                hitView = view.superview
            }
            let index = table.row(at: point)
            guard ids.indices.contains(index), let id = ids[index] else { return }
            let previousSelection = selection.wrappedValue
            let wasSelected = previousSelection.contains(id) || table.selectedRowIndexes.contains(index)
            // A click on a row gives that list its keyboard commands, even if
            // the row was restored as selected before the list received focus.
            if window.firstResponder !== table { window.makeFirstResponder(table) }
            guard wasSelected else { return }
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                // The native click may clear the selection or leave it intact.
                // A new selection (for example from Command-A) takes precedence.
                let current = self.selection.wrappedValue
                if current.isEmpty || current == previousSelection || current == [id] { reselect(id) }
            }
        }
        func handleKey(_ event: NSEvent) -> NSEvent? {
            // Only the list's native responder can type-select. Field editors,
            // search, sheets and other windows retain all of their typing.
            guard let table, let window, event.windowNumber == window.windowNumber,
                  let responder = window.firstResponder as? NSView,
                  !(responder is NSTextView), !(responder is NSTextField),
                  responder === table || responder.isDescendant(of: table) else { return event }
            let modifiers = event.modifierFlags.intersection([.command, .control, .option, .shift])
            let listHasFocus = responder === table || !(responder is NSControl)
            if reselect != nil, listHasFocus, modifiers == .command, event.charactersIgnoringModifiers == "a" {
                table.selectAll(nil)
                return nil
            }
            let selection = selection.wrappedValue
            if let activate, !selection.isEmpty, listHasFocus, modifiers.isEmpty,
               ["\r", "\u{3}"].contains(event.charactersIgnoringModifiers) {
                if !event.isARepeat { activate(selection) }
                return nil
            }
            guard event.modifierFlags.intersection([.command, .control]).isEmpty,
                  let text = event.characters, !text.isEmpty,
                  text.unicodeScalars.allSatisfy({ CharacterSet.alphanumerics.union(.punctuationCharacters).contains($0) }),
                  let select else { return event }
            guard let id = typing.select(text, in: titles,
                selected: selection.count == 1 ? selection.first : nil, at: event.timestamp) else { return event }
            select(id)
            if let index = ids.firstIndex(of: id) {
                let value = RowAnchor(id: id, index: ids[..<index].compactMap { $0 }.count)
                anchor = value; changed?(value)
                // Reveal even when the matching ID is already the saved anchor.
                table.scrollRowToVisible(index)
            }
            return nil
        }

        private func capture() {
            guard !restoring, let table, table.numberOfRows == ids.count else { return }
            // Initial layout notifications must not replace an archive before it is applied.
            guard anchor == nil || applied != nil else { return }
            let range = table.rows(in: table.visibleRect)
            guard range.location != NSNotFound else { return }
            let end = min(NSMaxRange(range), ids.count)
            guard let index = (range.location..<end).first(where: { ids[$0] != nil }), let id = ids[index] else { return }
            let value = RowAnchor(id: id, index: ids[..<index].compactMap { $0 }.count)
            applied = value
            if anchor != value { anchor = value; changed?(value) }
        }
    }
}

extension WindowModel {
    /// An outgoing AppKit view can still emit selection and bounds changes during teardown.
    func listBinding<Value>(_ path: ReferenceWritableKeyPath<WindowModel, Value>) -> Binding<Value> {
        let list = listID
        return Binding(get: { self[keyPath: path] }, set: {
            if self.listID == list { self[keyPath: path] = $0 }
        })
    }

    func episodeSelection(episodeIDs: [String], otherIDs: [String] = []) -> Binding<Set<String>> {
        let selection = listBinding(\.selection)
        let allowed = Set(episodeIDs).union(otherIDs)
        return Binding(get: { selection.wrappedValue }, set: { ids in
            let selected = ids.intersection(allowed)
            if selection.wrappedValue != selected { selection.wrappedValue = selected }
        })
    }
}

extension SwiftUI.View {
    /// One native responder handler for every selectable custom List and Table.
    /// Passing physical rows separately preserves Section-header scroll offsets.
    func typeSelectingRows(_ rows: [TypeSelectionRow], physicalIDs: [String?]? = nil,
                           selection: Binding<Set<String>>, anchor: Binding<RowAnchor?>,
                           reselect: ((String) -> Void)? = nil,
                           activate: ((Set<String>) -> Void)? = nil) -> some SwiftUI.View {
        background(MacRowScroll(ids: physicalIDs ?? rows.map { Optional($0.id) }, anchor: anchor,
            titles: rows, selection: selection, select: { selection.wrappedValue = [$0] },
            reselect: reselect, activate: activate))
    }

    func typeSelectingRows(_ rows: [TypeSelectionRow], physicalIDs: [String?]? = nil,
                           selection: Binding<String?>, anchor: Binding<RowAnchor?>,
                           activate: ((Set<String>) -> Void)? = nil) -> some SwiftUI.View {
        typeSelectingRows(rows, physicalIDs: physicalIDs, selection: Binding<Set<String>>(
            get: { selection.wrappedValue.map { [$0] } ?? [] },
            set: { selection.wrappedValue = $0.first }), anchor: anchor, activate: activate)
    }

    func restoringRows(_ ids: [String?], anchor: Binding<RowAnchor?>) -> some SwiftUI.View {
        background(MacRowScroll(ids: ids, anchor: anchor))
    }
}
#endif
