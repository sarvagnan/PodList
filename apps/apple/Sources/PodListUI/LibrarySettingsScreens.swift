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
        ContentSizedPanel(width: 600, settings: true, pane: "automation") {
            Form {
                Section("MCP") {
                    Toggle("Enable MCP server", isOn: Binding(get: { settings.isEnabled }, set: { settings.setEnabled($0) }))
                    Text("Any app running as this user on this Mac can then read the Library and control playback.")
                        .macContentFont(.callout).foregroundStyle(.secondary)
                    Text("This setting applies only to this Mac. App Intents and Shortcuts are always available.")
                        .macContentFont(.caption).foregroundStyle(.secondary)
                    if let error = settings.error {
                        Text(error).foregroundStyle(.red)
                        if settings.isEnabled { Button("Retry") { settings.start() } }
                    }
                    if settings.isEnabled {
                        LabeledContent("Bridge path") { Text(settings.bridgePath).textSelection(.enabled) }
                        Text("MCP client configuration").macContentFont(.headline)
                        Text(settings.clientConfiguration).macContentFont(.system(.caption, design: .monospaced, weight: nil)).textSelection(.enabled)
                        Button("Copy Configuration") {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(settings.clientConfiguration, forType: .string)
                        }
                    }
                }
            }.formStyle(.columns).padding(24)
        }
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
        ContentSizedPanel(width: 600, settings: true, pane: "general") {
            Form {
                if let library = app.library {
                    if let editor = app.libraryEditing, let editing = app.editing {
                        GeneralLibrarySettingsFields(library: library, editor: editor, editing: editing).id(editor.scope)
                    }
                    Section("Library") {
                        Button("Import OPML…") { LibraryFileActions.importOPML(app) }
                        if let editor = app.libraryEditing {
                            OPMLImportContent(editor: editor, choose: { LibraryFileActions.importOPML(app) })
                        }
                        Button("Export OPML…") { LibraryFileActions.exportOPML(app) }
                        Button("Listening Stats") { openWindow(id: "listening-stats") }
                        Button("Getting Started") { app.libraryEditing?.showGettingStarted = true; gettingStarted = true }
                    }
                }
                if app.isStandalone {
                    Section("Publisher feeds") {
                        Text("Feeds are checked every 30 minutes while PodList runs. Failed checks retry with increasing waits, up to a day; the wait survives restarting PodList.").macContentFont(.callout)
                        Button("Refresh Now") { Task { await app.sync(forceRefresh: true) } }.disabled(app.syncing)
                        if let error = app.syncError { Text(error).foregroundStyle(.red) }
                    }
                }
                Section("Appearance") {
                    MacTextSizeControl()
                    Picker("Appearance", selection: $appearance) { ForEach(["System", "Light", "Dark"], id: \.self) { Text($0).tag($0) } }
                }
                Section("Server connection") {
                    if let origin = app.origin {
                        LabeledContent("Server address", value: origin)
                        if app.bringOverAvailable { Button("Bring Library from this Mac…") { Task { await app.offerBringOver() } }.disabled(app.syncing) }
                        if let job = app.bringOverJob {
                            Text(job.complete ? "Library brought over. The original Library on this Mac is retained." : "Bringing over: \(CountText.format(job.imported.count, .podcast)) transferred, \(CountText.format(job.copied.count, .download)) copied. Progress is saved.")
                                .macContentFont(.callout)
                            if !job.complete { Button("Retry") { Task { await app.sync() } }.disabled(app.syncing) }
                        }
                        if let error = app.bringOverError { Text(error).foregroundStyle(.red).textSelection(.enabled) }
                        Button("Disconnect") { app.disconnect() }
                    } else {
                        Text(app.isStandalone ? "Standalone Device — your Library is on this Mac." : "Connect to a server from Welcome.")
                        TextField("Server address", text: $app.serverInput)
                        Button("Check and Connect") { Task { await app.connect() } }.disabled(app.connecting || app.serverInput.isEmpty)
                        if app.isStandalone { Text("You can preview bringing this Library over after checking the server. Not now keeps the Libraries separate.").macContentFont(.caption).foregroundStyle(.secondary) }
                        if let error = app.connectionError { Text(error).foregroundStyle(.red) }
                    }
                }
            }.formStyle(.columns).padding(24)
        }
        .sheet(isPresented: Binding(get: { app.bringOverPreview != nil }, set: { if !$0 { app.declineBringOver() } })) {
            if let preview = app.bringOverPreview { BringOverPreviewScreen(app: app, preview: preview) }
        }
        .onAppear { if app.serverInput.isEmpty { app.serverInput = serverDraft } }
        .onChange(of: app.serverInput) { _, text in serverDraft = text }
        .sheet(isPresented: $gettingStarted, onDismiss: { app.libraryEditing?.showGettingStarted = false }) {
            if let editor = app.libraryEditing {
                ContentSizedPanel(width: 500) { GettingStartedScreen(editor: editor, add: nil).padding(25) }
                    .onChange(of: editor.showGettingStarted) { _, visible in if !visible { gettingStarted = false } }
            }
        }
    }
}

private struct BringOverPreviewScreen: SwiftUI.View {
    @Bindable var app: ApplicationModel
    let preview: BringOverPreview
    var body: some SwiftUI.View {
        ContentSizedPanel(width: 560) {
            VStack(alignment: .leading, spacing: 14) {
                Text("Bring this Mac’s Library over?").macContentFont(.title2).bold()
                Text("To \(app.origin ?? "the server")").foregroundStyle(.secondary).textSelection(.enabled)
                LabeledContent("Subscriptions", value: "\(preview.addedSubscriptions) added · \(preview.mergedSubscriptions) merged")
                LabeledContent("Episodes", value: "\(preview.addedEpisodes) added · \(preview.mergedEpisodes) matched")
                LabeledContent("Playlists", value: "\(preview.playlists) added · Default merged")
                LabeledContent("Entries and Positions", value: "\(CountText.format(preview.entries, .entry)) · \(CountText.format(preview.positions, .position))")
                LabeledContent("Played and Starred", value: "\(preview.played) Played · \(preview.starred) Starred")
                LabeledContent("Listening log", value: Presentation.time(preview.listeningSeconds))
                LabeledContent("Views and downloads", value: "\(CountText.format(preview.views, .view)) · \(CountText.format(preview.downloads, .download))")
                Text("Podcasts match by feed address and Episodes by guid. Default Playlist Entries, Positions, Played and Starred marks and the Listening log merge with the server. Other Playlists and Views are kept with unique names. Saved settings and this Mac’s Download Rules come too; downloads are kept as Manual Downloads.").macContentFont(.callout)
                Text("The original Library stays on this Mac. An interrupted bring-over resumes automatically, or use Retry in Settings. Not Now keeps the Libraries separate; you can return here later.").macContentFont(.callout).foregroundStyle(.secondary)
                if let error = app.bringOverError { Text(error).foregroundStyle(.red) }
                HStack {
                    Spacer()
                    Button("Not Now") { app.declineBringOver() }.keyboardShortcut(.cancelAction)
                    Button("Bring Over") { Task { await app.acceptBringOver() } }.keyboardShortcut(.defaultAction)
                }
            }.padding(25)
        }
    }
}

private struct GeneralLibrarySettingsFields: SwiftUI.View {
    let library: LibraryModel
    @Bindable var editor: LibraryEditingModel
    let editing: PlaylistEditingModel
    @State private var draft: GeneralSettingsEdits
    init(library: LibraryModel, editor: LibraryEditingModel, editing: PlaylistEditingModel) {
        self.library = library; self.editor = editor; self.editing = editing
        _draft = State(initialValue: GeneralSettingsEdits(playback: library.state.playbackSettings, trashDays: library.state.trashDays ?? 30))
    }
    var body: some SwiftUI.View {
        Group {
            Section("Playback Settings") {
                Picker("Speed", selection: field(\.speed, setting: "Speed")) {
                    ForEach([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3], id: \.self) { Text("\($0.formatted())×").tag($0) }
                    if ![0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].contains(draft.playback.speed) { Text("\(draft.playback.speed.formatted())×").tag(draft.playback.speed) }
                }
                playbackFailure("Speed")
                PersistentNumberField(label: "Skip intro", field: "settings.skipIntro", value: draft.playback.skipIntro, editor: editor) {
                    draft.playback.skipIntro = $0; savePlayback("Skip intro")
                }
                playbackFailure("Skip intro")
                PersistentNumberField(label: "Skip outro", field: "settings.skipOutro", value: draft.playback.skipOutro, editor: editor) {
                    draft.playback.skipOutro = $0; savePlayback("Skip outro")
                }
                playbackFailure("Skip outro")
                Toggle("Volume Boost", isOn: field(\.volumeBoost, setting: "Volume boost"))
                playbackFailure("Volume boost")
            }
            Section("Trash") {
                Picker("Keep Playlists in Trash", selection: Binding(get: { draft.trashDays }, set: {
                    draft.trashDays = $0; draft.save(.setTrashDays(days: $0), setting: "Keep Playlists in Trash", using: editing)
                })) {
                    ForEach([1, 7, 14, 30, 60, 90, 365] as [Int64], id: \.self) { Text(CountText.format($0, .day)).tag($0) }
                    if ![1, 7, 14, 30, 60, 90, 365].contains(draft.trashDays) { Text(CountText.format(draft.trashDays, .day)).tag(draft.trashDays) }
                }
                if let error = draft.failures["Keep Playlists in Trash"] {
                    SettingFailure(message: error) { draft.save(.setTrashDays(days: draft.trashDays), setting: "Keep Playlists in Trash", using: editing) }
                }
            }
        }
        .onChange(of: library.state.playbackSettings) { _, _ in reconcile() }
        .onChange(of: library.state.trashDays) { _, _ in reconcile() }
    }
    private func reconcile() { draft.reconcile(playback: library.state.playbackSettings, trashDays: library.state.trashDays ?? 30) }
    private func field<T>(_ path: WritableKeyPath<PlaybackSettings, T>, setting: String) -> Binding<T> {
        Binding(get: { draft.playback[keyPath: path] }, set: { draft.playback[keyPath: path] = $0; savePlayback(setting) })
    }
    private func savePlayback(_ setting: String) { draft.save(.setPlaybackSettings(settings: draft.playback), setting: setting, using: editing) }
    @ViewBuilder private func playbackFailure(_ setting: String) -> some SwiftUI.View {
        if let error = draft.failures[setting] { SettingFailure(message: error) { savePlayback(setting) } }
    }
}

private struct SettingFailure: SwiftUI.View {
    let message: String
    let retry: () -> Void
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 4) {
            FailureFeedback(message: message, retry: retry).macContentFont(.callout)
        }
    }
}

private struct PersistentNumberField: SwiftUI.View {
    let label: String
    let field: String
    let value: Double
    @Bindable var editor: LibraryEditingModel
    let changed: (Double) -> Void
    @Environment(\.locale) private var locale
    @State private var text: String?
    @FocusState private var focused: Bool
    private var raw: String { text ?? (editor.hasDraft(field) ? editor.draft(field) : FormNumbers.string(value, locale: locale)) }
    private var valid: Bool { FormNumbers.nonnegative(raw, locale: locale) != nil }
    var body: some SwiftUI.View {
        LabeledContent(label) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    TextField(label, text: Binding(get: { raw }, set: { raw in
                        text = raw; editor.setDraft(raw, field: field)
                        if let number = FormNumbers.nonnegative(raw, locale: locale), number != value { changed(number) }
                    }))
                    .labelsHidden().accessibilityLabel(label)
                    .frame(width: 88).textFieldStyle(.roundedBorder).focused($focused)
                    Text("sec").foregroundStyle(.secondary)
                }
                if !valid { Text("\(label) must be a nonnegative number of seconds.").macContentFont(.caption).foregroundStyle(.red).fixedSize(horizontal: false, vertical: true) }
            }
        }
        .onChange(of: value) { _, _ in if !focused && valid { text = nil; editor.clearDraft(field) } }
        .onChange(of: focused) { _, active in if !active && valid { text = nil; editor.clearDraft(field) } }
    }
}

struct GettingStartedScreen: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let add: (() -> Void)?
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 12) {
            HStack { Text("Getting Started").macContentFont(.headline); Spacer(); Button("Dismiss") { editor.showGettingStarted = false } }
            Label("Add podcasts to your Library", systemImage: "1.circle")
            Text("Search by name or enter a feed address.").foregroundStyle(.secondary)
            if let add { Button("Add Podcasts…", action: add) }
            else { Text("Use File ▸ Add Podcasts… (⇧⌘A) in the Library window.").macContentFont(.caption) }
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
                        Text("Listening Stats").macContentFont(.largeTitle).bold()
                        if stats.totals.allSatisfy({ $0.seconds == 0 && $0.finished == 0 }) { Text("Play an Episode to start your Listening log.") }
                        ForEach(stats.totals, id: \.name) { total in
                            LabeledContent(total.name) { Text("\(Presentation.time(total.seconds)) listened · \(CountText.format(total.finished, .episode)) finished") }
                        }
                        Text("Time includes partial listening. Episodes finished counts playback, and changes after Rewind or marking Unplayed.").macContentFont(.caption).foregroundStyle(.secondary)
                        Text("Listening Streak: \(CountText.format(stats.streak, .day))").macContentFont(.headline)
                        Toggle("Show Daily Table", isOn: $table)
                        if table {
                            ForEach(stats.days.reversed()) { day in LabeledContent(day.date.formatted(date: .abbreviated, time: .omitted), value: Presentation.time(day.seconds)) }
                        } else {
                            Chart(stats.days) { day in
                                BarMark(x: .value("Day", day.date, unit: .day), y: .value("Minutes listened", day.seconds / 60))
                                    .foregroundStyle(Color.podListAccent)
                            }
                                .chartYAxisLabel("Minutes")
                                .frame(height: 200).accessibilityLabel("Daily listening in minutes for the last 30 days. Use Show Daily Table for exact values.")
                        }
                        Text("Top Podcasts").macContentFont(.title2)
                        ForEach(stats.podcasts, id: \.id) { item in
                            LabeledContent(library.snapshot.subscriptions.first { $0.id == item.id }?.title ?? "Removed Subscription", value: Presentation.time(item.seconds))
                        }
                    }.padding(25)
                }
            } else { ContentUnavailableView("Open a Library to see Listening stats", systemImage: "chart.bar") }
        }.macContentFont(.body).frame(minWidth: 650, minHeight: 600)
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
                await editor.selectOPMLFile(url)
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
                do { try OPML.generate(library.snapshot.subscriptions).write(to: url, atomically: true, encoding: .utf8); editor.notice = "Exported \(CountText.format(library.subscriptions.count, .subscription))." }
                catch { editor.error = LibraryMessages.failure(error) }
            }
        }
    }
}
#endif
