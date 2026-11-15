import SwiftUI
import PodListUI
import PodListAutomation
import AppIntents

@main
struct PodListMac: App {
    @NSApplicationDelegateAdaptor(MacApplicationDelegate.self) private var delegate
    @State private var model: ApplicationModel
    @State private var textSize = MacTextSizePreference()

    init() {
        #if DEBUG
        // Validate before any app service can touch its persistent files.
        do { _ = try ApplicationStorage.directory() }
        catch { fatalError("Invalid UI test storage: \(error)") }
        #endif
        let model = ApplicationModel()
        _model = State(initialValue: model)
        AutomationRuntime.app = model
        model.donations.handler = { [weak model] action in
            guard let model else { return }
            IntentDonations.donate(action, app: model)
        }
    }
    @Environment(\.openWindow) private var openWindow

    var body: some Scene {
        WindowGroup("PodList", id: "library", for: LibraryWindowTarget.self) { $target in
            PodListWindow(app: model, initialDestination: target?.destination).macTextSize(textSize)
                .onAppear { delegate.model = model }
        }
        .defaultSize(width: 1180, height: 760)
        .commands {
            SidebarCommands()
            MacTextSizeCommands(preference: textSize)
            TextEditingCommands()
            PodListCommands()
            LibraryCommands(app: model)
            AdditionalMenuCommands(app: model)
            PlaybackCommands(app: model)
            PlaylistEditingCommands(app: model)
            CommandGroup(replacing: .help) {
                Button("PodList Help") { openWindow(id: "help") }
            }
        }
        Window("Now Playing", id: "now-playing") { NowPlayingWindow(app: model).macTextSize(textSize) }
            .defaultSize(width: 560, height: 800)
            .windowResizability(.contentMinSize)
        Settings { PodListSettings(app: model).macTextSize(textSize).tint(.podListAccent) }
        Window("Listening Stats", id: "listening-stats") { ListeningStatsScreen(app: model).macTextSize(textSize).tint(.podListAccent) }
        Window("Getting Started", id: "getting-started") { GettingStartedWindow(app: model).macTextSize(textSize).tint(.podListAccent) }
            .windowResizability(.contentSize)
        Window("PodList Help", id: "help") { PodListHelp().macTextSize(textSize).tint(.podListAccent) }
            .windowResizability(.contentSize)
    }
}

/// App-scoped services outlive every window.
@MainActor
final class MacApplicationDelegate: NSObject, NSApplicationDelegate {
    weak var model: ApplicationModel?
    private var keyboard: PlaybackKeyboardGuard?
    private var appearance: MacAppearanceController?
    private var terminating = false
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard !terminating else { return .terminateNow }
        terminating = true
        (model ?? AutomationRuntime.app)?.automation.stop()
        Task { await (model ?? AutomationRuntime.app)?.shutdownPlayback(); sender.reply(toApplicationShouldTerminate: true) }
        return .terminateLater
    }
    func applicationWillTerminate(_ notification: Notification) { (model ?? AutomationRuntime.app)?.automation.stop() }
    func applicationDidResignActive(_ notification: Notification) { model?.playback?.flush() }
    func applicationWillFinishLaunching(_ notification: Notification) {
        appearance = MacAppearanceController()
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        model = AutomationRuntime.app
        keyboard = PlaybackKeyboardGuard()
        model?.automation.start()
        PodListShortcuts.updateAppShortcutParameters()
        NSApplication.shared.setActivationPolicy(.regular)
        NSApplication.shared.activate()
    }
}
