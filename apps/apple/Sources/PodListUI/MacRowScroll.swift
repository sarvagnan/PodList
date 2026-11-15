#if os(macOS)
import AppKit
import SwiftUI

/// Tables and Lists use AppKit row scrolling on macOS. Observe the clip view,
/// preserving reading position independently of selection, focus and playback.
struct MacRowScroll: NSViewRepresentable {
    var ids: [String?]
    @Binding var anchor: RowAnchor?

    func makeNSView(context: Context) -> Probe { Probe() }
    func updateNSView(_ view: Probe, context: Context) {
        view.ids = ids; view.anchor = anchor
        view.changed = { anchor = $0 }
        view.scheduleUpdate()
    }
    static func dismantleNSView(_ view: Probe, coordinator: ()) { view.stopObserving() }

    final class Probe: NSView {
        var ids: [String?] = []
        var anchor: RowAnchor?
        var changed: ((RowAnchor) -> Void)?
        private weak var table: NSTableView?
        private var observation: NSObjectProtocol?
        private var applied: RowAnchor?
        private var scheduled = false
        private var restoring = false
        override func viewDidMoveToWindow() { super.viewDidMoveToWindow(); scheduleUpdate() }
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
        }
        private func findTable(_ view: NSView) -> NSTableView? {
            if let table = view as? NSTableView { return table }
            for child in view.subviews { if let result = findTable(child) { return result } }
            return nil
        }
        private func updateTable() {
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
    func restoringRows(_ ids: [String?], anchor: Binding<RowAnchor?>) -> some SwiftUI.View {
        background(MacRowScroll(ids: ids, anchor: anchor))
    }
}
#endif
