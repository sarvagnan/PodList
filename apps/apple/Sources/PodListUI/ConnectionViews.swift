#if os(macOS)
import SwiftUI

struct WelcomeView: SwiftUI.View {
    @Bindable var app: ApplicationModel
    @AppStorage("PodList.serverDraft") private var serverDraft = ""
    @FocusState private var addressFocused: Bool
    var body: some SwiftUI.View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Image(systemName: "waveform.circle.fill").font(.system(size: 54)).foregroundStyle(Color.podListBrand).accessibilityHidden(true)
                Text("Welcome to PodList").macContentFont(.largeTitle).bold()
                Text("Your Library, Views and Playlists, together on this Mac.").foregroundStyle(MacReadableSecondaryStyle())
                Text("Connect to a Server").macContentFont(.title2).bold().padding(.top, 12)
                Text("Enter your PodList server address. Your Library stays available on this Mac when the server is unreachable.")
                Form {
                    LabeledContent("Server Address") {
                        TextField("", text: $app.serverInput, prompt: Text("https://podlist.example.ts.net"))
                            .accessibilityLabel("Server Address")
                            .textFieldStyle(.roundedBorder).focused($addressFocused).disabled(app.connecting)
                            .labelsHidden()
                            .onSubmit { connect() }
                    }
                }.formStyle(.columns)
                Text("For the local demo, use http://127.0.0.1:PORT.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                if let error = app.connectionError {
                    Label(error, systemImage: "exclamationmark.circle").foregroundStyle(Color.podListError).fixedSize(horizontal: false, vertical: true)
                        .accessibilityLabel("Connection error: " + error)
                }
                HStack {
                    Button(app.connecting ? "Checking…" : "Check and Connect") { connect() }
                        .macDefaultAction()
                        .disabled(app.connecting || app.serverInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .accessibilityLabel(app.connecting ? "Checking…" : "Check and Connect")
                    if app.connecting { ProgressView().controlSize(.small).accessibilityLabel("Checking server") }
                }
                Divider().padding(.vertical, 8)
                Button("Start on This Mac") { Task { await app.startStandalone() } }
                    .disabled(app.connecting).accessibilityHint("Start as a Standalone Device, with no server")
            }.frame(maxWidth: 470, alignment: .leading).padding(40).frame(maxWidth: .infinity)
        }
        .macContentFont(.body)
        .focusedSceneValue(\.podListSettingsActions, MenuActionContext(actions: [
            .connect: !app.connecting && !app.serverInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? { connect() } : nil,
            .standalone: !app.connecting ? { Task { await app.startStandalone() } } : nil
        ].compactMapValues { $0 }))
        .onAppear { if app.serverInput.isEmpty { app.serverInput = serverDraft }; addressFocused = true }
        .onChange(of: app.serverInput) { _, text in serverDraft = text }
    }
    private func connect() {
        guard !app.connecting, !app.serverInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        Task { await app.connect() }
    }
}

public struct PodListSettings: SwiftUI.View {
    @Bindable private var app: ApplicationModel
    @AppStorage("PodList.settingsPane") private var pane = "general"
    @State private var heights: [String: CGFloat] = [:]
    @State private var openedPanes = Set<String>()
    public init(app: ApplicationModel) { self.app = app }
    public var body: some SwiftUI.View {
        TabView(selection: $pane) {
            Tab(value: "general") {
                VStack {
                    if pane == "general" || openedPanes.contains("general") { LibrarySettingsScreen(app: app) }
                }
            } label: {
                Label("General", systemImage: "gearshape").accessibilityIdentifier("General")
            }
            Tab(value: "automation") {
                VStack {
                    if pane == "automation" || openedPanes.contains("automation") {
                        AutomationSettingsScreen(settings: app.automation)
                    }
                }
            } label: {
                Label("Automation", systemImage: "terminal").accessibilityIdentifier("Automation")
            }
        }
        .frame(width: SettingsPaneHeights.width, height: heights[pane] ?? 440)
        .onChange(of: pane, initial: true) { _, current in openedPanes.insert(current) }
        .onPreferenceChange(SettingsPaneHeights.self) { measured in
            for (pane, height) in measured where height > 0 { heights[pane] = height }
        }
        #if DEBUG || PODLIST_UI_TOUR
        .tourWindowResponse(.settings)
        #endif
    }
}

public struct PodListHelp: SwiftUI.View {
    public init() {}
    public var body: some SwiftUI.View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("PodList").macContentFont(.largeTitle).bold()
                Text("Views find Episodes in your Library. Playlists hold Entries in order, each with its own Position.")
                Text("Connect to your server on Welcome. Choose a View, Playlist or Subscriptions in the sidebar. Select an Episode to read its Inspector (⌥⌘I). Press ⌘F to open Library Search. Click the search field in the toolbar to type a Library query or filter the list you’re viewing.")
                Text("Use the player or Controls menu to play the Active Playlist. Click its Artwork for Now Playing and Chapters. Download Episodes in the Inspector; choose Podcast › Edit Download Rules… to change a Subscription’s Download Rule. Playback continues when windows close.")
                Text("To change servers, disconnect in Settings (⌘,). Each server’s local Library is kept separately.")
                Text("Use Copy PodList Link in Episode, Playlist or Saved Views, or an item’s context menu, to reopen that item in Library. Links never start playback. Spotlight finds Library Episodes, Subscriptions and Playlists in release builds. Select a feed address in another app and choose Services › Add to PodList to stage it in Add Podcasts; subscribing still requires Subscribe.")
                Text("Read Show Notes in the Episode Inspector. Drag its divider to adjust the reading width.")
                Divider()
                Text("Keyboard Shortcuts").macContentFont(.title2).bold()
                Text("Choose a sidebar item with the arrow keys. In Episode and Entry lists, use ⇧↑/⇧↓ to extend selection and ⌘A to select all. Select an Episode to show its Inspector in a wide window. In a narrow window, choose View › Show Inspector (⌥⌘I). Double-click an Episode or press Return to play it now in the Active Playlist. In Playlist Entries, this moves the Entry just before that Playlist’s Cursor, makes the Playlist active and starts the Entry. Double-click a View or Subscription row to open it.")
                Text("With focus in a Library list, table, sidebar or window background, Space plays or pauses the current Episode. If nothing is loaded, it starts the Active Playlist. Space keeps its normal meaning on focused controls, in sheets and in other windows such as Settings and Now Playing. While editing text, Space, Return and ⌘←/⌘→ keep their text meaning. In sheets, Return uses the default action.")
                Grid(alignment: .leading, horizontalSpacing: 24, verticalSpacing: 8) {
                    shortcutRow("New View…", "⌘N")
                    shortcutRow("New Playlist…", "⇧⌘N")
                    shortcutRow("Add Podcasts…", "⇧⌘A")
                    shortcutRow("Show / Hide Inspector", "⌥⌘I")
                    shortcutRow("Play / Pause current Episode", "Space")
                    ForEach(PodListShortcut.allCases, id: \.self) { action in
                        shortcutRow(action.title, action.notation)
                    }
                    shortcutRow("Back 15 / Forward 30 Seconds", "⌘← / ⌘→")
                    shortcutRow("Move Entry Up / Down", "⌥⌘↑ / ⌥⌘↓")
                    shortcutRow("Copy Episode title and share URL", "⌘C")
                    shortcutRow("Remove selected Entries from Playlist", "⌫ or ⌘⌫")
                    shortcutRow("Undo / Redo", "⌘Z / ⇧⌘Z")
                    shortcutRow("Cancel sheet", "Esc or ⌘.")
                    shortcutRow("Stop playback (outside sheets)", "⌘.")
                    shortcutRow("Bigger / Smaller / Actual Size", "⌘+ / ⌘− / ⌘0")
                    shortcutRow("Settings…", "⌘,")
                }
                Text("Download has no assigned shortcut. Download, Cancel Download, Retry Download and Remove Download are in Episode; Rename commands are in Playlist and Views. Queue commands use ⇧⌘J for Next and ⌥⌘J for Last.").macContentFont(.caption)
                Text("Remove from Playlist is undoable. Shortcuts for unavailable commands are disabled; standard text editing commands follow the focused text field.").macContentFont(.caption)
            }.padding(30).textSelection(.enabled)
        }.macContentFont(.body).frame(width: 600, height: 680)
    }
    private func shortcutRow(_ title: String, _ keys: String) -> some SwiftUI.View {
        GridRow { Text(title); Text(keys).monospaced().frame(maxWidth: .infinity, alignment: .trailing) }
    }
}
#endif
