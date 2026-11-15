import Foundation
import Observation
import PodListAutomation

/// This Mac's opt-in listener preference. It never enters Library State or sync.
@MainActor @Observable
public final class AutomationSettings {
    public private(set) var isEnabled: Bool
    public private(set) var error: String? { didSet { announcements.error(error) } }
    @ObservationIgnored let announcements = FeedbackAnnouncements()
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let socketURL: URL?
    @ObservationIgnored private let call: @Sendable (String, JSONValue) async throws -> JSONValue
    @ObservationIgnored private var server: LocalMCPServer?
    private static let enabledKey = "PodList.mcpEnabled"

    public init(defaults: UserDefaults = .standard, socketURL: URL? = nil,
                call: @escaping @Sendable (String, JSONValue) async throws -> JSONValue) {
        self.defaults = defaults; self.socketURL = socketURL; self.call = call
        isEnabled = defaults.bool(forKey: Self.enabledKey)
    }
    public func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        defaults.set(enabled, forKey: Self.enabledKey)
        if enabled { start() } else { stop() }
    }
    public func start() {
        guard isEnabled else { stop(); return }
        guard server == nil else { return }
        error = nil
        do {
            let call = call
            let listener = LocalMCPServer(url: try socketURL ?? LocalSocket.defaultURL()) {
                MCPHandler(tools: AutomationActions.tools, call: call)
            }
            try listener.start()
            server = listener; error = nil
        } catch { self.error = LibraryMessages.failure(error, operation: .automationStart) }
    }
    /// Quit stops the listener but retains the preference for the next launch.
    public func stop() {
        server?.stop(); server = nil; error = nil
        do { try LocalSocket.removeStaleSocket(at: socketURL ?? LocalSocket.defaultURL()) }
        catch { self.error = LibraryMessages.failure(error, operation: .automationStop) }
    }

    public var bridgePath: String {
        // Both the development bundle and bare SwiftPM build keep the bridge beside the app executable.
        Bundle.main.executableURL?.deletingLastPathComponent().appendingPathComponent("podlist-mcp").path ?? "podlist-mcp"
    }
    public var clientConfiguration: String {
        let config: JSONValue = ["mcpServers": ["podlist": ["command": .string(bridgePath)]]]
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return (try? String(decoding: encoder.encode(config), as: UTF8.self)) ?? ""
    }
}
