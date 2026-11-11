import Foundation
import Darwin
import PodListAutomation

/// Set once the MCP client has closed stdin, so the app closing the socket afterwards is a normal end.
final class InputState: @unchecked Sendable {
    private let lock = NSLock()
    private var ended = false
    func end() { lock.withLock { ended = true } }
    var hasEnded: Bool { lock.withLock { ended } }
}

// stdout is exclusively the MCP stream. Diagnostics go to stderr.
let input = InputState()
do {
    guard CommandLine.arguments.count == 1 else { throw AutomationFailure("Usage: podlist-mcp (open the PodList Mac app first)") }
    let fd = try LocalSocket.connect(to: LocalSocket.defaultURL())
    defer { close(fd) }
    DispatchQueue.global(qos: .utility).async {
        defer { input.end(); _ = shutdown(fd, SHUT_WR) }
        var bytes = [UInt8](repeating: 0, count: 8192)
        while true {
            let n = Darwin.read(STDIN_FILENO, &bytes, bytes.count)
            if n < 0 && errno == EINTR { continue }
            guard n > 0 else { return }
            do { try LocalSocket.write(Data(bytes.prefix(n)), to: fd) } catch { return }
        }
    }
    var bytes = [UInt8](repeating: 0, count: 8192)
    while true {
        let n = Darwin.read(fd, &bytes, bytes.count)
        if n < 0 && errno == EINTR { continue }
        guard n > 0 else { break }
        try LocalSocket.write(Data(bytes.prefix(n)), to: STDOUT_FILENO)
    }
    if !input.hasEnded {
        throw AutomationFailure("PodList closed the connection: MCP was turned off in Settings or the app quit.")
    }
} catch {
    FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8))
    exit(1)
}
