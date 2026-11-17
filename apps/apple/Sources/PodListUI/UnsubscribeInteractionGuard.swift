#if os(macOS)
import AppKit
import SwiftUI

/// Watch the whole window, including toolbar and other panes, without swallowing input.
struct UnsubscribeInteractionGuard: NSViewRepresentable {
    let armed: Bool
    let focused: Bool
    let disarm: () -> Void
    func makeNSView(context: Context) -> Probe { Probe(guard: self) }
    func updateNSView(_ view: Probe, context: Context) { view.guardValue = self }

    final class Probe: NSView {
        var guardValue: UnsubscribeInteractionGuard
        private var monitor: Any?
        private var observer: NSObjectProtocol?
        init(guard value: UnsubscribeInteractionGuard) { guardValue = value; super.init(frame: .zero) }
        required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
        override func hitTest(_ point: NSPoint) -> NSView? { nil }
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            stop()
            guard let window else { return }
            observer = NotificationCenter.default.addObserver(forName: NSWindow.didResignKeyNotification, object: window, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.guardValue.disarm() }
            }
            monitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown, .otherMouseDown, .keyDown, .scrollWheel]) { [weak self] event in
                MainActor.assumeIsolated {
                    guard let self, self.guardValue.armed else { return }
                    let sameButton = event.type == .leftMouseDown && event.window === self.window
                        && self.bounds.contains(self.convert(event.locationInWindow, from: nil))
                    let sameKeyboardAction = event.type == .keyDown && self.guardValue.focused
                        && [" ", "\r"].contains(event.charactersIgnoringModifiers ?? "")
                        && event.modifierFlags.intersection([.command, .control, .option]).isEmpty
                    if !sameButton && !sameKeyboardAction { self.guardValue.disarm() }
                }
                return event
            }
        }
        private func stop() {
            if let monitor { NSEvent.removeMonitor(monitor) }; monitor = nil
            if let observer { NotificationCenter.default.removeObserver(observer) }; observer = nil
        }
        isolated deinit { stop() }
    }
}
#endif
