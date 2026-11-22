#if (DEBUG || PODLIST_UI_TOUR) && os(macOS)
import Foundation

/// Only one main-loop probe is outstanding, even during a prolonged stall.
struct TourMainThreadHeartbeat {
    enum Action: Equatable {
        case ping
        case sample(Duration)
    }

    private var pendingSince: ContinuousClock.Instant?
    private var sampled = false

    mutating func tick(at now: ContinuousClock.Instant) -> Action? {
        guard let pendingSince else {
            self.pendingSince = now
            return .ping
        }
        let age = pendingSince.duration(to: now)
        guard age >= .seconds(5), !sampled else { return nil }
        sampled = true
        return .sample(age)
    }

    mutating func acknowledge() {
        pendingSince = nil
        sampled = false
    }
}

#if PODLIST_UI_TOUR
import CoreFoundation
import Synchronization

public final class TourMainThreadWatchdog: Sendable {
    private static let active: TourMainThreadWatchdog? = {
        guard let bundleID = Bundle.main.bundleIdentifier, bundleID.hasPrefix("app.podlist.uitour."),
              ProcessInfo.processInfo.environment["PODLIST_UI_WATCHDOG"] == "1",
              FileManager.default.fileExists(atPath: "/private/tmp/podlist-uitour-run/uitour-vm") else { return nil }
        return TourMainThreadWatchdog(bundleID: bundleID)
    }()

    public static func start() { _ = active }

    private let bundleID: String
    private let timer: any DispatchSourceTimer
    private let heartbeat = Mutex(TourMainThreadHeartbeat())

    private init(bundleID: String) {
        self.bundleID = bundleID
        timer = DispatchSource.makeTimerSource(queue: DispatchQueue(label: "app.podlist.tour-watchdog", qos: .utility))
        timer.schedule(deadline: .now(), repeating: .seconds(1), leeway: .milliseconds(100))
        timer.setEventHandler { [weak self] in self?.tick() }
        timer.resume()
    }

    private func tick() {
        switch heartbeat.withLock({ $0.tick(at: .now) }) {
        case .ping:
            let loop = CFRunLoopGetMain()
            // Common modes keep the heartbeat working while a menu or modal
            // panel runs a nested event loop.
            CFRunLoopPerformBlock(loop, CFRunLoopMode.commonModes.rawValue) { [weak self] in
                self?.heartbeat.withLock { $0.acknowledge() }
            }
            CFRunLoopWakeUp(loop)
        case let .sample(age): capture(age)
        case nil: break
        }
    }

    private func capture(_ age: Duration) {
        let pid = ProcessInfo.processInfo.processIdentifier
        let directory = URL(fileURLWithPath: "/Volumes/My Shared Files/run/guest-diagnostics", isDirectory: true)
        let stem = "main-thread-stall-\(bundleID)-\(pid)-\(UUID())"
        let output = directory.appendingPathComponent(stem + ".txt")
        let log = directory.appendingPathComponent(stem + ".log")
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try Data("\(Date()): main run loop did not answer for \(age). Sampling PID \(pid).\n".utf8).write(to: log)
            let file = try FileHandle(forWritingTo: log)
            defer { try? file.close() }
            try file.seekToEnd()
            // Thread.callStackSymbols would inspect this watchdog queue.
            // sample records all threads, including the stalled main thread.
            let sample = Process()
            sample.executableURL = URL(fileURLWithPath: "/usr/bin/sample")
            sample.arguments = [String(pid), "1", "5", "-mayDie", "-file", output.path]
            sample.standardOutput = file
            sample.standardError = file
            try sample.run()
            sample.waitUntilExit()
        } catch {
            if let file = try? FileHandle(forWritingTo: log) {
                defer { try? file.close() }
                _ = try? file.seekToEnd()
                try? file.write(contentsOf: Data("Could not start sample: \(error)\n".utf8))
            }
        }
    }
}
#endif
#endif
