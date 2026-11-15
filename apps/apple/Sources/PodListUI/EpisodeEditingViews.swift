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
    let library: LibraryModel
    let editing: PlaylistEditingModel
    let presentation: PlaylistPresentation
    let app: ApplicationModel
    var body: some SwiftUI.View {
        Button("Play Now") { Task { await editing.add(ids, placement: .now) } }
        Button("Play Next in \(activeName)") { Task { await editing.add(ids, placement: .next) } }
        Button("Play Last in \(activeName)") { Task { await editing.add(ids, placement: .last) } }
        Menu("Play in Another Playlist") {
            ForEach(library.state.playlists, id: \.id) { playlist in
                Menu(playlist.name) {
                    Button("Play Now") { Task { await editing.add(ids, to: playlist.id, placement: .now) } }
                    Button("Play Next") { Task { await editing.add(ids, to: playlist.id, placement: .next) } }
                    Button("Play Last") { Task { await editing.add(ids, to: playlist.id, placement: .last) } }
                }
            }
            Divider()
            Button("New Playlist…") { presentation.sheet = .add(ids, true) }
        }
        Button("Add to a Playlist…") { presentation.sheet = .add(ids, false) }
        Divider()
        Button("Download") { app.download(ids) }
        if ids.count == 1, let id = ids.first, let url = library.episodeShareURL(id) {
            ShareLink(item: url) { Text("Share Episode…") }
            Button("Copy Link") { ShareLinks.copy(url) }
        }
        Button(actionLabels.star) { Task { await editing.setStar(ids, starred: !allStarred) } }
        Button(actionLabels.played) { Task { await editing.markPlayed(ids, played: !allPlayed) } }
    }
    private var actionLabels: EpisodeActionLabels { .init(allStarred: allStarred, allPlayed: allPlayed) }
    private var activeName: String { library.state.playlists.first { $0.id == library.state.activePlaylistId }?.name ?? "Active Playlist" }
    private var allStarred: Bool { !ids.isEmpty && ids.allSatisfy { library.state.episodeStates[$0]?.starred == true } }
    private var allPlayed: Bool { !ids.isEmpty && ids.allSatisfy { library.state.episodeStates[$0]?.played != nil } }
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
            Button("Play Now", systemImage: "play.fill") { Task { await editing.add(ids, placement: .now) } }
                .accessibilityLabel(labels.play).help("Play selected Episodes now").disabled(disabled)
        }
        ToolbarItem(placement: .primaryAction) {
            Button("Add", systemImage: "plus") { presentation.sheet = .add(ids, false) }
                .accessibilityLabel(labels.add).help("Add selected Episodes to a Playlist").disabled(disabled)
        }
        ToolbarItem(placement: .primaryAction) {
            Button("Download", systemImage: "arrow.down.circle") { app.download(ids) }
                .labelStyle(.iconOnly).accessibilityLabel(labels.download).help("Download selected Episodes").disabled(disabled)
        }
        ToolbarItem(placement: .primaryAction) {
            Button(labels.star, systemImage: labels.allStarred ? "star.fill" : "star") { Task { await editing.setStar(ids, starred: !labels.allStarred) } }
                .labelStyle(.iconOnly).accessibilityLabel(labels.star).help("\(labels.star) selected Episodes").disabled(disabled)
        }
        ToolbarItem(placement: .primaryAction) {
            Button(labels.played, systemImage: labels.allPlayed ? "arrow.counterclockwise" : "checkmark") { Task { await editing.markPlayed(ids, played: !labels.allPlayed) } }
                .labelStyle(.iconOnly).accessibilityLabel(labels.played)
                .help(labels.allPlayed ? "Mark selected Episodes Unplayed" : "Mark selected Episodes Played").disabled(disabled)
        }
        ToolbarItem(placement: .primaryAction) {
            Menu("Episode Actions", systemImage: "ellipsis.circle") {
                EpisodeActionItems(ids: ids, library: library, editing: editing, presentation: presentation, app: app)
            }.menuStyle(.borderlessButton).fixedSize()
                .accessibilityLabel(labels.more).help("More Episode actions").disabled(disabled)
        }
    }
}

struct EditingFeedback: SwiftUI.View {
    let editing: PlaylistEditingModel
    var additionalError: String? = nil
    var notice: String? = nil
    private var error: String? { additionalError ?? editing.error }
    var body: some SwiftUI.View {
        HStack {
            if let text = error ?? editing.status ?? notice {
                Text(text).foregroundStyle(error == nil ? Color.secondary : Color.red)
                    .lineLimit(1).truncationMode(.tail).help(text).textSelection(.enabled)
                if error == nil, let notice, editing.status != nil, notice != editing.status {
                    Text(notice).foregroundStyle(.secondary).truncationMode(.tail).help(notice)
                }
                Spacer(minLength: 8)
                if editing.history.undo != nil {
                    Button(editing.undoTitle) { Task { await editing.reverse() } }.disabled(editing.busy)
                }
                if editing.history.redo != nil {
                    Button(editing.redoTitle) { Task { await editing.reverse(redo: true) } }.disabled(editing.busy)
                }
            } else { Spacer() }
        }.font(.caption).lineLimit(1).padding(.horizontal, 14).frame(height: 32)
            .accessibilityElement(children: .contain).accessibilityLabel("Edit status")
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
    let playSelection: @MainActor () async -> Void
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
    @FocusedValue(\.podListPlaylist) private var playlistContext
    @FocusedValue(\.podListRestore) private var restore
    @FocusedValue(\.podListRewind) private var rewind
    public init(app: ApplicationModel) { self.app = app }
    public var body: some Commands {
        CommandGroup(after: .newItem) {
            Button("New Playlist…") { context?.presentation.sheet = .newPlaylist }
                .keyboardShortcut("n", modifiers: [.command, .shift]).disabled(context == nil || app.editing == nil)
        }
        CommandGroup(replacing: .undoRedo) {
            Button(textEditor == nil ? app.editing?.undoTitle ?? "Undo" : "Undo") {
                if let editor = textEditor { editor.undoManager?.undo() } else { Task { await app.editing?.reverse() } }
            }.keyboardShortcut("z").disabled(textEditor == nil ? app.editing?.history.undo == nil || app.editing?.busy == true : textEditor?.undoManager?.canUndo != true)
            Button(textEditor == nil ? app.editing?.redoTitle ?? "Redo" : "Redo") {
                if let editor = textEditor { editor.undoManager?.redo() } else { Task { await app.editing?.reverse(redo: true) } }
            }.keyboardShortcut("z", modifiers: [.command, .shift]).disabled(textEditor == nil ? app.editing?.history.redo == nil || app.editing?.busy == true : textEditor?.undoManager?.canRedo != true)
        }
        CommandMenu("Episode") {
            Button("Show Episode Details") {
                if let episodeDetails { episodeDetails() } else { context?.showDetails() }
            }.disabled(episodeDetails == nil && context?.ids.isEmpty != false)
            Divider()
            if let context, let editing = app.editing {
                EpisodeActionItems(ids: context.ids, library: context.library, editing: editing, presentation: context.presentation, app: app)
                    .disabled(context.ids.isEmpty || editing.busy)
                if case let .playlist(id) = context.window.destination {
                    Divider()
                    Button("Play from Here") { Task { await editing.playFromHere(playlistID: id, episodeID: context.ids.first) } }.disabled(context.ids.isEmpty || editing.busy)
                    Button("Move Up") { Task { await editing.move(Set(context.ids), playlistID: id, down: false) } }
                        .keyboardShortcut(.upArrow, modifiers: [.command, .option]).disabled(context.ids.isEmpty || editing.busy)
                    Button("Move Down") { Task { await editing.move(Set(context.ids), playlistID: id, down: true) } }
                        .keyboardShortcut(.downArrow, modifiers: [.command, .option]).disabled(context.ids.isEmpty || editing.busy)
                    Button("Remove from Playlist") { Task { await editing.remove(context.ids, playlistID: id) } }
                        .keyboardShortcut(.delete, modifiers: .command).disabled(context.ids.isEmpty || editing.busy)
                }
            } else { Button("Play Now") {}.disabled(true) }
        }
        CommandMenu("Playlist") {
            Picker("Section", selection: Binding(get: { playlistContext?.presentation.playlistTab ?? .entries }, set: { playlistContext?.presentation.playlistTab = $0 })) {
                ForEach(PlaylistTab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }.pickerStyle(.inline).disabled(playlistContext == nil)
            Divider()
            Toggle("Clear on Played", isOn: Binding(get: { playlistContext?.playlist.clearOnPlayed ?? false }, set: { value in
                guard let playlistContext else { return }
                Task { await app.editing?.edit([.setClearOnPlayed(playlistId: playlistContext.playlist.id, clearOnPlayed: value)], name: "Clear on Played") }
            })).disabled(playlistContext == nil || app.editing == nil || app.editing?.busy == true)
            Button("Restore") { restore?() }.disabled(restore == nil)
            Button("Rewind to Here…") { rewind?() }.disabled(rewind == nil)
            Divider()
            if let context, let editing = app.editing {
                Button("Trash") { context.window.navigate(to: .trash) }
                if case let .playlist(id) = context.window.destination,
                   let playlist = context.library.state.playlists.first(where: { $0.id == id }) {
                    Button("Play this Playlist") { Task { await editing.playFromHere(playlistID: id, episodeID: playlist.cursor ?? playlist.entries.first?.episodeId) } }.disabled(editing.busy)
                    Button("Playlist Settings…") { context.presentation.sheet = .settings(id) }
                    Button("Delete Playlist", role: .destructive) { Task { await editing.delete(playlist) } }.disabled(playlist.isDefault || editing.busy)
                }
            }
        }
    }
    private var textEditor: NSTextView? {
        guard let editor = NSApp.keyWindow?.firstResponder as? NSTextView, editor.isEditable else { return nil }
        return editor
    }
}
#endif
