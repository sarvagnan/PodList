#if os(macOS)
import AppKit
import SwiftUI

/// A background observer never participates in the split view's sizing negotiation.
/// Only a drag starting on the sidebar divider records a width; layout, window resizing
/// and showing/hiding panes must not overwrite the user's saved preference.
struct MacSidebarWidth: NSViewRepresentable {
    let changed: (Double) -> Void

    func makeNSView(context: Context) -> Probe { Probe() }
    func updateNSView(_ view: Probe, context: Context) {
        view.recorder.changed = changed
        view.scheduleAttachment()
    }
    static func dismantleNSView(_ view: Probe, coordinator: ()) { view.stopObserving() }

    final class Probe: NSView {
        let recorder = PaneWidthRecorder()
        private weak var splitView: NSSplitView?
        private var observation: NSObjectProtocol?
        private var eventMonitor: Any?
        private var trackingDivider = false
        private var scheduled = false

        override func hitTest(_ point: NSPoint) -> NSView? { nil }
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            if window == nil { stopObserving() } else { scheduleAttachment() }
        }
        override func layout() { super.layout(); scheduleAttachment() }

        func scheduleAttachment() {
            guard !scheduled else { return }
            scheduled = true
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                self.scheduled = false
                self.attach()
            }
        }

        private func attach() {
            guard window != nil else { return }
            var parent = superview
            while let view = parent {
                if let split = view as? NSSplitView, split.isVertical,
                   split.subviews.count >= 2, isDescendant(of: split.subviews[0]) {
                    guard split !== splitView else { return }
                    stopObserving()
                    splitView = split
                    observation = NotificationCenter.default.addObserver(
                        forName: NSSplitView.didResizeSubviewsNotification, object: split, queue: .main
                    ) { [weak self] _ in
                        MainActor.assumeIsolated {
                            guard let self, self.trackingDivider, NSEvent.pressedMouseButtons & 1 != 0 else { return }
                            self.capture()
                        }
                    }
                    eventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .leftMouseUp]) { [weak self] event in
                        MainActor.assumeIsolated { self?.handle(event) }
                        return event
                    }
                    return
                }
                parent = view.superview
            }
        }

        private func handle(_ event: NSEvent) {
            guard let splitView, event.window === window else { return }
            if event.type == .leftMouseDown {
                let leading = splitView.subviews[0].frame
                let divider = NSRect(x: leading.maxX, y: splitView.bounds.minY,
                                     width: splitView.dividerThickness, height: splitView.bounds.height)
                trackingDivider = divider.insetBy(dx: -4, dy: 0).contains(splitView.convert(event.locationInWindow, from: nil))
            } else {
                trackingDivider = false
            }
        }

        private func capture() {
            guard let splitView, window?.inLiveResize == false,
                  !splitView.isSubviewCollapsed(splitView.subviews[0]) else { return }
            recorder.record(Double(splitView.subviews[0].frame.width))
        }

        func stopObserving() {
            if let observation { NotificationCenter.default.removeObserver(observation) }
            if let eventMonitor { NSEvent.removeMonitor(eventMonitor) }
            observation = nil; eventMonitor = nil; splitView = nil; trackingDivider = false
            recorder.flush()
        }
        isolated deinit {
            if let observation { NotificationCenter.default.removeObserver(observation) }
            if let eventMonitor { NSEvent.removeMonitor(eventMonitor) }
        }
    }
}
#endif
