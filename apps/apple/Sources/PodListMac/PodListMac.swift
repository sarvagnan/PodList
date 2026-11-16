import SwiftUI
import PodListUI
import PodListAutomation
import AppIntents

@main
struct PodListMac: App {
    @NSApplicationDelegateAdaptor(MacApplicationDelegate.self) private var delegate
    @State private var model: ApplicationModel
    @State private var pendingOPMLFiles: [URL] = []
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

    /// Retain cold-open files until the Library is ready. Opening a document only
    /// stages the same preview used by File > Import OPML; it never subscribes.
    private func stageOPMLFiles() {
        guard let editor = model.libraryEditing, !editor.busy, !pendingOPMLFiles.isEmpty else { return }
        let urls = pendingOPMLFiles
        pendingOPMLFiles = []
        Task { await editor.selectOPMLFiles(urls) }
    }

    var body: some Scene {
        WindowGroup("PodList", id: "library", for: LibraryWindowTarget.self) { $target in
            PodListWindow(app: model, initialDestination: target?.destination).macTextSize(textSize)
                .onAppear { delegate.model = model }
                .onOpenURL { url in
                    guard url.isFileURL, url.pathExtension.lowercased() == "opml" else { return }
                    pendingOPMLFiles.append(url)
                    stageOPMLFiles()
                }
                .onChange(of: model.libraryEditing?.scope) { _, _ in stageOPMLFiles() }
                .onChange(of: model.libraryEditing?.busy) { _, _ in stageOPMLFiles() }
        }
        .defaultSize(width: 1180, height: 760)
        .commands {
            LibrarySidebarCommands()
            MacTextSizeCommands(preference: textSize)
            TextEditingCommands()
            PodListCommands()
            LibraryCommands(app: model)
            AdditionalMenuCommands(app: model)
            PlaylistEditingCommands(app: model)
            PlaybackCommands(app: model)
            // One Help group: a later replacing: .help removed items other groups added after it.
            CommandGroup(replacing: .help) {
                Button("PodList Help") { openWindow(id: "help") }
                Button("Getting Started") { openWindow(id: "getting-started") }.disabled(model.libraryEditing == nil)
            }
        }
        UtilityWindow("Add Podcasts", id: "add-podcasts") { AddPodcastsWindow(app: model).macTextSize(textSize) }
            .defaultSize(width: 650, height: 600)
            .windowResizability(.contentMinSize)
        Window("Now Playing", id: "now-playing") { NowPlayingWindow(app: model).macTextSize(textSize) }
            .defaultSize(width: 560, height: 800)
            .windowResizability(.contentMinSize)
        Settings { PodListSettings(app: model).macTextSize(textSize) }
        Window("Listening Stats", id: "listening-stats") { ListeningStatsScreen(app: model).macTextSize(textSize) }
        Window("Getting Started", id: "getting-started") { GettingStartedWindow(app: model).macTextSize(textSize) }
            .windowResizability(.contentSize)
        Window("PodList Help", id: "help") { PodListHelp().macTextSize(textSize) }
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
        // Runtime registration can refresh system suggestions; keep metadata extraction
        // unconditional, but only ask the system to refresh in eligible release builds.
        if model?.donations.isEnabled == true {
            PodListShortcuts.updateAppShortcutParameters()
        }
        NSApplication.shared.setActivationPolicy(.regular)
        NSApplication.shared.activate()
    }
}
