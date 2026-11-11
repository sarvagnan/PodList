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
        Button(allStarred ? "Unstar" : "Star") { Task { await editing.setStar(ids, starred: !allStarred) } }
        Button(allPlayed ? "Mark Unplayed" : "Mark Played") { Task { await editing.markPlayed(ids, played: !allPlayed) } }
    }
    private var activeName: String { library.state.playlists.first { $0.id == library.state.activePlaylistId }?.name ?? "Active Playlist" }
    private var allStarred: Bool { !ids.isEmpty && ids.allSatisfy { library.state.episodeStates[$0]?.starred == true } }
    private var allPlayed: Bool { !ids.isEmpty && ids.allSatisfy { library.state.episodeStates[$0]?.played != nil } }
}

struct EpisodeActionButtons: SwiftUI.View {
    let ids: [String]
    let library: LibraryModel
    let editing: PlaylistEditingModel
    let presentation: PlaylistPresentation
    var body: some SwiftUI.View {
        HStack {
            Button("Play Now", systemImage: "play.fill") { Task { await editing.add(ids, placement: .now) } }
            Button("Add", systemImage: "plus") { presentation.sheet = .add(ids, false) }
                .accessibilityLabel("Add selected Episodes to a Playlist")
            let starred = ids.allSatisfy { library.state.episodeStates[$0]?.starred == true }
            Button(starred ? "Unstar" : "Star", systemImage: starred ? "star.fill" : "star") { Task { await editing.setStar(ids, starred: !starred) } }
                .labelStyle(.iconOnly).help(starred ? "Unstar selected Episodes" : "Star selected Episodes")
            let played = ids.allSatisfy { library.state.episodeStates[$0]?.played != nil }
            Button(played ? "Mark Unplayed" : "Mark Played", systemImage: played ? "arrow.counterclockwise" : "checkmark") { Task { await editing.markPlayed(ids, played: !played) } }
                .labelStyle(.iconOnly).help(played ? "Mark selected Episodes Unplayed" : "Mark selected Episodes Played")
            Menu("Episode Actions", systemImage: "ellipsis.circle") {
                EpisodeActionItems(ids: ids, library: library, editing: editing, presentation: presentation)
            }.menuStyle(.borderlessButton).fixedSize()
        }.disabled(ids.isEmpty || editing.busy)
    }
}

struct EditingFeedback: SwiftUI.View {
    let editing: PlaylistEditingModel
    var body: some SwiftUI.View {
        if let text = editing.error ?? editing.status {
            HStack {
                Text(text).foregroundStyle(editing.error == nil ? Color.secondary : Color.red).textSelection(.enabled)
                Spacer()
                if editing.history.undo != nil {
                    Button(editing.undoTitle) { Task { await editing.reverse() } }.disabled(editing.busy)
                }
            }.font(.caption).padding(.horizontal, 14).padding(.vertical, 6)
                .accessibilityElement(children: .contain).accessibilityLabel("Edit status")
        }
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
            if let context, let editing = app.editing {
                EpisodeActionItems(ids: context.ids, library: context.library, editing: editing, presentation: context.presentation)
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
