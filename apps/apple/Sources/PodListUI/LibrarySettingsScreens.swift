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
        Group {
            Form {
                Section("MCP") {
                    Toggle("Enable MCP Server", isOn: Binding(get: { settings.isEnabled }, set: { settings.setEnabled($0) }))
                        // A grouped Form draws the title beside an unnamed switch for accessibility.
                        .accessibilityLabel("Enable MCP Server")
                    Text("Any app running as this user on this Mac can then read the Library and control playback.")
                        .macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                    Text("This setting applies only to this Mac. App Intents and Shortcuts are always available.")
                        .macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                    if let error = settings.error {
                        FailureFeedback(message: error, indexedElsewhere: true) {
                            if settings.isEnabled { settings.start() } else { settings.stop() }
                        }
                    }
                    if settings.isEnabled {
                        LabeledContent("Bridge Path") { Text(settings.bridgePath).textSelection(.enabled) }
                        Text("MCP client configuration").macContentFont(.headline)
                        Text(settings.clientConfiguration).macContentFont(.system(.caption, design: .monospaced, weight: nil)).textSelection(.enabled)
                        Button("Copy Configuration", action: copyConfiguration)
                    }
                }
            }.formStyle(.grouped)
                .contentSizedSettingsForm(pane: "automation")
        }
        .focusedSceneValue(\.podListSettingsActions, MenuActionContext(actions: [
            .copyConfiguration: settings.isEnabled ? { copyConfiguration() } : nil,
            .retryAutomation: settings.error != nil ? { if settings.isEnabled { settings.start() } else { settings.stop() } } : nil
        ].compactMapValues { $0 }))
    }
    private func copyConfiguration() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(settings.clientConfiguration, forType: .string)
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
        // A grouped Form owns its scrolling and keeps labels and prose inside
        // the pane. A columns Form can grow wider than its proposed width.
        Group {
            Form {
                if let library = app.library {
                    if let editor = app.libraryEditing, let editing = app.editing {
                        GeneralLibrarySettingsFields(library: library, editor: editor, editing: editing).id(editor.scope)
                    }
                    Section("Library") {
                        Button("Import OPML…") { LibraryFileActions.importOPML(app) }
                        if let editor = app.libraryEditing {
                            OPMLImportContent(editor: editor, choose: { LibraryFileActions.importOPML(app) }, showsFileChooser: false)
                        }
                        Button("Export OPML…") { LibraryFileActions.exportOPML(app) }
                        Button("Listening Stats") { openWindow(id: "listening-stats") }
                        Button("Getting Started") { app.libraryEditing?.showGettingStarted = true; gettingStarted = true }
                    }
                }
                if app.isStandalone {
                    Section("Publisher Feeds") {
                        Text("Feeds are checked every 30 minutes while PodList runs. Failed checks retry with increasing waits, up to a day. The wait survives restarting PodList.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle()).fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: 480, alignment: .leading)
                        Button("Refresh Now") { Task { await app.sync(forceRefresh: true) } }.disabled(app.syncing)
                        if let error = app.syncError { Text(error).foregroundStyle(Color.podListError) }
                    }
                }
                Section("Appearance") {
                    MacTextSizeControl()
                    Picker("Appearance", selection: $appearance) { ForEach(["System", "Light", "Dark"], id: \.self) { Text($0).tag($0) } }
                        .accessibilityLabel("Appearance")
                }
                Section("Server Connection") {
                    if let origin = app.origin {
                        LabeledContent("Server Address") {
                            Text(origin).foregroundStyle(.primary).textSelection(.enabled)
                        }
                        if app.bringOverAvailable { Button("Bring Library from This Mac…") { Task { await app.offerBringOver() } }.disabled(app.syncing) }
                        if let job = app.bringOverJob {
                            Text(job.complete ? "Library brought over. The original Library on this Mac is retained." : "Bringing over: \(CountText.format(job.imported.count, .podcast)) transferred, \(CountText.format(job.copied.count, .download)) copied. Progress is saved.")
                                .macContentFont(.callout)
                            if !job.complete { Button("Retry") { Task { await app.sync(forceRefresh: true) } }.disabled(app.syncing) }
                        }
                        if let error = app.bringOverError { Text(error).foregroundStyle(Color.podListError).textSelection(.enabled) }
                        Button("Disconnect") { app.disconnect() }
                    } else {
                        Text(app.isStandalone ? "Standalone Device — your Library is on this Mac." : "Connect to a server from Welcome.")
                            .macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle()).fixedSize(horizontal: false, vertical: true)
                        TextField("Server Address", text: $app.serverInput)
                            .accessibilityLabel("Server Address")
                        Button("Check and Connect") { Task { await app.connect() } }.disabled(app.connecting || app.serverInput.isEmpty)
                        if app.isStandalone { Text("You can preview bringing this Library over after checking the server. Not now keeps the Libraries separate.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle()) }
                        if let error = app.connectionError { Text(error).foregroundStyle(Color.podListError) }
                    }
                }
            }.formStyle(.grouped)
                .contentSizedSettingsForm(pane: "general")
        }
        .sheet(isPresented: Binding(get: { app.bringOverPreview != nil }, set: { if !$0 { app.declineBringOver() } })) {
            if let preview = app.bringOverPreview { BringOverPreviewScreen(app: app, preview: preview) }
        }
        .focusedSceneValue(\.podListSettingsActions, settingsMenuActions)
        .onAppear { if app.serverInput.isEmpty { app.serverInput = serverDraft } }
        .onChange(of: app.serverInput) { _, text in serverDraft = text }
        .sheet(isPresented: $gettingStarted, onDismiss: { app.libraryEditing?.showGettingStarted = false }) {
            if let editor = app.libraryEditing {
                GettingStartedScreen(editor: editor, add: nil, inSheet: true)
                    .onExitCommand { editor.showGettingStarted = false; gettingStarted = false }
                    .onChange(of: editor.showGettingStarted) { _, visible in if !visible { gettingStarted = false } }
            }
        }
    }
    private var settingsMenuActions: MenuActionContext {
        var actions: [MenuAction: () -> Void] = [:]
        if app.isStandalone && !app.syncing { actions[.refresh] = { Task { await app.sync(forceRefresh: true) } } }
        if app.origin != nil {
            actions[.disconnect] = { app.disconnect() }
            if app.bringOverAvailable && !app.syncing { actions[.offerBringOver] = { Task { await app.offerBringOver() } } }
            if app.bringOverJob?.complete == false && !app.syncing { actions[.retryBringOver] = { Task { await app.sync(forceRefresh: true) } } }
        } else if !app.connecting && !app.serverInput.isEmpty { actions[.connect] = { Task { await app.connect() } } }
        return MenuActionContext(actions: actions)
    }
}

private struct BringOverPreviewScreen: SwiftUI.View {
    @Bindable var app: ApplicationModel
    let preview: BringOverPreview
    var body: some SwiftUI.View {
        PodListSheet(title: "Bring this Mac’s Library over?", width: 560, actionTitle: "Bring Over",
                     cancelTitle: "Not Now", cancel: { app.declineBringOver() },
                     action: { Task { await app.acceptBringOver() } }) {
            Text("To \(app.origin ?? "the server")").foregroundStyle(MacReadableSecondaryStyle()).textSelection(.enabled)
            LabeledContent("Subscriptions", value: "\(preview.addedSubscriptions) added · \(preview.mergedSubscriptions) merged")
            LabeledContent("Episodes", value: "\(preview.addedEpisodes) added · \(preview.mergedEpisodes) matched")
            LabeledContent("Playlists", value: "\(preview.playlists) added · Default merged")
            LabeledContent("Entries and Positions", value: "\(CountText.format(preview.entries, .entry)) · \(CountText.format(preview.positions, .position))")
            LabeledContent("Played and Starred", value: "\(preview.played) Played · \(preview.starred) Starred")
            LabeledContent("Listening Log", value: Presentation.time(preview.listeningSeconds))
            LabeledContent("Views and Downloads", value: "\(CountText.format(preview.views, .view)) · \(CountText.format(preview.downloads, .download))")
            Text("Podcasts match by feed address and Episodes by guid. Default Playlist Entries, Positions, Played and Starred marks and the Listening Log merge with the server. Other Playlists and Views are kept with unique names. Saved settings and this Mac’s Download Rules come too; downloads are kept as Manual Downloads.").macContentFont(.callout)
            Text("The original Library stays on this Mac. An interrupted bring-over resumes automatically, or use Retry in Settings. Not Now keeps the Libraries separate; you can return here later.").macContentFont(.callout).foregroundStyle(MacReadableSecondaryStyle())
        } status: {
            if let error = app.bringOverError { Text(error).foregroundStyle(Color.podListError) }
        }
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .notNow: { app.declineBringOver() }, .bringOver: { Task { await app.acceptBringOver() } }
        ]))
    }
}

private struct GeneralLibrarySettingsFields: SwiftUI.View {
    let library: LibraryModel
    @Bindable var editor: LibraryEditingModel
    let editing: PlaylistEditingModel
    @State private var draft: GeneralSettingsEdits
    init(library: LibraryModel, editor: LibraryEditingModel, editing: PlaylistEditingModel) {
        self.library = library; self.editor = editor; self.editing = editing
        _draft = State(initialValue: GeneralSettingsEdits(playback: library.state.playbackSettings, trashDays: library.state.trashDays ?? 30, drafts: editing.drafts))
    }
    var body: some SwiftUI.View {
        Group {
            Section("Playback Settings") {
                Picker("Speed", selection: field(\.speed, setting: "Speed")) {
                    ForEach([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3], id: \.self) { Text("\($0.formatted())×").tag($0) }
                    if ![0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].contains(draft.playback.speed) { Text("\(draft.playback.speed.formatted())×").tag(draft.playback.speed) }
                }.accessibilityLabel("Speed")
                playbackFailure("Speed")
                PersistentNumberField(label: "Skip Intro", field: "settings.skipIntro", value: draft.playback.skipIntro, editor: editor) {
                    draft.playback.skipIntro = $0; savePlayback("Skip Intro")
                }
                playbackFailure("Skip Intro")
                PersistentNumberField(label: "Skip Outro", field: "settings.skipOutro", value: draft.playback.skipOutro, editor: editor) {
                    draft.playback.skipOutro = $0; savePlayback("Skip Outro")
                }
                playbackFailure("Skip Outro")
                Toggle("Volume Boost", isOn: field(\.volumeBoost, setting: "Volume Boost"))
                    .accessibilityLabel("Volume Boost")
                playbackFailure("Volume Boost")
            }
            Section("Trash") {
                Picker("Keep in Trash", selection: Binding(get: { draft.trashDays }, set: {
                    draft.trashDays = $0; draft.save(.setTrashDays(days: $0), setting: "Keep Playlists in Trash", using: editing)
                })) {
                    ForEach([1, 7, 14, 30, 60, 90, 365] as [Int64], id: \.self) { Text(CountText.format($0, .day)).tag($0) }
                    if ![1, 7, 14, 30, 60, 90, 365].contains(draft.trashDays) { Text(CountText.format(draft.trashDays, .day)).tag(draft.trashDays) }
                }.accessibilityLabel("Keep in Trash")
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
            FailureFeedback(message: message, retryTitle: "Retry Saving Settings", retry: retry).macContentFont(.callout)
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
                    .labelsHidden()
                    .frame(width: 88).textFieldStyle(.roundedBorder).focused($focused)
                    Text("seconds").foregroundStyle(MacReadableSecondaryStyle())
                }
                if !valid { Text("\(label) must be a nonnegative number of seconds.").macContentFont(.caption).foregroundStyle(Color.podListError).fixedSize(horizontal: false, vertical: true) }
            }
        }
        .onChange(of: value) { _, _ in if !focused && valid { text = nil; editor.clearDraft(field) } }
        .onChange(of: focused) { _, active in if !active && valid { text = nil; editor.clearDraft(field) } }
    }
}

struct GettingStartedScreen: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let add: (() -> Void)?
    var inSheet = false
    var body: some SwiftUI.View {
        Group {
            if inSheet {
                PodListSheet(title: "Getting Started", width: 500, actionTitle: "Hide Getting Started", cancelTitle: nil,
                             cancel: { editor.showGettingStarted = false }, action: { editor.showGettingStarted = false }) {
                    steps
                }.onExitCommand { editor.showGettingStarted = false }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Getting Started").macContentFont(.headline)
                    steps
                    HStack { Spacer(); Button("Hide Getting Started") { editor.showGettingStarted = false } }
                }.padding(12)
            }
        }
        .focusedSceneValue(\.podListTutorialActions, MenuActionContext(actions: [.dismissTutorial: { editor.showGettingStarted = false }]))
    }
    private var steps: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Add Podcasts to Your Library", systemImage: "1.circle")
            Text("Search by name or enter a feed address.").foregroundStyle(MacReadableSecondaryStyle())
            if let add { Button("Add Podcasts…", action: add) }
            else { Text("Use File › Add Podcasts… (⇧⌘A) in the Library window.").macContentFont(.caption) }
            Label("Understand Views", systemImage: "2.circle")
            Text("Views find Episodes. Open a View, or edit its conditions to see the match count change.").foregroundStyle(MacReadableSecondaryStyle())
            Label("Add Episodes to Playlists", systemImage: "3.circle")
            Text("Use Add to a Playlist or Play Now. Each Playlist remembers its own Position.").foregroundStyle(MacReadableSecondaryStyle())
        }
    }
}

public struct GettingStartedWindow: SwiftUI.View {
    @Bindable var app: ApplicationModel
    @Environment(\.dismissWindow) private var dismissWindow
    public init(app: ApplicationModel) { self.app = app }
    public var body: some SwiftUI.View {
        Group {
            if let editor = app.libraryEditing {
                GettingStartedScreen(editor: editor, add: nil).padding(25)
                    .onAppear { editor.showGettingStarted = true }
                    .onDisappear { editor.showGettingStarted = false }
                    .onChange(of: editor.showGettingStarted) { _, visible in if !visible { dismissWindow(id: "getting-started") } }
            }
        }.frame(width: 500).macContentFont(.body)
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
                if stats.isEmpty {
                    PodListEmptyState("No Listening Time Yet", systemImage: "chart.bar",
                                      description: "Stats count the time you spend playing Episodes. Moving an Episode’s Position without playing it doesn’t count.")
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            Text("Time Listened").macContentFont(.headline)
                            ForEach(stats.totals, id: \.name) { total in
                                LabeledContent(total.name) { Text("\(ListeningStatsPresentation.time(total.seconds)) listened · \(CountText.format(total.finished, .episode)) finished") }
                            }
                            Text("Listening time includes Episodes you have not finished. The finished count includes only Episodes finished by listening; Rewind or Mark Unplayed can reduce it.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                            Text("Listening Streak: \(CountText.format(stats.streak, .day))").macContentFont(.headline)
                            if stats.days.contains(where: { $0.seconds > 0 }) {
                                Text("Daily Listening").macContentFont(.headline)
                                let seconds = ListeningStatsPresentation.usesSeconds(stats.days.map(\.seconds))
                                Toggle("Show Daily Table", isOn: $table)
                                if table {
                                    ForEach(stats.days.reversed()) { day in LabeledContent(day.date.formatted(date: .abbreviated, time: .omitted), value: ListeningStatsPresentation.time(day.seconds)) }
                                } else {
                                    Chart(stats.days) { day in
                                        BarMark(x: .value("Day", day.date, unit: .day), y: .value(seconds ? "Seconds listened" : "Minutes listened", day.seconds / (seconds ? 1 : 60)))
                                            .foregroundStyle(MacAccentForegroundStyle())
                                    }
                                        .chartXAxis { AxisMarks { _ in
                                            AxisGridLine()
                                            AxisTick()
                                            AxisValueLabel().foregroundStyle(MacReadableSecondaryStyle())
                                        } }
                                        .chartYAxis { AxisMarks { _ in
                                            AxisGridLine()
                                            AxisTick()
                                            AxisValueLabel().foregroundStyle(MacReadableSecondaryStyle())
                                        } }
                                        .chartYScale(domain: 0...max(1, (stats.days.map(\.seconds).max() ?? 0) / (seconds ? 1 : 60)))
                                        .chartYAxisLabel { Text(seconds ? "Seconds" : "Minutes").foregroundStyle(MacReadableSecondaryStyle()) }
                                        .frame(height: 200).accessibilityLabel("Daily listening in \(seconds ? "seconds" : "minutes") for the last 30 days. Use Show Daily Table for exact values.")
                                }
                            }
                            if !stats.podcasts.isEmpty {
                                Text("Top Podcasts").macContentFont(.headline)
                                ForEach(stats.podcasts, id: \.id) { item in
                                    LabeledContent(library.snapshot.subscriptions.first { $0.id == item.id }?.title ?? "Removed Subscription", value: ListeningStatsPresentation.time(item.seconds))
                                }
                            }
                        }.padding(25)
                    }
                    .focusedSceneValue(\.podListDailyTable, stats.days.contains(where: { $0.seconds > 0 }) ? $table : nil)
                }
            } else { PodListEmptyState("Open a Library to see Listening stats", systemImage: "chart.bar") }
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
