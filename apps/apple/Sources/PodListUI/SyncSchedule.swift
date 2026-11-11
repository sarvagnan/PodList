import Foundation

/// One timeout after each pass. The first trigger starts a fixed two-second settling window.
/// Triggers during a pass request one more pass, so edits made after its push are not lost.
struct SyncSchedule {
    enum Phase { case waiting, settling, running }
    private(set) var phase = Phase.waiting
    private var pending = false
    static let timeout = Duration.seconds(60)
    static let settle = Duration.seconds(2)

    mutating func trigger() -> Bool {
        switch phase {
        case .waiting: phase = .settling; return true
        case .settling: return false
        case .running: pending = true; return false
        }
    }
    mutating func timeoutReached() { phase = .settling }
    mutating func begin() { phase = .running; pending = false }
    mutating func finish() -> Duration {
        phase = pending ? .settling : .waiting
        pending = false
        return phase == .settling ? Self.settle : Self.timeout
    }
}
