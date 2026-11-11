import SwiftUI
import PodListUI

@main
struct PodListMac: App {
    @NSApplicationDelegateAdaptor(MacApplicationDelegate.self) private var delegate
    @State private var model = ApplicationModel()
    @Environment(\.openWindow) private var openWindow

    var body: some Scene {
        WindowGroup("PodList") {
            PodListWindow(app: model)
                .onAppear { delegate.model = model }
        }
        .defaultSize(width: 1180, height: 760)
        .commands {
            SidebarCommands()
            PodListCommands()
            PlaybackCommands(app: model)
            PlaylistEditingCommands(app: model)
            CommandGroup(replacing: .help) {
                Button("PodList Help") { openWindow(id: "help") }
            }
        }
        Settings { PodListSettings(app: model) }
        Window("PodList Help", id: "help") { PodListHelp() }
            .windowResizability(.contentSize)
    }
}

/// SwiftPM runs a bare executable until app-bundle packaging is added.
@MainActor
final class MacApplicationDelegate: NSObject, NSApplicationDelegate {
    weak var model: ApplicationModel?
    private var keyboard: PlaybackKeyboardGuard?
    private var terminating = false
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard !terminating else { return .terminateNow }
        terminating = true
        Task { await model?.shutdownPlayback(); sender.reply(toApplicationShouldTerminate: true) }
        return .terminateLater
    }
    func applicationDidResignActive(_ notification: Notification) { model?.playback?.flush() }
    func applicationDidFinishLaunching(_ notification: Notification) {
        keyboard = PlaybackKeyboardGuard()
        NSApplication.shared.setActivationPolicy(.regular)
        NSApplication.shared.activate()
    }
}
