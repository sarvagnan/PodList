#if os(macOS)
import SwiftUI
import AppKit
import Observation
import PodListDomain

@MainActor @Observable
final class PlaylistPresentation {
    enum Sheet: Identifiable {
        case newPlaylist, add([String], Bool), settings(String)
        var id: String {
            switch self { case .newPlaylist: "new"; case let .add(ids, new): "add/\(ids)/\(new)"; case let .settings(id): "settings/\(id)" }
        }
    }
    var sheet: Sheet?
    var playlistTab = PlaylistTab.entries
}

struct EpisodeActionItems: SwiftUI.View {
    let ids: [String]
    let library: LibraryModel?
    let editing: PlaylistEditingModel?
    let presentation: PlaylistPresentation?
    let app: ApplicationModel
    var keyboardShortcuts = false
    var overrides: EpisodeMenuOverrides? = nil
    var body: some SwiftUI.View {
        if keyboardShortcuts || !ids.isEmpty || overrides != nil {
            Button("Play Now") {
                if let overrides { overrides.play() } else { Task { await editing?.add(ids, placement: .now) } }
            }
            .keyboardShortcut(shortcut(.playNow))
            if keyboardShortcuts || overrides == nil {
                Group {
                    Button("Play Next in \(activeName)") { Task { await editing?.add(ids, placement: .next) } }
                        .keyboardShortcut(shortcut(.playNext))
                    Button("Play Last in \(activeName)") { Task { await editing?.add(ids, placement: .last) } }
                        .keyboardShortcut(shortcut(.playLast))
                    // Keep per-Playlist placement menus in the menu bar. Contexts
                    // retain the common active-Playlist actions and the chooser.
                    if keyboardShortcuts {
                        ForEach([Placement.now, .next, .last], id: \.rawValue) { placement in
                            Menu(placement == .now ? "Play Now in" : placement == .next ? "Play Next in" : "Play Last in") {
                                ForEach(library?.state.playlists ?? [], id: \.id) { playlist in
                                    Button(playlist.name) { Task { await editing?.add(ids, to: playlist.id, placement: placement) } }
                                }
                                Divider()
                                Button("New Playlist…") { presentation?.sheet = .add(ids, true) }
                            }
                        }
                    }
                }.disabled(ids.isEmpty || overrides != nil)
            }
            Button("Add to a Playlist…") {
                if let overrides { overrides.add() } else { presentation?.sheet = .add(ids, false) }
            }
                .keyboardShortcut(shortcut(.addToPlaylist))
            if keyboardShortcuts || overrides == nil {
                Group {
                    if keyboardShortcuts || !memberships.isEmpty {
                        Menu("Resume in Playlist") {
                            ForEach(memberships, id: \.id) { membership in
                                Button(membership.name) {
                                    guard let id = ids.first else { return }
                                    Task { await EpisodePlaybackAction.resume(episodeID: id, playlistID: membership.id, app: app) }
                                }
                            }
                        }.disabled(memberships.isEmpty)
                    }
                    if keyboardShortcuts || !chapters.isEmpty {
                        Menu("Play Chapter") {
                            ForEach(chapters.enumerated(), id: \.element.start) { index, chapter in
                                Button(chapter.title.isEmpty ? "Chapter \(index + 1)" : chapter.title) {
                                    guard let id = ids.first else { return }
                                    Task { await EpisodePlaybackAction.chapter(chapter.start, episodeID: id, app: app) }
                                }
                            }
                        }.disabled(chapters.isEmpty)
                    }
                    Divider()
                    EpisodeDownloadItems(ids: ids, app: app, keyboardShortcuts: keyboardShortcuts)
                    if keyboardShortcuts || shareURL != nil {
                        ShareLink(items: shareURL.map { [$0] } ?? []) { Text("Share Episode…") }.disabled(shareURL == nil)
                        Button("Copy Link") { if let shareURL { ShareLinks.copy(shareURL) } }.disabled(shareURL == nil)
                    }
                    Button(actionLabels.star) { Task { await editing?.setStar(ids, starred: !allStarred) } }
                        .keyboardShortcut(shortcut(.star))
                    Button(actionLabels.played) { Task { await editing?.markPlayed(ids, played: !allPlayed) } }
                        .keyboardShortcut(shortcut(.played))
                }.disabled(ids.isEmpty || overrides != nil)
            }
        }
    }
    private var chapters: [Chapter] {
        guard ids.count == 1, let id = ids.first else { return [] }
        return library?.snapshot.episodes.first { $0.id == id }?.chapters ?? []
    }
    private var memberships: [(id: String, name: String, position: Double)] {
        guard ids.count == 1, let id = ids.first else { return [] }
        return library?.memberships(id) ?? []
    }
    private func shortcut(_ action: PodListShortcut) -> KeyboardShortcut? { keyboardShortcuts ? action.shortcut : nil }
    private var shareURL: URL? { ids.count == 1 ? ids.first.flatMap { library?.episodeShareURL($0) } : nil }
    private var actionLabels: EpisodeActionLabels { .init(allStarred: allStarred, allPlayed: allPlayed) }
    private var activeName: String { library?.state.playlists.first { $0.id == library?.state.activePlaylistId }?.name ?? "Active Playlist" }
    private var allStarred: Bool { !ids.isEmpty && ids.allSatisfy { library?.state.episodeStates[$0]?.starred == true } }
    private var allPlayed: Bool { !ids.isEmpty && ids.allSatisfy { library?.state.episodeStates[$0]?.played != nil } }
}

/// The visible and spoken action vocabulary is shared by the toolbar and menus.
struct EpisodeActionLabels {
    let allStarred: Bool
    let allPlayed: Bool
    let play = "Play Now"
    let add = "Add to a Playlist"
    let download = "Download"
    let more = "More Episode Actions"
    var star: String { allStarred ? "Unstar" : "Star" }
    var played: String { allPlayed ? "Mark Unplayed" : "Mark Played" }
    var names: [String] { [play, add, download, star, played, more] }
}

struct EpisodeActionButtons: ToolbarContent {
    let ids: [String]
    let library: LibraryModel
    let editing: PlaylistEditingModel
    let presentation: PlaylistPresentation
    let app: ApplicationModel
    private var labels: EpisodeActionLabels {
        EpisodeActionLabels(allStarred: !ids.isEmpty && ids.allSatisfy { library.state.episodeStates[$0]?.starred == true },
                            allPlayed: !ids.isEmpty && ids.allSatisfy { library.state.episodeStates[$0]?.played != nil })
    }
    private var disabled: Bool { ids.isEmpty || editing.busy }
    var body: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            ControlGroup {
                Button("Play Now", systemImage: "play.fill") { Task { await editing.add(ids, placement: .now) } }
                    .accessibilityLabel(labels.play).help("Play selected Episodes now (\(PodListShortcut.playNow.notation))").disabled(disabled)
                Button("Add to a Playlist…", systemImage: "text.badge.plus") { presentation.sheet = .add(ids, false) }
                    .accessibilityLabel(labels.add).help("Add selected Episodes to a Playlist").disabled(disabled)
                Menu("Episode Actions", systemImage: "ellipsis.circle") {
                    EpisodeActionItems(ids: ids, library: library, editing: editing, presentation: presentation, app: app)
                }.menuStyle(.borderlessButton).fixedSize()
                    .accessibilityLabel(labels.more).help("More Episode Actions").disabled(disabled)
            }.controlSize(.small)
        }
    }
}

struct EditingFeedback: SwiftUI.View {
    @Environment(\.macTextScale) private var textScale
    @State private var lifetime: EditingFeedbackLifetime
    let editing: PlaylistEditingModel
    var additionalError: String? = nil
    var additionalStatus: String? = nil
    var undo: (() -> Void)? = nil
    var redo: (() -> Void)? = nil
    var retry: (() -> Void)? = nil
    var reservesSpace: Bool
    init(editing: PlaylistEditingModel, additionalError: String? = nil, additionalStatus: String? = nil,
         undo: (() -> Void)? = nil, redo: (() -> Void)? = nil, retry: (() -> Void)? = nil,
         reservesSpace: Bool = true) {
        self.editing = editing; self.additionalError = additionalError; self.additionalStatus = additionalStatus; self.undo = undo; self.redo = redo; self.retry = retry
        self.reservesSpace = reservesSpace
        _lifetime = State(initialValue: EditingFeedbackLifetime(currentNotice: editing.feedbackNotice))
    }
    private var error: String? { additionalError ?? editing.error }
    var body: some SwiftUI.View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            feedback(at: context.date)
        }
        .onChange(of: additionalError) { _, message in editing.announcements.error(message) }
    }
    private func feedback(at now: Date) -> some SwiftUI.View {
        let text = error ?? additionalStatus ?? lifetime.message(for: editing.feedbackNotice, at: now)
        return Group {
            if reservesSpace || text != nil || retryCommand != nil || editing.history.undo != nil || editing.history.redo != nil {
                feedbackRow(text: text)
            }
        }
        // Keep menu commands available even when there is no visible status row.
        .focusedSceneValue(\.podListEditHistory, undo != nil || redo != nil ? EditHistoryCommandContext(undo: undo, redo: redo) : nil)
        .modifier(FocusedRetry(action: retryCommand, title: editing.retryKind == .undo ? "Retry Undo" : editing.retryKind == .redo ? "Retry Redo" : "Retry Last Edit"))
    }
    private func feedbackRow(text: String?) -> some SwiftUI.View {
        HStack {
            if let text {
                Text(text).foregroundStyle(error == nil ? Color.primary : Color.podListError)
                    .fixedSize(horizontal: false, vertical: true).help(text).textSelection(.enabled)
            }
            Spacer(minLength: 8)
            if error == editing.error, editing.canRetry {
                Button("Retry", action: retryFailure).disabled(editing.busy)
            }
            if editing.history.undo != nil {
                Button(editing.undoTitle) { if let undo { undo() } else { Task { await editing.reverse() } } }.disabled(editing.busy)
            }
            if editing.history.redo != nil {
                Button(editing.redoTitle) { if let redo { redo() } else { Task { await editing.reverse(redo: true) } } }.disabled(editing.busy)
            }
        }.macContentFont(.caption).lineLimit(textScale > 1 ? nil : 1).padding(.horizontal, 14)
            .padding(.vertical, reservesSpace ? 0 : 3)
            .frame(height: reservesSpace && textScale <= 1 ? 32 : nil)
            .frame(minHeight: reservesSpace ? 32 : nil)
            .accessibilityElement(children: .contain).accessibilityLabel("Edit status")
    }
    private var retryCommand: (() -> Void)? {
        guard error == editing.error, editing.canRetry else { return nil }
        return { retryFailure() }
    }
    private func retryFailure() {
        switch editing.retryKind {
        case .edit: if let retry { retry(); return }
        case .undo: if let undo { undo(); return }
        case .redo: if let redo { redo(); return }
        case nil: return
        }
        Task { await editing.retryFailure() }
    }

}

struct PlaylistSheetHost: ViewModifier {
    @Bindable var presentation: PlaylistPresentation
    let app: ApplicationModel
    let created: (String) -> Void
    func body(content: Content) -> some SwiftUI.View {
        content.sheet(item: $presentation.sheet) { sheet in
            if let editing = app.editing {
                switch sheet {
                case .newPlaylist:
                    NewPlaylistSheet(app: app, editing: editing) { id in presentation.sheet = nil; created(id) }
                case let .add(ids, new):
                    AddPlaylistSheet(ids: ids, preferNew: new, app: app, editing: editing) { presentation.sheet = nil }
                case let .settings(id):
                    PlaylistSettingsSheet(id: id, app: app, editing: editing) { presentation.sheet = nil }
                }
            }
        }
    }
}

struct EpisodeCommandContext {
    let ids: [String]
    let library: LibraryModel
    let window: WindowModel
    let presentation: PlaylistPresentation
    let showDetails: () -> Void
}
private struct EpisodeContextKey: FocusedValueKey { typealias Value = EpisodeCommandContext }
extension FocusedValues {
    var podListEpisodes: EpisodeCommandContext? {
        get { self[EpisodeContextKey.self] }
        set { self[EpisodeContextKey.self] = newValue }
    }
}

public struct PlaylistEditingCommands: Commands {
    @Bindable private var app: ApplicationModel
    @FocusedValue(\.podListEpisodes) private var context
    @FocusedValue(\.podListEpisodeDetails) private var episodeDetails
    @FocusedValue(\.podListRemoteEpisode) private var remoteEpisode
    @FocusedValue(\.podListNowPlayingEpisode) private var nowPlayingEpisode
    @FocusedValue(\.podListPlaylist) private var playlistContext
    @FocusedValue(\.podListPlaylistSettingsActions) private var playlistSettings
    @FocusedValue(\.podListEditHistory) private var editHistory
    @FocusedValue(\.podListRestore) private var restore
    @FocusedValue(\.podListDeletePermanently) private var deletePermanently
    @FocusedValue(\.podListRewind) private var rewind
    public init(app: ApplicationModel) { self.app = app }
    public var body: some Commands {
        CommandGroup(replacing: .undoRedo) {
            Button(textEditor == nil ? app.editing?.undoTitle ?? "Undo" : textEditor?.undoManager?.undoMenuItemTitle ?? "Undo") {
                if let editor = textEditor { editor.undoManager?.undo() }
                else if let undo = editHistory?.undo { undo() }
                else { Task { await app.editing?.reverse() } }
            }.keyboardShortcut("z").disabled(textEditor == nil ? app.editing?.history.undo == nil || app.editing?.busy == true : textEditor?.undoManager?.canUndo != true)
            Button(textEditor == nil ? app.editing?.redoTitle ?? "Redo" : textEditor?.undoManager?.redoMenuItemTitle ?? "Redo") {
                if let editor = textEditor { editor.undoManager?.redo() }
                else if let redo = editHistory?.redo { redo() }
                else { Task { await app.editing?.reverse(redo: true) } }
            }.keyboardShortcut("z", modifiers: [.command, .shift]).disabled(textEditor == nil ? app.editing?.history.redo == nil || app.editing?.busy == true : textEditor?.undoManager?.canRedo != true)
        }
        CommandMenu("Episode") {
            MenuActionItems(menu: .episode, app: app)
            Button("Show Episode Details") {
                if let episodeDetails { episodeDetails() } else { context?.showDetails() }
            }.disabled(episodeDetails == nil && context?.ids.isEmpty != false)
            Divider()
            EpisodeActionItems(ids: actionIDs, library: nowPlayingEpisode?.library ?? context?.library ?? app.library, editing: app.editing,
                               presentation: nowPlayingEpisode?.presentation ?? context?.presentation, app: app, keyboardShortcuts: true, overrides: remoteEpisode)
                .disabled((selectionUnavailable && remoteEpisode == nil) || app.editing?.busy == true)
            Divider()
            Button("Play from Here") {
                guard let id = entriesPlaylistID else { return }
                Task { await app.editing?.playFromHere(playlistID: id, episodeID: context?.ids.first) }
            }.disabled(entriesPlaylistID == nil || selectionUnavailable)
            Button("Move Up") { move(down: false) }
                .keyboardShortcut(.upArrow, modifiers: [.command, .option]).disabled(entriesPlaylistID == nil || selectionUnavailable)
            Button("Move Down") { move(down: true) }
                .keyboardShortcut(.downArrow, modifiers: [.command, .option]).disabled(entriesPlaylistID == nil || selectionUnavailable)
            Button("Remove from Playlist") {
                guard let id = entriesPlaylistID else { return }
                Task { await app.editing?.remove(context?.ids ?? [], playlistID: id) }
            }.keyboardShortcut(.delete, modifiers: .command).disabled(entriesPlaylistID == nil || selectionUnavailable || textEditor != nil)
        }
        CommandMenu("Playlist") {
            Menu("Open Playlist") {
                ForEach(context?.library.state.playlists ?? [], id: \.id) { playlist in
                    Button(playlist.name) { context?.window.navigate(to: .playlist(playlist.id)) }
                }
            }.disabled(context?.library.state.playlists.isEmpty != false)
            Picker("Section", selection: Binding(get: { playlistContext?.presentation.playlistTab ?? .entries }, set: { playlistContext?.presentation.playlistTab = $0 })) {
                ForEach(PlaylistTab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }.pickerStyle(.inline).disabled(playlistContext == nil)
            Divider()
            Toggle("Clear on Played", isOn: Binding(get: { playlistContext?.playlist.clearOnPlayed ?? false }, set: { value in
                guard let playlistContext else { return }
                Task { await app.editing?.edit([.setClearOnPlayed(playlistId: playlistContext.playlist.id, clearOnPlayed: value)], name: "Clear on Played") }
            })).disabled(playlistContext == nil || app.editing == nil || app.editing?.busy == true)
            Button("Restore") { restore?() }.disabled(restore == nil)
            Button("Delete Permanently…", role: .destructive) { deletePermanently?() }.disabled(deletePermanently == nil)
            Button("Rewind to Here…") { rewind?() }.disabled(rewind == nil)
            Divider()
            Button("Trash") { context?.window.navigate(to: .trash) }.disabled(context == nil)
            Button("Play This Playlist") {
                guard let playlist = playlistContext?.playlist else { return }
                Task { await app.editing?.playFromHere(playlistID: playlist.id, episodeID: playlist.cursor ?? playlist.entries.first?.episodeId) }
            }.disabled(playlistUnavailable || playlistContext?.playlist.entries.isEmpty != false)
            Button("Playlist Settings…") {
                guard let playlistContext else { return }
                playlistContext.presentation.sheet = .settings(playlistContext.playlist.id)
            }.keyboardShortcut(PodListShortcut.playlistSettings.shortcut).disabled(playlistUnavailable)
            Button("Rename Playlist…") {
                if let playlistSettings { playlistSettings.rename?(); return }
                guard let playlistContext, let editing = app.editing else { return }
                if PlaylistRenameAction.prepare(playlistContext.playlist, editing: editing) {
                    playlistContext.presentation.sheet = .settings(playlistContext.playlist.id)
                }
            }.disabled(playlistSettings != nil ? playlistSettings?.rename == nil : playlistUnavailable || playlistContext?.playlist.isDefault != false)
            Button("Delete Playlist", role: .destructive) {
                if let playlistSettings { playlistSettings.delete?(); return }
                guard let playlist = playlistContext?.playlist else { return }
                Task { await app.editing?.delete(playlist) }
            }.disabled(playlistSettings != nil ? playlistSettings?.delete == nil : playlistUnavailable || playlistContext?.playlist.isDefault != false)
        }
    }
    private var actionIDs: [String] { nowPlayingEpisode.map { [$0.id] } ?? context?.ids ?? [] }
    private var selectionUnavailable: Bool { actionIDs.isEmpty || app.editing == nil || app.editing?.busy == true }
    private var playlistUnavailable: Bool { playlistContext == nil || app.editing == nil || app.editing?.busy == true }
    private var entriesPlaylistID: String? {
        guard playlistContext?.presentation.playlistTab == .entries else { return nil }
        return playlistContext?.playlist.id
    }
    private func move(down: Bool) {
        guard let id = entriesPlaylistID else { return }
        Task { await app.editing?.move(Set(context?.ids ?? []), playlistID: id, down: down) }
    }
    private var textEditor: NSTextView? {
        guard let editor = NSApp.keyWindow?.firstResponder as? NSTextView, editor.isEditable else { return nil }
        return editor
    }
}
#endif
