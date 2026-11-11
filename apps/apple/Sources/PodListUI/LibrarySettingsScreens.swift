#if os(macOS)
import SwiftUI
import AppKit
import Charts
import UniformTypeIdentifiers
import PodListDomain
import PodListData

struct AutomationSettingsScreen: SwiftUI.View {
    @Bindable var settings: AutomationSettings
    var body: some SwiftUI.View {
        Form {
            Section("MCP") {
                Toggle("Enable MCP server", isOn: Binding(get: { settings.isEnabled }, set: { settings.setEnabled($0) }))
                Text("Any app running as this user on this Mac can then read the Library and control playback.")
                    .font(.callout).foregroundStyle(.secondary)
                Text("This setting applies only to this Mac. App Intents and Shortcuts are always available.")
                    .font(.caption).foregroundStyle(.secondary)
                if let error = settings.error {
                    Text(error).foregroundStyle(.red)
                    if settings.isEnabled { Button("Retry starting MCP") { settings.start() } }
                }
                if settings.isEnabled {
                    LabeledContent("Bridge path") { Text(settings.bridgePath).textSelection(.enabled) }
                    Text("MCP client configuration").font(.headline)
                    Text(settings.clientConfiguration).font(.system(.caption, design: .monospaced)).textSelection(.enabled)
                    Button("Copy configuration") {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(settings.clientConfiguration, forType: .string)
                    }
                }
            }
        }.formStyle(.grouped).frame(width: 600, height: 690)
    }
}

public struct LibrarySettingsScreen: SwiftUI.View {
    @Bindable var app: ApplicationModel
    @AppStorage("PodList.serverDraft") private var serverDraft = ""
    @AppStorage("PodList.appearance") private var appearance = "System"
    @Environment(\.openWindow) private var openWindow
    @State private var gettingStarted = false
    public init(app: ApplicationModel) { self.app = app }
    public var body: some SwiftUI.View {
        Form {
            if let library = app.library {
                if let editor = app.libraryEditing {
                    Section("Playback Settings") { PlaybackSettingsFields(settings: library.state.playbackSettings, editor: editor) { next in Task { await app.record(.setPlaybackSettings(settings: next)) } }.id(editor.scope) }
                }
                Section("Library") {
                    Picker("Keep Playlists in Trash", selection: Binding(get: { library.state.trashDays ?? 30 }, set: { days in Task { await app.record(.setTrashDays(days: days)) } })) {
                        ForEach([1, 7, 14, 30, 60, 90, 365] as [Int64], id: \.self) { Text("\($0) days").tag($0) }
                        if let days = library.state.trashDays, ![1, 7, 14, 30, 60, 90, 365].contains(days) { Text("\(days) days").tag(days) }
                    }
                    Button("Import OPML…") { LibraryFileActions.importOPML(app) }
                    Button("Export OPML…") { LibraryFileActions.exportOPML(app) }
                    if let editor = app.libraryEditing {
                        OPMLImportContent(editor: editor, choose: { LibraryFileActions.importOPML(app) })
                    }
                    Button("Listening stats") { openWindow(id: "listening-stats") }
                    Button("Getting started") { app.libraryEditing?.showGettingStarted = true; gettingStarted = true }
                }
            }
            if app.isStandalone {
                Section("Publisher feeds") {
                    Text("Feeds are checked every 30 minutes while PodList runs. Failed checks retry with increasing waits, up to a day; the wait survives restarting PodList.").font(.callout)
                    Button("Refresh now") { Task { await app.sync(forceRefresh: true) } }.disabled(app.syncing)
                    if let error = app.syncError { Text(error).foregroundStyle(.red) }
                }
            }
            Section("Appearance") {
                Picker("Appearance", selection: $appearance) { ForEach(["System", "Light", "Dark"], id: \.self) { Text($0).tag($0) } }
            }
            Section("Server connection") {
                if let origin = app.origin {
                    LabeledContent("Server address", value: origin)
                    if app.bringOverAvailable { Button("Bring Library from this Mac…") { Task { await app.offerBringOver() } }.disabled(app.syncing) }
                    if let job = app.bringOverJob {
                        Text(job.complete ? "Library brought over. The original Library on this Mac is retained." : "Bringing over: \(job.imported.count) podcasts transferred, \(job.copied.count) downloads copied. Progress is saved.")
                            .font(.callout)
                        if !job.complete { Button("Retry bring-over") { Task { await app.sync() } }.disabled(app.syncing) }
                    }
                    if let error = app.bringOverError { Text(error).foregroundStyle(.red).textSelection(.enabled) }
                    Button("Disconnect") { app.disconnect() }
                } else {
                    Text(app.isStandalone ? "Standalone Device — your Library is on this Mac." : "Connect to a server from Welcome.")
                    TextField("Server address", text: $app.serverInput)
                    Button("Check and connect") { Task { await app.connect() } }.disabled(app.connecting || app.serverInput.isEmpty)
                    if app.isStandalone { Text("You can preview bringing this Library over after checking the server. Not now keeps the Libraries separate.").font(.caption).foregroundStyle(.secondary) }
                    if let error = app.connectionError { Text(error).foregroundStyle(.red) }
                }
            }
        }.formStyle(.grouped).frame(width: 600, height: 690)
        .sheet(isPresented: Binding(get: { app.bringOverPreview != nil }, set: { if !$0 { app.declineBringOver() } })) {
            if let preview = app.bringOverPreview { BringOverPreviewScreen(app: app, preview: preview) }
        }
        .onAppear { if app.serverInput.isEmpty { app.serverInput = serverDraft } }
        .onChange(of: app.serverInput) { _, text in serverDraft = text }
        .preferredColorScheme(appearance == "System" ? nil : appearance == "Dark" ? .dark : .light)
        .sheet(isPresented: $gettingStarted, onDismiss: { app.libraryEditing?.showGettingStarted = false }) {
            if let editor = app.libraryEditing {
                GettingStartedScreen(editor: editor, add: nil).padding(25).frame(width: 500)
                    .onChange(of: editor.showGettingStarted) { _, visible in if !visible { gettingStarted = false } }
            }
        }
    }
}

private struct BringOverPreviewScreen: SwiftUI.View {
    @Bindable var app: ApplicationModel
    let preview: BringOverPreview
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Bring this Mac’s Library over?").font(.title2).bold()
            Text("To \(app.origin ?? "the server")").foregroundStyle(.secondary).textSelection(.enabled)
            LabeledContent("Subscriptions", value: "\(preview.addedSubscriptions) added · \(preview.mergedSubscriptions) merged")
            LabeledContent("Episodes", value: "\(preview.addedEpisodes) added · \(preview.mergedEpisodes) matched")
            LabeledContent("Playlists", value: "\(preview.playlists) added · Default merged")
            LabeledContent("Entries and Positions", value: "\(preview.entries) Entries · \(preview.positions) Positions")
            LabeledContent("Played and Starred", value: "\(preview.played) Played · \(preview.starred) Starred")
            LabeledContent("Listening log", value: Presentation.time(preview.listeningSeconds))
            LabeledContent("Views and downloads", value: "\(preview.views) Views · \(preview.downloads) downloads")
            Text("Podcasts match by feed address and Episodes by guid. Default Playlist Entries, Positions, Played and Starred marks and the Listening log merge with the server. Other Playlists and Views are kept with unique names. Saved settings and this Mac’s Download Rules come too; downloads are kept as Manual Downloads.").font(.callout)
            Text("The original Library stays on this Mac. An interrupted bring-over resumes automatically, or use Retry bring-over in Settings. Not now keeps the Libraries separate; you can return here later.").font(.callout).foregroundStyle(.secondary)
            if let error = app.bringOverError { Text(error).foregroundStyle(.red) }
            HStack {
                Spacer()
                Button("Not now") { app.declineBringOver() }.keyboardShortcut(.cancelAction)
                Button("Bring over") { Task { await app.acceptBringOver() } }.keyboardShortcut(.defaultAction)
            }
        }.padding(25).frame(width: 560)
    }
}

private struct PlaybackSettingsFields: SwiftUI.View {
    let settings: PlaybackSettings
    @Bindable var editor: LibraryEditingModel
    let changed: (PlaybackSettings) -> Void
    @State private var draft: PlaybackSettings
    init(settings: PlaybackSettings, editor: LibraryEditingModel, changed: @escaping (PlaybackSettings) -> Void) {
        self.settings = settings; self.editor = editor; self.changed = changed; _draft = State(initialValue: settings)
    }
    var body: some SwiftUI.View {
        Picker("Speed", selection: field(\.speed)) {
            ForEach([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3], id: \.self) { Text("\($0.formatted())×").tag($0) }
            if ![0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].contains(draft.speed) { Text("\(draft.speed.formatted())×").tag(draft.speed) }
        }
        PersistentNumberField(label: "Skip intro (seconds)", field: "settings.skipIntro", value: draft.skipIntro, editor: editor) { value in draft.skipIntro = value; changed(draft) }
        PersistentNumberField(label: "Skip outro (seconds)", field: "settings.skipOutro", value: draft.skipOutro, editor: editor) { value in draft.skipOutro = value; changed(draft) }
        Toggle("Volume boost", isOn: field(\.volumeBoost))
            .onChange(of: settings) { _, value in draft = value }
    }
    private func field<T>(_ path: WritableKeyPath<PlaybackSettings, T>) -> Binding<T> { Binding(get: { draft[keyPath: path] }, set: { value in draft[keyPath: path] = value; changed(draft) }) }
}

private struct PersistentNumberField: SwiftUI.View {
    let label: String
    let field: String
    let value: Double
    @Bindable var editor: LibraryEditingModel
    let changed: (Double) -> Void
    @State private var text: String
    @FocusState private var focused: Bool
    init(label: String, field: String, value: Double, editor: LibraryEditingModel, changed: @escaping (Double) -> Void) {
        self.label = label; self.field = field; self.value = value; self.editor = editor; self.changed = changed
        let saved = editor.draft(field)
        _text = State(initialValue: editor.hasDraft(field) ? saved : String(value))
    }
    private var valid: Bool { Double(text).map { $0.isFinite && $0 >= 0 } == true }
    var body: some SwiftUI.View {
        VStack(alignment: .leading) {
            TextField(label, text: $text).focused($focused)
                .onChange(of: text) { _, raw in
                    editor.setDraft(raw, field: field)
                    if let number = Double(raw), number.isFinite, number >= 0, number != value { changed(number) }
                }
                .onChange(of: value) { _, number in if !focused && valid { text = String(number) } }
                .onChange(of: focused) { _, active in if !active && valid { editor.clearDraft(field) } }
            if !valid { Text("Enter a nonnegative number of seconds.").font(.caption).foregroundStyle(.red) }
        }
    }
}

struct GettingStartedScreen: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let add: (() -> Void)?
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 12) {
            HStack { Text("Getting started").font(.headline); Spacer(); Button("Dismiss") { editor.showGettingStarted = false } }
            Label("Add podcasts to your Library", systemImage: "1.circle")
            Text("Search by name or enter a feed address.").foregroundStyle(.secondary)
            if let add { Button("Add podcasts…", action: add) }
            else { Text("Use File ▸ Add Podcasts… (⌘⇧A) in the Library window.").font(.caption) }
            Label("Understand Views", systemImage: "2.circle")
            Text("Views find Episodes. Open a View, or edit its conditions to see the match count change.").foregroundStyle(.secondary)
            Label("Add Episodes to Playlists", systemImage: "3.circle")
            Text("Use Add or Play Now. Each Playlist remembers its own Position.").foregroundStyle(.secondary)
        }.padding(12)
    }
}

public struct ListeningStatsScreen: SwiftUI.View {
    @Bindable var app: ApplicationModel
    @State private var table = false
    public init(app: ApplicationModel) { self.app = app }
    public var body: some SwiftUI.View {
        Group {
            if let library = app.library {
                let ids = Set(library.snapshot.episodes.map(\.id))
                let facts = library.state.episodeStates.values.filter { ids.contains($0.episodeId) }.compactMap(\.played)
                let stats = ListeningStats(log: library.state.listeningLog ?? [:], played: facts)
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Listening stats").font(.largeTitle).bold()
                        if stats.totals.allSatisfy({ $0.seconds == 0 && $0.finished == 0 }) { Text("Play an Episode to start your Listening log.") }
                        ForEach(stats.totals, id: \.name) { total in
                            LabeledContent(total.name) { Text("\(Presentation.time(total.seconds)) listened · \(total.finished) Episodes finished") }
                        }
                        Text("Time includes partial listening. Episodes finished counts playback, and changes after Rewind or marking Unplayed.").font(.caption).foregroundStyle(.secondary)
                        Text("Listening streak: \(stats.streak) days").font(.headline)
                        Toggle("Show daily table", isOn: $table)
                        if table {
                            ForEach(stats.days.reversed()) { day in LabeledContent(day.date.formatted(date: .abbreviated, time: .omitted), value: Presentation.time(day.seconds)) }
                        } else {
                            Chart(stats.days) { day in BarMark(x: .value("Day", day.date, unit: .day), y: .value("Minutes listened", day.seconds / 60)) }
                                .frame(height: 200).accessibilityLabel("Daily listening for the last 30 days. Use Show daily table for exact values.")
                        }
                        Text("Top podcasts").font(.title2)
                        ForEach(stats.podcasts, id: \.id) { item in
                            LabeledContent(library.snapshot.subscriptions.first { $0.id == item.id }?.title ?? "Removed Subscription", value: Presentation.time(item.seconds))
                        }
                    }.padding(25)
                }
            } else { ContentUnavailableView("Open a Library to see Listening stats", systemImage: "chart.bar") }
        }.frame(minWidth: 650, minHeight: 600)
    }
}

@MainActor public enum LibraryFileActions {
    public static func importOPML(_ app: ApplicationModel) {
        guard let editor = app.libraryEditing, !editor.busy else { return }
        let panel = NSOpenPanel(); panel.canChooseDirectories = false; panel.allowsMultipleSelection = false
        panel.allowedContentTypes = [.xml, .data]; panel.message = "Choose an OPML subscriptions document"
        panel.begin { result in
            guard result == .OK, let url = panel.url else { return }
            Task { @MainActor in
                let scoped = url.startAccessingSecurityScopedResource(); defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                do {
                    let file = try FileHandle(forReadingFrom: url); defer { try? file.close() }
                    let bytes = try file.read(upToCount: 8 * 1024 * 1024 + 1) ?? Data()
                    guard bytes.count <= 8 * 1024 * 1024, let text = String(data: bytes, encoding: .utf8) else { throw SyncResponseFailure("Choose UTF-8 OPML under 8 MiB") }
                    await editor.selectOPML(text, name: url.lastPathComponent)
                } catch { editor.cancelImportSelection(); editor.importName = url.lastPathComponent; editor.importPresented = true; editor.error = "Could not read this OPML file. " + LibraryMessages.failure(error) }
            }
        }
    }
    public static func exportOPML(_ app: ApplicationModel) {
        guard let library = app.library, let editor = app.libraryEditing else { return }
        let panel = NSSavePanel(); panel.nameFieldStringValue = "PodList.opml"
        panel.begin { result in
            guard result == .OK, let url = panel.url else { return }
            Task { @MainActor in
                let scoped = url.startAccessingSecurityScopedResource(); defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                do { try OPML.generate(library.snapshot.subscriptions).write(to: url, atomically: true, encoding: .utf8); editor.notice = "Exported \(library.subscriptions.count) Subscriptions." }
                catch { editor.error = LibraryMessages.failure(error) }
            }
        }
    }
}
#endif
