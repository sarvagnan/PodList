#if DEBUG && os(macOS)
import AppKit
import Darwin
import QuartzCore
import SwiftUI

/// Records only the five results exercised by the Mac UI tour.
@MainActor
public final class TourResponseTiming {
    enum Step: String {
        case sidebar, inspector, playlist, settings, filter

        func matches(_ event: NSEvent) -> Bool {
            if self == .sidebar || self == .inspector { return event.type == .leftMouseDown }
            guard event.type == .keyDown else { return false }
            let modifiers = event.modifierFlags.intersection([.command, .shift, .option, .control])
            switch self {
            case .playlist: return event.charactersIgnoringModifiers?.lowercased() == "n" && modifiers == [.command, .shift]
            case .settings: return event.charactersIgnoringModifiers == "," && modifiers == .command
            case .filter: return event.charactersIgnoringModifiers == "e" && modifiers.isEmpty
            case .sidebar, .inspector: return false
            }
        }
    }

    fileprivate static let active: TourResponseTiming? = {
        guard let output = outputURL(ProcessInfo.processInfo.environment["PODLIST_UI_TIMINGS_FILE"],
                                     bundleIdentifier: Bundle.main.bundleIdentifier) else { return nil }
        return TourResponseTiming(output: output)
    }()

    nonisolated static func outputURL(_ path: String?, bundleIdentifier: String?,
                                      temporaryDirectory: URL = FileManager.default.temporaryDirectory) -> URL? {
        guard bundleIdentifier?.hasPrefix("app.podlist.uitour.") == true,
              let path, path.hasPrefix("/"), !path.hasSuffix("/"),
              !path.split(separator: "/").contains(where: { $0 == "." || $0 == ".." }) else { return nil }
        let file = URL(fileURLWithPath: path)
        let parent = file.deletingLastPathComponent().resolvingSymlinksInPath().standardizedFileURL
        let roots = [temporaryDirectory, URL(fileURLWithPath: "/private/tmp", isDirectory: true)]
        guard roots.contains(where: {
            let root = $0.resolvingSymlinksInPath().standardizedFileURL.path
            return parent.path == root || parent.path.hasPrefix(root + "/")
        }) else { return nil }
        let output = parent.appendingPathComponent(file.lastPathComponent, isDirectory: false)
        // Reject directories and symlinks, including dangling symlinks.
        if let attributes = try? FileManager.default.attributesOfItem(atPath: output.path),
           attributes[.type] as? FileAttributeType != .typeRegular { return nil }
        return output
    }

    public static func start() { _ = active }

    private let output: URL
    private var monitor: Any?
    private var lastInput: NSEvent?
    private var lastMeasuredInput: [Step: TimeInterval] = [:]
    private var pending: (step: Step, input: TimeInterval, appeared: TimeInterval)?
    private var displayLink: CADisplayLink?

    private init(output: URL) {
        self.output = output
        monitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .keyDown]) { [weak self] event in
            self?.lastInput = event
            return event
        }
    }

    isolated deinit {
        if let monitor { NSEvent.removeMonitor(monitor) }
    }

    fileprivate func appeared(_ step: Step, in window: NSWindow) {
        guard window.isVisible, let event = lastInput, step.matches(event),
              lastMeasuredInput[step] != event.timestamp else { return }
        lastMeasuredInput[step] = event.timestamp
        displayLink?.invalidate()
        pending = (step, event.timestamp, CACurrentMediaTime())
        let link = window.displayLink(target: self, selector: #selector(frameDisplayed(_:)))
        displayLink = link
        link.add(to: .main, forMode: .common)
    }

    @objc private func frameDisplayed(_ link: CADisplayLink) {
        // timestamp describes the last displayed frame. Skip any tick from before
        // the result appeared and use the first subsequent tick on its display.
        let frame = link.timestamp
        guard let pending, frame > pending.appeared else { return }
        link.invalidate()
        displayLink = nil
        self.pending = nil
        let delta = (frame - pending.input) * 1_000
        guard delta >= 0 else { return }
        append("\(pending.step.rawValue)\t\(pending.input)\t\(frame)\t\(delta)\n")
    }

    private func append(_ line: String) {
        let descriptor = Darwin.open(output.path, O_WRONLY | O_APPEND | O_CREAT | O_NOFOLLOW | O_NONBLOCK, 0o600)
        guard descriptor >= 0 else { return }
        let file = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
        defer { try? file.close() }
        var info = stat()
        guard fstat(descriptor, &info) == 0, (info.st_mode & S_IFMT) == S_IFREG else { return }
        try? file.write(contentsOf: Data(line.utf8))
    }
}

extension View {
    @ViewBuilder func tourResponse(_ step: @autoclosure () -> TourResponseTiming.Step?) -> some View {
        if let timing = TourResponseTiming.active {
            // The result may replace content in an already-mounted table or Inspector.
            onChange(of: step(), initial: true) { _, result in
                if let result, let window = NSApp.keyWindow { timing.appeared(result, in: window) }
            }
        } else {
            self
        }
    }

    @ViewBuilder func tourWindowResponse(_ step: TourResponseTiming.Step) -> some View {
        if TourResponseTiming.active != nil {
            background(TourWindowAppearance(step: step).allowsHitTesting(false).accessibilityHidden(true))
        } else {
            self
        }
    }
}

/// Observe the actual sheet or Settings window, including when SwiftUI reuses it.
private struct TourWindowAppearance: NSViewRepresentable {
    let step: TourResponseTiming.Step

    func makeNSView(context: Context) -> Probe { Probe(step: step) }
    func updateNSView(_ view: Probe, context: Context) {}

    final class Probe: NSView {
        let step: TourResponseTiming.Step

        init(step: TourResponseTiming.Step) {
            self.step = step
            super.init(frame: .zero)
        }

        required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            let center = NotificationCenter.default
            center.removeObserver(self)
            guard let window else { return }
            for name in [NSWindow.didBecomeKeyNotification, NSWindow.didChangeOcclusionStateNotification] {
                center.addObserver(self, selector: #selector(visibilityChanged(_:)), name: name, object: window)
            }
            recordIfVisible()
        }

        @objc private func visibilityChanged(_ notification: Notification) { recordIfVisible() }

        private func recordIfVisible() {
            guard let window, window.isKeyWindow || window.occlusionState.contains(.visible) else { return }
            TourResponseTiming.active?.appeared(step, in: window)
        }
    }
}
#endif
