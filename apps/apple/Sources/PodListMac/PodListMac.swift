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
        }
        .defaultSize(width: 1180, height: 760)
        .commands {
            SidebarCommands()
            PodListCommands()
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
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApplication.shared.setActivationPolicy(.regular)
        NSApplication.shared.activate()
    }
}
