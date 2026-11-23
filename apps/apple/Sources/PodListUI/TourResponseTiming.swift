#if (DEBUG || PODLIST_UI_TOUR) && os(macOS)
import AppKit
import Darwin
import OSLog
import QuartzCore
import SwiftUI

/// Records only the five results exercised by the Mac UI tour.
@MainActor
public final class TourResponseTiming {
    enum Step: String, CaseIterable {
        case sidebar, inspector, playlist, settings, filter

        var signpostName: StaticString {
            switch self {
            case .sidebar: "sidebar"
            case .inspector: "inspector"
            case .playlist: "new-playlist-sheet"
            case .settings: "settings"
            case .filter: "filter"
            }
        }

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

    #if PODLIST_UI_TOUR
    static var isActive: Bool { active != nil }

    static func inspectorSelectionHandled(_ id: String) {
        guard let timing = active, let event = timing.lastInput, Step.inspector.matches(event) else { return }
        timing.inspectorPhases = InspectorPhases(id: id, input: event.timestamp, selection: CACurrentMediaTime())
    }

    static func inspectorBodyEvaluated(_ id: String) {
        guard let timing = active, var phases = timing.inspectorPhases,
              phases.id == id, phases.input == timing.lastInput?.timestamp, phases.body == nil else { return }
        phases.body = CACurrentMediaTime()
        timing.inspectorPhases = phases
    }
    #endif

    private struct InspectorPhases {
        let id: String
        let input: TimeInterval
        let selection: TimeInterval
        var body: TimeInterval?
    }

    private let output: URL
    private let signposter = OSSignposter(subsystem: "app.podlist", category: "ResponseTiming")
    private var monitor: Any?
    private var lastInput: NSEvent?
    private var inputIntervals: [Step: OSSignpostIntervalState] = [:]
    private var lastMeasuredInput: [Step: TimeInterval] = [:]
    private var pending: (step: Step, input: TimeInterval, appeared: TimeInterval, interval: OSSignpostIntervalState?, inspectorID: String?)?
    private var inspectorPhases: InspectorPhases?
    private var displayLink: CADisplayLink?

    private init(output: URL) {
        self.output = output
        monitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .keyDown]) { [weak self] event in
            self?.recordInput(event)
            return event
        }
    }

    isolated deinit {
        if let monitor { NSEvent.removeMonitor(monitor) }
    }

    private func recordInput(_ event: NSEvent) {
        lastInput = event
        for (step, interval) in inputIntervals {
            signposter.endInterval(step.signpostName, interval, "unobserved")
        }
        inputIntervals.removeAll(keepingCapacity: true)
        guard signposter.isEnabled else { return }
        // Start before AppKit dispatches the event. A click can lead to either
        // result, so the appearance probe decides which interval was observed.
        for step in Step.allCases where step.matches(event) {
            inputIntervals[step] = signposter.beginInterval(step.signpostName, id: signposter.makeSignpostID())
        }
    }

    fileprivate func appeared(_ step: Step, in window: NSWindow, inspectorID: String? = nil) {
        guard window.isVisible, let event = lastInput, step.matches(event),
              lastMeasuredInput[step] != event.timestamp else { return }
        lastMeasuredInput[step] = event.timestamp
        displayLink?.invalidate()
        if let pending, let interval = pending.interval {
            signposter.endInterval(pending.step.signpostName, interval, "unobserved")
        }
        pending = (step, event.timestamp, CACurrentMediaTime(), inputIntervals.removeValue(forKey: step), inspectorID)
        let link = window.displayLink(target: self, selector: #selector(frameDisplayed(_:)))
        displayLink = link
        link.add(to: .main, forMode: .common)
    }

    @objc private func frameDisplayed(_ link: CADisplayLink) {
        // timestamp is the frame already on screen when this tick fires, which can
        // predate the result's commit. targetTimestamp is the frame this tick prepares,
        // the first that can contain the result, so the figure errs late by up to a frame.
        let frame = link.targetTimestamp
        guard let pending, frame > pending.appeared else { return }
        link.invalidate()
        displayLink = nil
        self.pending = nil
        let delta = (frame - pending.input) * 1_000
        if let interval = pending.interval {
            signposter.endInterval(pending.step.signpostName, interval, "response_ms=\(delta, privacy: .public)")
        }
        guard delta >= 0 else { return }
        var line = "\(pending.step.rawValue)\t\(pending.input)\t\(frame)\t\(delta)"
        if let phases = inspectorPhases, pending.inspectorID == phases.id,
           pending.input == phases.input, let body = phases.body, body >= phases.selection, frame >= body {
            line += "\t\(phases.selection)\t\(body)"
        }
        append(line + "\n")
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

    #if PODLIST_UI_TOUR
    /// Re-arm while the pane stays open and the selected Episode changes.
    @ViewBuilder func tourInspectorResponse(key: String?) -> some View {
        if let timing = TourResponseTiming.active {
            onChange(of: key, initial: true) { _, id in
                if let id, let window = NSApp.keyWindow { timing.appeared(.inspector, in: window, inspectorID: id) }
            }
        } else {
            self
        }
    }
    #endif

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
