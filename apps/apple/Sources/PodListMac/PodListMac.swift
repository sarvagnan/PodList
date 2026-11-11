import SwiftUI
import PodListUI
import PodListAutomation
import AppIntents

@main
struct PodListMac: App {
    @NSApplicationDelegateAdaptor(MacApplicationDelegate.self) private var delegate
    @State private var model: ApplicationModel

    init() {
        let model = ApplicationModel()
        _model = State(initialValue: model)
        AutomationRuntime.app = model
    }
    @Environment(\.openWindow) private var openWindow

    var body: some Scene {
        WindowGroup("PodList", id: "library") {
            PodListWindow(app: model)
                .onAppear { delegate.model = model }
        }
        .defaultSize(width: 1180, height: 760)
        .commands {
            SidebarCommands()
            PodListCommands()
            LibraryCommands(app: model)
            PlaybackCommands(app: model)
            PlaylistEditingCommands(app: model)
            CommandGroup(replacing: .help) {
                Button("PodList Help") { openWindow(id: "help") }
            }
        }
        Settings { PodListSettings(app: model) }
        Window("Listening stats", id: "listening-stats") { ListeningStatsScreen(app: model) }
        Window("PodList Help", id: "help") { PodListHelp() }
            .windowResizability(.contentSize)
    }
}

/// App-scoped services outlive every window.
@MainActor
final class MacApplicationDelegate: NSObject, NSApplicationDelegate {
    weak var model: ApplicationModel?
    private var keyboard: PlaybackKeyboardGuard?
    private var terminating = false
    private var mcp: LocalMCPServer?
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard !terminating else { return .terminateNow }
        terminating = true
        mcp?.stop()
        Task { await (model ?? AutomationRuntime.app)?.shutdownPlayback(); sender.reply(toApplicationShouldTerminate: true) }
        return .terminateLater
    }
    func applicationWillTerminate(_ notification: Notification) { mcp?.stop() }
    func applicationDidResignActive(_ notification: Notification) { model?.playback?.flush() }
    func applicationDidFinishLaunching(_ notification: Notification) {
        model = AutomationRuntime.app
        keyboard = PlaybackKeyboardGuard()
        do {
            let server = LocalMCPServer(url: try LocalSocket.defaultURL()) {
                MCPHandler(tools: AutomationActions.tools) { name, arguments in
                    try await AutomationRuntime.perform(name, arguments)
                }
            }
            try server.start(); mcp = server
        } catch { NSLog("PodList MCP: %@", error.localizedDescription) }
        PodListShortcuts.updateAppShortcutParameters()
        NSApplication.shared.setActivationPolicy(.regular)
        NSApplication.shared.activate()
    }
}
