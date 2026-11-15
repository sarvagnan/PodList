#if os(macOS)
import SwiftUI

struct WelcomeView: SwiftUI.View {
    @Bindable var app: ApplicationModel
    @AppStorage("PodList.serverDraft") private var serverDraft = ""
    @FocusState private var addressFocused: Bool
    var body: some SwiftUI.View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Image(systemName: "waveform.circle.fill").font(.system(size: 54)).foregroundStyle(Color.podListAccent).accessibilityHidden(true)
                Text("Welcome to PodList").macContentFont(.largeTitle).bold()
                Text("Your Library, Views and Playlists, together on this Mac.").foregroundStyle(MacReadableSecondaryStyle())
                Text("Connect to a Server").macContentFont(.title2).bold().padding(.top, 12)
                Text("Enter your PodList server address. Your Library stays available on this Device when the server is unreachable.")
                TextField("Server address", text: $app.serverInput, prompt: Text("https://podlist.example.ts.net"))
                    .textFieldStyle(.roundedBorder).focused($addressFocused).disabled(app.connecting)
                    .accessibilityLabel("Server address")
                    .onSubmit { connect() }
                Text("For the local demo, use http://127.0.0.1:PORT.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                if let error = app.connectionError {
                    Label(error, systemImage: "exclamationmark.circle").foregroundStyle(Color.podListError).fixedSize(horizontal: false, vertical: true)
                        .accessibilityLabel("Connection error: " + error)
                }
                HStack {
                    Button(app.connecting ? "Checking…" : "Check and Connect") { connect() }
                        .buttonStyle(.borderedProminent).keyboardShortcut(.defaultAction)
                        .foregroundStyle(Color.podListOnAccent)
                        .disabled(app.connecting || app.serverInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .accessibilityLabel("Check and connect to server")
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
    @State private var pane = "general"
    @State private var heights: [String: CGFloat] = [:]
    public init(app: ApplicationModel) { self.app = app }
    public var body: some SwiftUI.View {
        TabView(selection: $pane) {
            LibrarySettingsScreen(app: app)
                .tabItem { Label("General", systemImage: "gearshape") }
                .tag("general")
            AutomationSettingsScreen(settings: app.automation)
                .tabItem { Label("Automation", systemImage: "terminal") }
                .tag("automation")
        }
        .frame(width: 600, height: heights[pane] ?? 440)
        .onPreferenceChange(SettingsPaneHeights.self) { measured in
            for (pane, height) in measured where height > 0 { heights[pane] = height }
        }
    }
}

public struct PodListHelp: SwiftUI.View {
    public init() {}
    public var body: some SwiftUI.View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("PodList").macContentFont(.largeTitle).bold()
                Text("Views find Episodes in your Library. Playlists hold Entries in order, each with its own Position.")
                Text("Connect to your server on Welcome. Choose a View, Playlist or Subscriptions in the sidebar. Select an Episode to read its Inspector (⌥⌘I). Search filters the current list.")
                Text("Use the player or Controls menu to play the Active Playlist. Click its Artwork for Now Playing and Chapters. Download Episodes in the Inspector; change a Subscription’s Download Rule above its Episode list. Playback continues when windows close.")
                Text("To change servers, disconnect in Settings (⌘,). Each server’s local Library is kept separately.")
                Divider()
                Text("Keyboard Shortcuts").macContentFont(.title2).bold()
                Text("Choose a sidebar item with the arrow keys; in Episode and Entry lists, use ⇧↑/⇧↓ to extend selection and ⌘A to select all. Double-click a row for details. Space always plays or pauses the current Episode, regardless of selection; if nothing is loaded, it starts the Active Playlist. Return plays selected Episodes using Episode › Play Now. While editing text, Space, Return and ⌘←/⌘→ keep their text meaning. In sheets, Return uses the default action.")
                Grid(alignment: .leading, horizontalSpacing: 24, verticalSpacing: 8) {
                    shortcutRow("New View…", "⌘N")
                    shortcutRow("New Playlist…", "⇧⌘N")
                    shortcutRow("Add Podcasts…", "⇧⌘A")
                    shortcutRow("Search Library", "⌘F")
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
