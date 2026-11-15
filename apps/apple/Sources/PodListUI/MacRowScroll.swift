#if os(macOS)
import AppKit
import SwiftUI

/// Tables and Lists use AppKit row scrolling on macOS. Observe the clip view,
/// preserving reading position independently of selection, focus and playback.
struct MacRowScroll: NSViewRepresentable {
    var ids: [String?]
    @Binding var anchor: RowAnchor?
    var titles: [TypeSelectionRow] = []
    var selection: Set<String> = []
    var select: ((String) -> Void)?

    func makeNSView(context: Context) -> Probe { Probe() }
    func updateNSView(_ view: Probe, context: Context) {
        if view.titles != titles { view.typing = RowTypeSelection() }
        view.ids = ids; view.anchor = anchor
        view.titles = titles; view.selection = selection; view.select = select
        view.changed = { anchor = $0 }
        view.scheduleUpdate()
    }
    static func dismantleNSView(_ view: Probe, coordinator: ()) { view.stopObserving() }

    final class Probe: NSView {
        var ids: [String?] = []
        var anchor: RowAnchor?
        var changed: ((RowAnchor) -> Void)?
        var titles: [TypeSelectionRow] = []
        var selection: Set<String> = []
        var select: ((String) -> Void)?
        var typing = RowTypeSelection()
        private var keyMonitor: Any?
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
            if let keyMonitor { NSEvent.removeMonitor(keyMonitor) }
            keyMonitor = nil
        }
        isolated deinit {
            if let observation { NotificationCenter.default.removeObserver(observation) }
            if let keyMonitor { NSEvent.removeMonitor(keyMonitor) }
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
            guard let found, let clip = found.enclosingScrollView?.contentView else { return }
            if table !== found {
                stopObserving(); table = found; applied = nil
                keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
                    guard let self else { return event }
                    return self.typeSelect(event)
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
                let y = found.rect(ofRow: index).minY
                clip.scroll(to: NSPoint(x: clip.bounds.minX, y: y))
                found.enclosingScrollView?.reflectScrolledClipView(clip)
                applied = anchor; restoring = false
            }
        }
        func typeSelect(_ event: NSEvent) -> NSEvent? {
            // Only the list's native responder can type-select. Field editors,
            // search, sheets and other windows retain all of their typing.
            guard let table, let window, event.windowNumber == window.windowNumber,
                  let responder = window.firstResponder as? NSView,
                  !(responder is NSTextView), !(responder is NSTextField),
                  responder === table || responder.isDescendant(of: table),
                  event.modifierFlags.intersection([.command, .control]).isEmpty,
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

extension SwiftUI.View {
    /// One native responder handler for every selectable custom List and Table.
    /// Passing physical rows separately preserves Section-header scroll offsets.
    func typeSelectingRows(_ rows: [TypeSelectionRow], physicalIDs: [String?]? = nil,
                           selection: Binding<Set<String>>, anchor: Binding<RowAnchor?>) -> some SwiftUI.View {
        background(MacRowScroll(ids: physicalIDs ?? rows.map { Optional($0.id) }, anchor: anchor,
            titles: rows, selection: selection.wrappedValue, select: { selection.wrappedValue = [$0] }))
    }

    func typeSelectingRows(_ rows: [TypeSelectionRow], physicalIDs: [String?]? = nil,
                           selection: Binding<String?>, anchor: Binding<RowAnchor?>) -> some SwiftUI.View {
        typeSelectingRows(rows, physicalIDs: physicalIDs, selection: Binding<Set<String>>(
            get: { selection.wrappedValue.map { [$0] } ?? [] },
            set: { selection.wrappedValue = $0.first }), anchor: anchor)
    }

    func restoringRows(_ ids: [String?], anchor: Binding<RowAnchor?>) -> some SwiftUI.View {
        background(MacRowScroll(ids: ids, anchor: anchor))
    }
}
#endif
