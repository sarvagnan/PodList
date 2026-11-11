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
                Text("Welcome to PodList").font(.largeTitle).bold()
                Text("Your Library, Views and Playlists, together on this Mac.").foregroundStyle(.secondary)
                Text("Connect to a server").font(.title2).bold().padding(.top, 12)
                Text("Enter your PodList server address. Your Library stays available on this Device when the server is unreachable.")
                TextField("Server address", text: $app.serverInput, prompt: Text("https://podlist.example.ts.net"))
                    .textFieldStyle(.roundedBorder).focused($addressFocused).disabled(app.connecting)
                    .accessibilityLabel("Server address")
                    .onSubmit { connect() }
                Text("For the local demo, use http://127.0.0.1:PORT.").font(.caption).foregroundStyle(.secondary)
                if let error = app.connectionError {
                    Label(error, systemImage: "exclamationmark.circle").foregroundStyle(.red).fixedSize(horizontal: false, vertical: true)
                        .accessibilityLabel("Connection error: " + error)
                }
                HStack {
                    Button(app.connecting ? "Checking…" : "Check and connect") { connect() }
                        .buttonStyle(.borderedProminent).keyboardShortcut(.defaultAction)
                        .disabled(app.connecting || app.serverInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .accessibilityLabel("Check and connect to server")
                    if app.connecting { ProgressView().controlSize(.small).accessibilityLabel("Checking server") }
                }
                Divider().padding(.vertical, 8)
                Button("Start on this Mac") { Task { await app.startStandalone() } }
                    .disabled(app.connecting).accessibilityHint("Start as a Standalone Device, with no server")
            }.frame(maxWidth: 470, alignment: .leading).padding(40).frame(maxWidth: .infinity)
        }
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
    public init(app: ApplicationModel) { self.app = app }
    public var body: some SwiftUI.View {
        TabView {
            LibrarySettingsScreen(app: app)
                .tabItem { Label("General", systemImage: "gearshape") }
            AutomationSettingsScreen(settings: app.automation)
                .tabItem { Label("Automation", systemImage: "terminal") }
        }
    }
}

public struct PodListHelp: SwiftUI.View {
    public init() {}
    public var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 16) {
            Text("PodList").font(.largeTitle).bold()
            Text("Views find Episodes in your Library. Playlists hold Entries in order, each with its own Position.")
            Text("Connect to your server on Welcome. Choose a View, Playlist or Subscriptions in the sidebar. Select an Episode to read its Inspector (⌘⌥I). Search filters the current list.")
            Text("Use the player or Controls menu to play the Active Playlist. Click its Artwork for Now Playing and Chapters. Download Episodes in the Inspector; change a Subscription’s Download Rule above its Episode list. Playback continues when windows close.")
            Text("To change servers, disconnect in Settings (⌘,). Each server’s local Library is kept separately.")
        }.padding(30).frame(width: 480).textSelection(.enabled)
    }
}
#endif
