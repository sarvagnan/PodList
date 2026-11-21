#if os(macOS)
import AppKit
import SwiftUI

/// macOS can retain the native Inspector item's fixed 270 pt size despite
/// SwiftUI's width preferences. Scope the correction to that pane's divider.
struct MacInspectorWidth: NSViewRepresentable {
    let presented: Bool
    let preferred: CGFloat
    let maximum: CGFloat
    let changed: (Double) -> Void

    func makeNSView(context: Context) -> Probe { Probe() }
    func updateNSView(_ view: Probe, context: Context) {
        view.update(presented: presented, preferred: preferred, maximum: maximum, changed: changed)
    }
    static func dismantleNSView(_ view: Probe, coordinator: ()) { view.detach() }

    @MainActor
    final class Probe: NSView {
        private weak var splitView: NSSplitView?
        private var resizeObservation: NSObjectProtocol?
        private var mouseMonitor: Any?
        private var dragWidth: CGFloat?
        private let recorder = PaneWidthRecorder(range: PaneWidths.inspectorMinimum...PaneWidths.inspectorMaximum)
        private var presented = false
        private var preferred: CGFloat = PaneWidths.inspectorIdeal
        private var maximum: CGFloat = PaneWidths.inspectorMaximum
        private var positioned = false
        private var scheduled = false

        override func hitTest(_ point: NSPoint) -> NSView? { nil }
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            if window == nil { detach() }
            else { schedule() }
        }
        override func layout() {
            super.layout()
            schedule()
        }

        func update(presented: Bool, preferred: CGFloat, maximum: CGFloat, changed: @escaping (Double) -> Void) {
            if !presented { positioned = false }
            self.presented = presented
            self.preferred = preferred
            self.maximum = maximum
            recorder.changed = changed
            schedule()
        }

        private func schedule() {
            guard !scheduled else { return }
            scheduled = true
            // Wait until SwiftUI has installed and laid out the native item.
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                self.scheduled = false
                self.configureDivider()
            }
        }

        private func configureDivider() {
            guard presented, window != nil else { return }
            var ancestor = superview
            while let view = ancestor {
                if let split = view as? NSSplitView, split.isVertical, split.arrangedSubviews.count == 2,
                   let pane = split.arrangedSubviews.last, isDescendant(of: pane) {
                    if split !== splitView { observe(split) }
                    guard !split.isSubviewCollapsed(pane), pane.frame.width > 0 else {
                        positioned = false
                        return
                    }
                    guard dragWidth == nil || NSEvent.pressedMouseButtons & 1 == 0,
                          let controller = split.delegate as? NSSplitViewController,
                          controller.splitView === split,
                          let item = controller.splitViewItems.first(where: {
                              $0.viewController.isViewLoaded && isDescendant(of: $0.viewController.view)
                          }) else { return }
                    positioned = Self.applyWidth(in: split, item: item, preferred: preferred, maximum: maximum,
                                                 alreadyPositioned: positioned)
                    return
                }
                ancestor = view.superview
            }
        }

        /// A width measured on the native split avoids counting the sidebar
        /// twice and keeps the detail column usable if the sidebar was resized.
        @discardableResult
        static func applyWidth(in split: NSSplitView, item: NSSplitViewItem, preferred: CGFloat,
                               maximum: CGFloat, alreadyPositioned: Bool) -> Bool {
            let panes = split.arrangedSubviews
            guard panes.count == 2 else { return false }
            let detail = panes[0], inspector = panes[1]
            guard detail.frame.width > 0, inspector.frame.minX >= detail.frame.maxX - 1 else { return false }
            let minimum = PaneWidths.inspectorMinimum
            let available = detail.frame.width + inspector.frame.width - LibraryPanes.listWidth
            let limit = max(minimum, min(maximum, available))
            let wasFixed = item.minimumThickness == item.maximumThickness
            if item.minimumThickness != minimum { item.minimumThickness = minimum }
            if item.maximumThickness != limit { item.maximumThickness = limit }
            if !alreadyPositioned || wasFixed {
                let width = min(max(minimum, preferred), limit)
                if abs(inspector.frame.width - width) >= 1 {
                    split.setPosition(detail.frame.maxX + inspector.frame.width - width, ofDividerAt: 0)
                }
            }
            return true
        }

        private func observe(_ split: NSSplitView) {
            detach()
            splitView = split
            resizeObservation = NotificationCenter.default.addObserver(
                forName: NSSplitView.didResizeSubviewsNotification, object: split, queue: .main
            ) { [weak self] _ in
                MainActor.assumeIsolated { self?.splitResized() }
            }
            mouseMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .leftMouseUp]) { [weak self] event in
                MainActor.assumeIsolated { self?.handle(event) }
                return event
            }
        }

        private func splitResized() {
            if let splitView, let pane = splitView.arrangedSubviews.last, splitView.isSubviewCollapsed(pane) {
                positioned = false
            }
            if NSEvent.pressedMouseButtons & 1 != 0 { recordDrag() }
            schedule()
        }

        private func handle(_ event: NSEvent) {
            guard let splitView, event.window === window, let pane = splitView.arrangedSubviews.last else { return }
            if event.type == .leftMouseDown {
                let divider = NSRect(x: pane.frame.minX - splitView.dividerThickness, y: splitView.bounds.minY,
                                     width: splitView.dividerThickness, height: splitView.bounds.height)
                let hit = divider.insetBy(dx: -4, dy: 0).contains(splitView.convert(event.locationInWindow, from: nil))
                dragWidth = presented && hit && !splitView.isSubviewCollapsed(pane) ? pane.frame.width : nil
            } else {
                recordDrag()
                dragWidth = nil
                schedule()
            }
        }

        private func recordDrag() {
            guard let dragWidth, let splitView, window?.inLiveResize == false,
                  let pane = splitView.arrangedSubviews.last, !splitView.isSubviewCollapsed(pane),
                  abs(pane.frame.width - dragWidth) >= 1 else { return }
            self.dragWidth = pane.frame.width
            recorder.record(pane.frame.width)
        }

        func detach() {
            if let resizeObservation { NotificationCenter.default.removeObserver(resizeObservation) }
            if let mouseMonitor { NSEvent.removeMonitor(mouseMonitor) }
            resizeObservation = nil; mouseMonitor = nil; splitView = nil; dragWidth = nil
            positioned = false
            recorder.flush()
        }

        isolated deinit {
            if let resizeObservation { NotificationCenter.default.removeObserver(resizeObservation) }
            if let mouseMonitor { NSEvent.removeMonitor(mouseMonitor) }
        }
    }
}
#endif
