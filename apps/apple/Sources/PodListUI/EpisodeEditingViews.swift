#if os(macOS)
import SwiftUI
import AppKit
import Observation
import PodListDomain

extension EnvironmentValues {
    @Entry var libraryEditOrigin: EditOrigin? = nil
}

@MainActor @Observable
final class PlaylistPresentation {
    enum Sheet: Identifiable {
        case newPlaylist, add([String], Bool), settings(String)
        var id: String {
            switch self { case .newPlaylist: "new"; case let .add(ids, new): "add/\(ids)/\(new)"; case let .settings(id): "settings/\(id)" }
        }
    }
    var sheet: Sheet?
    private(set) var sheetOrigin: EditOrigin?

    func present(_ sheet: Sheet, from origin: EditOrigin?) {
        sheetOrigin = origin
        self.sheet = sheet
    }
}

struct EpisodeActionItems: SwiftUI.View {
    @Environment(\.libraryEditOrigin) private var libraryOrigin
    let ids: [String]
    let library: LibraryModel?
    let editing: PlaylistEditingModel?
    let presentation: PlaylistPresentation?
    let app: ApplicationModel
    var keyboardShortcuts = false
    var overrides: EpisodeMenuOverrides? = nil
    var commandOrigin: EditOrigin? = nil
    private var origin: EditOrigin? { commandOrigin ?? libraryOrigin }
    var body: some SwiftUI.View {
        if keyboardShortcuts || !ids.isEmpty || overrides != nil {
            Button("Play Now") {
                if let overrides { overrides.play() } else { EditOrigin.start(origin) { await editing?.add(ids, placement: .now) } }
            }
            .keyboardShortcut(shortcut(.playNow))
            if keyboardShortcuts || overrides == nil {
                Group {
                    Button("Play Next in \(activeName)") { EditOrigin.start(origin) { await editing?.add(ids, placement: .next) } }
                        .keyboardShortcut(shortcut(.playNext))
                    Button("Play Last in \(activeName)") { EditOrigin.start(origin) { await editing?.add(ids, placement: .last) } }
                        .keyboardShortcut(shortcut(.playLast))
                    // Keep per-Playlist placement menus in the menu bar. Contexts
                    // retain the common active-Playlist actions and the chooser.
                    if keyboardShortcuts {
                        ForEach([Placement.now, .next, .last], id: \.rawValue) { placement in
                            Menu(placement == .now ? "Play Now In" : placement == .next ? "Play Next In" : "Play Last In") {
                                ForEach(library?.state.playlists ?? [], id: \.id) { playlist in
                                    Button(playlist.name) { EditOrigin.start(origin) { await editing?.add(ids, to: playlist.id, placement: placement) } }
                                }
                                Divider()
                                Button("New Playlist…") { presentation?.present(.add(ids, true), from: origin) }
                            }
                        }
                    }
                }.disabled(ids.isEmpty || overrides != nil)
            }
            Button("Add to a Playlist…") {
                if let overrides { overrides.add() } else { presentation?.present(.add(ids, false), from: origin) }
            }
                .keyboardShortcut(shortcut(.addToPlaylist))
            if keyboardShortcuts || overrides == nil {
                Group {
                    if keyboardShortcuts || !memberships.isEmpty {
                        Menu("Resume in Playlist") {
                            ForEach(memberships, id: \.id) { membership in
                                Button(membership.name) {
                                    guard let id = ids.first else { return }
                                    EditOrigin.start(origin) { await EpisodePlaybackAction.resume(episodeID: id, playlistID: membership.id, app: app) }
                                }
                            }
                        }.disabled(memberships.isEmpty)
                    }
                    if keyboardShortcuts || !chapters.isEmpty {
                        Menu("Play Chapter") {
                            ForEach(chapters.enumerated(), id: \.element.start) { index, chapter in
                                Button(chapter.title.isEmpty ? "Chapter \(index + 1)" : chapter.title) {
                                    guard let id = ids.first else { return }
                                    EditOrigin.start(origin) { await EpisodePlaybackAction.chapter(chapter.start, episodeID: id, app: app) }
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
                    Button("Copy PodList Link") {
                        if let id = ids.first { ShareLinks.copy(PodListLink.episode(id).url) }
                    }.disabled(ids.count != 1)
                    Button(actionLabels.star) { EditOrigin.start(origin) { await editing?.setStar(ids, starred: !allStarred) } }
                        .keyboardShortcut(shortcut(.star))
                    Button(actionLabels.played) { EditOrigin.start(origin) { await editing?.markPlayed(ids, played: !allPlayed) } }
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
    var origin: EditOrigin? = nil
    var playlist: Playlist? = nil
    var editView: (() -> Void)? = nil
    private var playsPlaylist: Bool { ids.isEmpty && playlist != nil }
    private var labels: EpisodeActionLabels {
        EpisodeActionLabels(allStarred: !ids.isEmpty && ids.allSatisfy { library.state.episodeStates[$0]?.starred == true },
                            allPlayed: !ids.isEmpty && ids.allSatisfy { library.state.episodeStates[$0]?.played != nil })
    }
    private var disabled: Bool { ids.isEmpty || editing.busy }
    var body: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            ControlGroup {
                Button("Play Now", systemImage: "play.fill") {
                    EditOrigin.start(origin) {
                        if playsPlaylist, let playlist {
                            await editing.playFromHere(playlistID: playlist.id, episodeID: playlist.cursor ?? playlist.entries.first?.episodeId)
                        } else { await editing.add(ids, placement: .now) }
                    }
                }
                    .accessibilityIdentifier("toolbar.play")
                    .accessibilityLabel(playsPlaylist ? "Play This Playlist" : labels.play)
                    .help(playsPlaylist ? "Play this Playlist" : "Play selected Episodes now (\(PodListShortcut.playNow.notation))")
                    .disabled(editing.busy || (playsPlaylist ? playlist?.entries.isEmpty != false : ids.isEmpty))
                Button("Add to a Playlist…", systemImage: "text.line.last.and.arrowtriangle.forward") { presentation.present(.add(ids, false), from: origin) }
                    .accessibilityLabel(labels.add).help("Add selected Episodes to a Playlist").disabled(disabled)
                Menu("Episode Actions", systemImage: "ellipsis.circle") {
                    EpisodeActionItems(ids: ids, library: library, editing: editing, presentation: presentation, app: app, commandOrigin: origin)
                }.menuStyle(.borderlessButton).fixedSize()
                    .accessibilityLabel(labels.more).help("Show more Episode actions").disabled(disabled)
                if let playlist {
                    Button("Playlist Settings…", systemImage: "slider.horizontal.3") { presentation.present(.settings(playlist.id), from: origin) }
                        .help("Playlist settings (\(PodListShortcut.playlistSettings.notation))").accessibilityIdentifier("playlist.settings")
                } else if let editView {
                    Button("Edit View…", systemImage: "slider.horizontal.3", action: editView)
                        .help("Edit View (\(PodListShortcut.editView.notation))")
                }
            }.controlSize(.small).labelStyle(.iconOnly)
        }
    }
}

enum EditingFeedbackSurface {
    case library, secondary
}

struct LibrarySyncStatus: SwiftUI.View {
    let app: ApplicationModel
    var body: some SwiftUI.View {
        HStack(spacing: 8) {
            if app.feedRefreshProgress != nil {
                FeedRefreshFeedback(app: app)
            } else if app.syncing {
                ProgressView().controlSize(.mini).accessibilityLabel("Syncing")
                Text("Syncing…")
            } else if let error = app.syncError {
                Image(systemName: "exclamationmark.icloud").accessibilityHidden(true)
                FailureFeedback(message: error, retryTitle: "Retry Sync") { Task { await app.sync(forceRefresh: true) } }
                    .help(Presentation.tooltip(error))
            } else {
                Image(systemName: "checkmark.icloud").accessibilityHidden(true)
                Text(app.lastSync == nil ? "Local Library" : "Up to date")
            }
        }.foregroundStyle(MacReadableSecondaryStyle())
    }
}

struct EditingFeedback: SwiftUI.View {
    @Environment(\.macTextScale) private var textScale
    @State private var lifetime: EditingFeedbackLifetime
    @State private var expiredNotice: UUID?
    let editing: PlaylistEditingModel
    let surface: EditingFeedbackSurface
    let origin: EditOrigin?
    let sync: ApplicationModel?
    var additionalError: String? = nil
    var additionalStatus: String? = nil
    var undo: (() -> Void)? = nil
    var redo: (() -> Void)? = nil
    var retry: (() -> Void)? = nil
    var showRestoredEntries: (() -> Void)?
    var reservesSpace: Bool
    init(editing: PlaylistEditingModel, surface: EditingFeedbackSurface = .secondary, origin: EditOrigin? = nil, sync: ApplicationModel? = nil,
         additionalError: String? = nil, additionalStatus: String? = nil,
         undo: (() -> Void)? = nil, redo: (() -> Void)? = nil, retry: (() -> Void)? = nil,
         showRestoredEntries: (() -> Void)? = nil, reservesSpace: Bool = true) {
        self.editing = editing; self.surface = surface; self.sync = sync; self.additionalError = additionalError; self.additionalStatus = additionalStatus; self.undo = undo; self.redo = redo; self.retry = retry
        self.origin = origin
        self.showRestoredEntries = showRestoredEntries
        self.reservesSpace = reservesSpace
        _lifetime = State(initialValue: EditingFeedbackLifetime(currentNotice: editing.feedbackNotice))
    }
    private var error: String? { additionalError ?? editing.error }
    var body: some SwiftUI.View {
        let notice = editing.feedbackNotice
        let message = expiredNotice == notice?.id ? nil : lifetime.message(for: notice, at: .now)
        let text = error ?? additionalStatus ?? message
        Group {
            if reservesSpace || text != nil || sync != nil || retryCommand != nil || undoTitle != nil || redoTitle != nil {
                feedbackRow(text: text)
            }
        }
        // The row and its accessibility identifier stay mounted while a notice expires.
        .task(id: notice?.id) {
            guard let notice, lifetime.message(for: notice, at: .now) != nil else { return }
            do { try await Task.sleep(for: .seconds(max(0, notice.expiresAt.timeIntervalSinceNow))) }
            catch { return }
            if !Task.isCancelled { expiredNotice = notice.id }
        }
        .onChange(of: additionalError) { _, message in editing.announcements.error(message) }
        .modifier(FocusedRetry(action: retryCommand, title: editing.retryKind == .undo ? "Retry Undo" : editing.retryKind == .redo ? "Retry Redo" : "Retry Last Edit"))
    }
    private var undoTitle: String? { surface == .library ? editing.historyTitle(at: origin) : nil }
    private var redoTitle: String? { surface == .library ? editing.historyTitle(at: origin, redo: true) : nil }
    private func feedbackRow(text: String?) -> some SwiftUI.View {
        HStack {
            if let sync, sync.feedRefreshProgress != nil || (sync.syncError != nil && error == nil) {
                LibrarySyncStatus(app: sync)
            } else if let text {
                Text(text).foregroundStyle(error == nil ? Color.primary : Color.podListError)
                    .fixedSize(horizontal: false, vertical: true).help(Presentation.tooltip(text)).textSelection(.enabled)
            } else if let sync {
                LibrarySyncStatus(app: sync)
            }
            Spacer(minLength: 8)
            if retryCommand != nil {
                Button("Retry", action: retryFailure).disabled(editing.busy)
            }
            if let showRestoredEntries {
                Button("Show Restored Entries", action: showRestoredEntries).disabled(editing.busy)
            }
            if let undoTitle {
                Button(undoTitle) { if let undo { undo() } else { Task { await editing.reverse() } } }.disabled(editing.busy)
            }
            if let redoTitle {
                Button(redoTitle) { if let redo { redo() } else { Task { await editing.reverse(redo: true) } } }.disabled(editing.busy)
            }
        }.macContentFont(.caption).lineLimit(reservesSpace || textScale <= 1 ? 1 : nil).padding(.horizontal, 14)
            .padding(.vertical, reservesSpace ? 0 : 3)
            .frame(height: reservesSpace ? ceil(32 * textScale) : nil)
            .accessibilityElement(children: .contain).accessibilityLabel(sync == nil ? "Edit status" : "Library status")
            .accessibilityIdentifier(sync == nil ? "editing.status" : "library.status")
    }
    private var retryCommand: (() -> Void)? {
        guard error == editing.error, editing.canRetry else { return nil }
        guard surface == .library || editing.retryKind == .edit else { return nil }
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
                let origin = presentation.sheetOrigin
                switch sheet {
                case .newPlaylist:
                    NewPlaylistSheet(app: app, editing: editing, origin: origin) { id in presentation.sheet = nil; created(id) }
                case let .add(ids, new):
                    AddPlaylistSheet(ids: ids, preferNew: new, app: app, editing: editing, origin: origin) { presentation.sheet = nil }
                case let .settings(id):
                    PlaylistSettingsSheet(id: id, app: app, editing: editing, origin: origin) { presentation.sheet = nil }
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
    let editOrigin: EditOrigin
}
private struct RemovePlaylistSelectionKey: FocusedValueKey { typealias Value = () -> Void }
private struct EpisodeContextKey: FocusedValueKey { typealias Value = EpisodeCommandContext }
extension FocusedValues {
    var podListRemovePlaylistSelection: (() -> Void)? {
        get { self[RemovePlaylistSelectionKey.self] }
        set { self[RemovePlaylistSelectionKey.self] = newValue }
    }
    var podListEpisodes: EpisodeCommandContext? {
        get { self[EpisodeContextKey.self] }
        set { self[EpisodeContextKey.self] = newValue }
    }
}

public struct PlaylistEditingCommands: Commands {
    @Bindable private var app: ApplicationModel
    @State private var textUndo = MacTextUndo()
    @FocusedValue(\.podListEpisodes) private var context
    @FocusedValue(\.podListRemovePlaylistSelection) private var removePlaylistSelection
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
        let text = textUndo.state
        let undo = EditHistoryMenuAction(redo: false, text: text, editing: app.editing)
        let redo = EditHistoryMenuAction(redo: true, text: text, editing: app.editing)
        CommandGroup(replacing: .undoRedo) {
            Button(undo.title) {
                undo.perform(textUndo: textUndo, keyboardShortcut: EditHistoryMenuAction.isKeyboardShortcut,
                             editor: app.libraryEditing, context: editHistory)
            }.keyboardShortcut("z").disabled(!undo.isEnabled)
            Button(redo.title) {
                redo.perform(textUndo: textUndo, keyboardShortcut: EditHistoryMenuAction.isKeyboardShortcut,
                             editor: app.libraryEditing, context: editHistory)
            }.keyboardShortcut("z", modifiers: [.command, .shift]).disabled(!redo.isEnabled)
        }
        CommandMenu("Episode") {
            MenuActionItems(menu: .episode, app: app)
            Button("Show Episode Details") {
                if let episodeDetails { episodeDetails() } else { context?.showDetails() }
            }.disabled(episodeDetails == nil && context?.ids.isEmpty != false)
            Divider()
            EpisodeActionItems(ids: actionIDs, library: nowPlayingEpisode?.library ?? context?.library ?? app.library, editing: app.editing,
                               presentation: nowPlayingEpisode?.presentation ?? context?.presentation, app: app, keyboardShortcuts: true,
                               overrides: remoteEpisode, commandOrigin: nowPlayingEpisode == nil ? context?.editOrigin : nil)
                .disabled((selectionUnavailable && remoteEpisode == nil) || app.editing?.busy == true)
            Divider()
            Button("Play from Here") {
                guard let id = entriesPlaylistID else { return }
                EditOrigin.start(context?.editOrigin) { await app.editing?.playFromHere(playlistID: id, episodeID: context?.ids.first) }
            }.disabled(entriesPlaylistID == nil || selectionUnavailable)
            Button("Move Up") { move(down: false) }
                .keyboardShortcut(.upArrow, modifiers: [.command, .option]).disabled(entriesPlaylistID == nil || selectionUnavailable)
            Button("Move Down") { move(down: true) }
                .keyboardShortcut(.downArrow, modifiers: [.command, .option]).disabled(entriesPlaylistID == nil || selectionUnavailable)
            Button(context?.ids.isEmpty == true && removePlaylistSelection != nil ? "Remove Selected Failed Episode Drops" : "Remove from Playlist") {
                removePlaylistSelection?()
            }.keyboardShortcut(.delete, modifiers: .command).disabled(removePlaylistSelection == nil || text != nil)
        }
        CommandMenu("Playlist") {
            Menu("Open Playlist") {
                ForEach(context?.library.state.playlists ?? [], id: \.id) { playlist in
                    Button(playlist.name) { context?.window.navigate(to: .playlist(playlist.id)) }
                }
            }.disabled(context?.library.state.playlists.isEmpty != false)
            Picker("Show", selection: Binding(get: { playlistContext?.window.playlistTab ?? .entries }, set: { playlistContext?.window.showPlaylistTab($0) })) {
                ForEach(PlaylistTab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }.pickerStyle(.inline).disabled(playlistContext == nil)
            Divider()
            Toggle("Clear on Played", isOn: Binding(get: { playlistContext?.playlist.clearOnPlayed ?? false }, set: { value in
                guard let playlistContext else { return }
                EditOrigin.start(context?.editOrigin) {
                    await app.editing?.edit([.setClearOnPlayed(playlistId: playlistContext.playlist.id, clearOnPlayed: value)], name: "Clear on Played")
                }
            })).disabled(playlistContext == nil || app.editing == nil || app.editing?.busy == true)
            let restoreAction = PlaylistSettingsCommandContext.focusedRestore(sheet: playlistSettings, trash: restore)
            Button("Restore") { restoreAction?() }.disabled(restoreAction == nil)
            Button("Delete Permanently…", role: .destructive) { deletePermanently?() }.disabled(deletePermanently == nil)
            Button("Rewind to Here…") { rewind?() }.disabled(rewind == nil)
            Divider()
            Button(LibraryNavigationCommand.trash.title) { context?.window.navigate(to: LibraryNavigationCommand.trash.destination) }.disabled(context == nil)
            Button("Play This Playlist") {
                guard let playlist = playlistContext?.playlist else { return }
                EditOrigin.start(context?.editOrigin) {
                    await app.editing?.playFromHere(playlistID: playlist.id, episodeID: playlist.cursor ?? playlist.entries.first?.episodeId)
                }
            }.disabled(playlistUnavailable || playlistContext?.playlist.entries.isEmpty != false)
            Button("Copy PodList Link") {
                if let id = playlistContext?.playlist.id { ShareLinks.copy(PodListLink.playlist(id).url) }
            }.disabled(playlistContext == nil)
            Button("Playlist Settings…") {
                guard let playlistContext else { return }
                playlistContext.presentation.present(.settings(playlistContext.playlist.id), from: context?.editOrigin)
            }.keyboardShortcut(PodListShortcut.playlistSettings.shortcut).disabled(playlistUnavailable)
            Button("Rename Playlist…") {
                if let playlistSettings { playlistSettings.rename?(); return }
                guard let playlistContext, let editing = app.editing else { return }
                if PlaylistRenameAction.prepare(playlistContext.playlist, editing: editing) {
                    playlistContext.presentation.present(.settings(playlistContext.playlist.id), from: context?.editOrigin)
                }
            }.disabled(playlistSettings != nil ? playlistSettings?.rename == nil : playlistUnavailable || playlistContext?.playlist.isDefault != false)
            Button("Delete Playlist", role: .destructive) {
                if let playlistSettings { playlistSettings.delete?(); return }
                guard let playlist = playlistContext?.playlist else { return }
                EditOrigin.start(context?.editOrigin) { _ = await app.editing?.delete(playlist) }
            }.disabled(playlistSettings != nil ? playlistSettings?.delete == nil : playlistUnavailable || playlistContext?.playlist.isDefault != false)
        }
    }
    private var actionIDs: [String] { nowPlayingEpisode.map { [$0.id] } ?? context?.ids ?? [] }
    private var selectionUnavailable: Bool { actionIDs.isEmpty || app.editing == nil || app.editing?.busy == true }
    private var playlistUnavailable: Bool { playlistContext == nil || app.editing == nil || app.editing?.busy == true }
    private var entriesPlaylistID: String? {
        guard playlistContext?.window.playlistTab == .entries else { return nil }
        return playlistContext?.playlist.id
    }
    private func move(down: Bool) {
        guard let id = entriesPlaylistID else { return }
        EditOrigin.start(context?.editOrigin) { await app.editing?.move(Set(context?.ids ?? []), playlistID: id, down: down) }
    }
}
#endif
