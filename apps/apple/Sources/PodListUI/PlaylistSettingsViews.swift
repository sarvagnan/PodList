#if os(macOS)
import SwiftUI
import PodListDomain

struct NewPlaylistSheet: SwiftUI.View {
    let app: ApplicationModel
    let editing: PlaylistEditingModel
    let created: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focused: Bool
    @State private var nameValidation = FormValidationVisibility()
    private var name: Binding<String> { Binding(get: { editing.drafts["new/name"] }, set: { nameValidation.edited(from: editing.drafts["new/name"], to: $0); editing.drafts["new/name"] = $0 }) }
    var body: some SwiftUI.View {
        PodListSheet(title: "New Playlist", width: 420, actionTitle: "Create Playlist",
                     actionEnabled: problem == nil && !editing.busy, cancelEnabled: !editing.busy,
                     cancel: { dismiss() }, action: submit) {
            Form {
                LabeledContent("Name") {
                    TextField("Playlist name", text: name).disabled(editing.busy).focused($focused).onSubmit { submit() }
                }
                if let problem = nameValidation.message(problem) { Text(problem).foregroundStyle(Color.podListError).macContentFont(.caption) }
            }.formStyle(.columns)
        } status: {
            EditingFeedback(editing: editing, retry: submit)
        }.interactiveDismissDisabled(editing.busy).task { focused = true }
            .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
                .cancel: editing.busy ? nil : { dismiss() },
                .createPlaylist: problem == nil && !editing.busy ? { submit() } : nil
            ].compactMapValues { $0 }))
            .onChange(of: nameValidation.message(problem)) { _, message in editing.announcements.error(message) }
    }
    private var problem: String? { PlaylistNames.problem(name.wrappedValue, playlists: app.library?.state.playlists ?? []) }
    private func submit() {
        nameValidation.submitted()
        guard problem == nil, !editing.busy else { return }
        Task { if let id = await editing.create(name: name.wrappedValue) { editing.drafts.remove("new/name"); created(id) } }
    }
}

struct AddPlaylistSheet: SwiftUI.View {
    let ids: [String]
    let preferNew: Bool
    let app: ApplicationModel
    let editing: PlaylistEditingModel
    var cancelled: (() -> Void)? = nil
    let done: () -> Void
    @State private var target = ""
    @State private var attemptedPlacement: Placement = .next
    @State private var nameValidation = FormValidationVisibility()
    @Environment(\.dismiss) private var dismiss
    private var prefix: String { "add/" + ((try? JSONEncoder().encode(ids))?.base64EncodedString() ?? "") }
    private var name: Binding<String> { Binding(get: { editing.drafts[prefix + "/name"] }, set: { nameValidation.edited(from: editing.drafts[prefix + "/name"], to: $0); editing.drafts[prefix + "/name"] = $0; editing.drafts[prefix + "/open"] = "true" }) }
    private var playlists: [Playlist] { app.library?.state.playlists ?? [] }
    private var problem: String? {
        target == "new" ? PlaylistNames.problem(name.wrappedValue, playlists: playlists) : playlists.contains(where: { $0.id == target }) ? nil : "Choose a Playlist."
    }
    var body: some SwiftUI.View {
        fields
        .interactiveDismissDisabled(editing.busy)
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .cancel: editing.busy ? nil : { if let cancelled { cancelled() } else { dismiss() } },
            .playNow: problem == nil && !editing.busy ? { submit(.now) } : nil,
            .playNext: problem == nil && !editing.busy ? { submit(.next) } : nil,
            .playLast: problem == nil && !editing.busy ? { submit(.last) } : nil
        ].compactMapValues { $0 }))
        .onChange(of: nameValidation.message(problem)) { _, message in editing.announcements.error(message) }
        .onAppear {
            target = editing.drafts.addTarget(prefix: prefix, active: app.library?.state.activePlaylistId ?? "", playlists: playlists, preferNew: preferNew)
        }
    }
    private var fields: some SwiftUI.View {
        PodListSheet(title: "Add \(CountText.format(ids.count, .episode)) to a Playlist", width: 540,
                     actionTitle: "Play Next", actionEnabled: problem == nil && !editing.busy,
                     cancelEnabled: !editing.busy, cancel: { if let cancelled { cancelled() } else { dismiss() } },
                     action: { submit(.next) }) {
            Form {
                Picker("Playlist", selection: Binding(get: { target }, set: { target = $0; editing.drafts[prefix + "/target"] = $0; editing.drafts[prefix + "/open"] = "true" })) {
                    ForEach(playlists, id: \.id) { playlist in
                        Text(playlist.name + (playlist.id == app.library?.state.activePlaylistId ? " (Active)" : "")).tag(playlist.id)
                    }
                    Divider()
                    Text("New Playlist…").tag("new")
                }
                if target == "new" {
                    LabeledContent("Name") {
                        TextField("Playlist name", text: name).disabled(editing.busy).onSubmit { submit(.next) }
                    }
                    if let problem = nameValidation.message(problem) { Text(problem).macContentFont(.caption).foregroundStyle(Color.podListError) }
                }
            }.formStyle(.columns)
        } status: {
            EditingFeedback(editing: editing, retry: { submit(attemptedPlacement) })
        } secondary: {
            Button("Play Now") { submit(.now) }.disabled(problem != nil || editing.busy)
            Button("Play Last") { submit(.last) }.disabled(problem != nil || editing.busy)
        }
    }
    private func submit(_ placement: Placement) {
        attemptedPlacement = placement
        nameValidation.submitted()
        guard problem == nil, !editing.busy else { return }
        Task {
            if await editing.add(ids, to: target == "new" ? nil : target, newName: target == "new" ? name.wrappedValue : nil, placement: placement) != nil {
                editing.drafts.remove(prefix + "/name"); editing.drafts.remove(prefix + "/target"); editing.drafts.remove(prefix + "/open"); done()
            }
        }
    }
}

struct PlaylistSettingsSheet: SwiftUI.View {
    let id: String
    let app: ApplicationModel
    let editing: PlaylistEditingModel
    let done: () -> Void
    @FocusState private var focused: Bool
    @State private var draft: PlaylistSettingsDraft?
    @State private var stagedName: String?
    private var playlist: Playlist? { app.library?.state.playlists.first { $0.id == id } }
    private var renaming: Bool { editing.drafts["rename-open/\(id)"] == "true" }
    private var name: Binding<String> { Binding(get: { editing.drafts["rename/\(id)"] }, set: { editing.drafts["rename/\(id)"] = $0 }) }
    private var stagedNameProblem: String? {
        guard let stagedName else { return nil }
        return PlaylistNames.problem(stagedName, playlists: app.library?.state.playlists ?? [], excluding: id)
    }
    private var canSave: Bool { playlist != nil && draft != nil && stagedNameProblem == nil && !editing.busy && !renaming }
    var body: some SwiftUI.View {
        PodListSheet(title: "Playlist Settings", width: 500, actionTitle: "Save",
                     actionEnabled: canSave, defaultShortcut: !renaming, cancelEnabled: !editing.busy,
                     cancel: cancel, action: apply) {
            settingsFields
        } status: {
            EditingFeedback(editing: editing, additionalError: stagedNameProblem, retry: renaming ? { saveRename() } : { apply() })
        } secondary: {
            if playlist?.isDefault == false {
                Button("Delete Playlist", role: .destructive, action: deletePlaylist).disabled(editing.busy)
            }
        }
        .interactiveDismissDisabled(editing.busy)
        .onExitCommand { if !editing.busy { cancel() } }
        .onAppear { if draft == nil, let playlist { draft = PlaylistSettingsDraft(playlist) } }
        .focusedSceneValue(\.podListPanelActions, panelActions)
        .focusedSceneValue(\.podListPlaylistSettingsActions, PlaylistSettingsCommandContext(
            rename: !renaming && playlist?.isDefault == false && !editing.busy ? { renamePlaylist() } : nil,
            delete: playlist?.isDefault == false && !editing.busy ? { deletePlaylist() } : nil))
        .onChange(of: renaming ? problem : nil) { _, message in editing.announcements.error(message) }
    }
    private var panelActions: MenuActionContext {
        var actions: [MenuAction: () -> Void] = [:]
        if !editing.busy {
            actions[.cancel] = cancel
            if renaming {
                actions[.cancelRename] = cancelRename
                if problem == nil { actions[.save] = saveRename }
            } else if canSave { actions[.save] = apply }
        }
        return MenuActionContext(actions: actions)
    }
    @ViewBuilder private var settingsFields: some SwiftUI.View {
        if let playlist {
            Form {
                LabeledContent("Name") {
                    VStack(alignment: .leading, spacing: 10) {
                        if renaming && !playlist.isDefault {
                            TextField("Playlist name", text: name).disabled(editing.busy).focused($focused).onSubmit { saveRename() }
                                .task { focused = true }
                            if let problem { Text(problem).macContentFont(.caption).foregroundStyle(Color.podListError) }
                            HStack {
                                Button("Cancel Rename", action: cancelRename)
                                Button("Save Name", action: saveRename).keyboardShortcut(.defaultAction).disabled(problem != nil || editing.busy)
                            }
                        } else {
                            Text(stagedName ?? playlist.name).macContentFont(.headline).fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
                            if !playlist.isDefault { Button("Rename…", action: renamePlaylist) }
                            else { Text("The Default Playlist cannot be renamed or deleted.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle()) }
                        }
                    }
                }
                Toggle("Clear on Played", isOn: Binding(get: { draft?.clearOnPlayed ?? playlist.clearOnPlayed }, set: { draft?.clearOnPlayed = $0 }))
                Text("When Clear on Played is on, Entries leave this Playlist when their Episode next becomes Played. Turning it on does not remove Entries whose Episodes are already Played.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                Text("Save applies these settings. Cancel discards changes.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                if !playlist.isDefault {
                    Text("Delete Playlist takes effect immediately and closes these settings. Deleted Playlists can be restored from Trash for \(CountText.format(app.library?.state.trashDays ?? 30, .day)).").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                }
            }.formStyle(.columns).disabled(editing.busy)
        } else { Text("Playlist unavailable.") }
    }
    private func renamePlaylist() {
        guard let playlist else { return }
        if PlaylistRenameAction.prepare(playlist, editing: editing) {
            name.wrappedValue = stagedName ?? playlist.name
            focused = true
        }
    }
    private func deletePlaylist() {
        guard let playlist, !editing.busy else { return }
        Task { if await editing.delete(playlist) { cancelRename(); done() } }
    }
    private func cancelRename() { editing.drafts.remove("rename/\(id)"); editing.drafts.remove("rename-open/\(id)") }
    private func cancel() { cancelRename(); done() }
    private var problem: String? { PlaylistNames.problem(name.wrappedValue, playlists: app.library?.state.playlists ?? [], excluding: id) }
    private func saveRename() {
        guard renaming, problem == nil, !editing.busy else { return }
        stagedName = name.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines)
        draft?.name = stagedName ?? ""
        cancelRename()
    }
    private func apply() {
        guard canSave, let draft else { return }
        let changes = draft.changes
        Task {
            let saved = changes.isEmpty ? true : await editing.edit(changes, name: "Playlist Settings")
            if saved { cancelRename(); done() }
        }
    }
}

struct PlaylistTrashView: SwiftUI.View {
    let library: LibraryModel
    let editing: PlaylistEditingModel
    let search: String
    @State private var selection: String?
    @State private var deleting: Playlist?
    @Binding var scrollAnchor: RowAnchor?
    var body: some SwiftUI.View {
        VStack(alignment: .leading) {
            Text("Deleted Playlists are kept for \(CountText.format(library.state.trashDays ?? 30, .day)), together with their History and Listening Timeline.")
                .macContentFont(.subheadline).foregroundStyle(MacReadableSecondaryStyle()).padding(12)
            if library.trash.isEmpty {
                ScrollableEmptyState("Trash Is Empty", systemImage: "trash", description: "Deleted Playlists can be restored here.")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(library.trash.filter { search.isEmpty || $0.playlist.name.localizedStandardContains(search) }, id: \.playlist.id, selection: $selection) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.playlist.name).macContentFont(.headline)
                            Text("\(CountText.format(item.playlist.entries.count, .entry)) · Deleted \(Date(timeIntervalSince1970: Double(item.deletedAt) / 1000).formatted(date: .abbreviated, time: .omitted))").foregroundStyle(MacReadableSecondaryStyle(isSelected: selection == item.playlist.id))
                        }
                        Spacer()
                        Button("Restore") { Task { await editing.restore(item.playlist.id) } }
                            .accessibilityLabel("Restore Playlist \(item.playlist.name)").disabled(editing.busy)
                    }.padding(.vertical, 4).tag(item.playlist.id)
                    .contextMenu {
                        Button("Restore") { Task { await editing.restore(item.playlist.id) } }.disabled(editing.busy)
                        Button("Delete Permanently…", role: .destructive) { confirmDeletion(item.playlist) }.disabled(editing.busy)
                    }
                }
                .restoringRows(library.trash.filter { search.isEmpty || $0.playlist.name.localizedStandardContains(search) }.map { Optional($0.playlist.id) }, anchor: $scrollAnchor)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .focusedSceneValue(\.podListRestore, restoreAction)
        .focusedSceneValue(\.podListDeletePermanently, deletePermanentlyAction)
        .focusedSceneValue(\.podListPanelActions, deleting == nil ? nil : MenuActionContext(actions: [
            .cancel: { deleting = nil }, .deletePermanently: editing.busy ? nil : { deleteConfirmed() }
        ].compactMapValues { $0 }))
        .confirmationDialog("Delete “\(deleting?.name ?? "Playlist")” Permanently?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), titleVisibility: .visible) {
            Button("Delete Permanently", role: .destructive, action: deleteConfirmed)
            Button("Cancel", role: .cancel) { deleting = nil }
        } message: {
            Text("This removes the Playlist, its History and Listening Timeline from Trash. This cannot be undone. Episodes and the permanent Listening log are kept.")
        }
    }
    private func deleteConfirmed() {
        if let id = deleting?.id { Task { await editing.deletePermanently(id) } }
        deleting = nil
    }
    private func confirmDeletion(_ playlist: Playlist) {
        guard !editing.busy else { return }
        deleting = playlist
    }
    private var deletePermanentlyAction: (() -> Void)? {
        guard !editing.busy, deleting == nil, let playlist = selectedPlaylist else { return nil }
        return { confirmDeletion(playlist) }
    }
    private var selectedPlaylist: Playlist? {
        TrashSelectionAction.playlist(in: library, selection: selection, search: search, busy: editing.busy)
    }
    private var restoreAction: (() -> Void)? {
        guard deleting == nil, let id = selectedPlaylist?.id else { return nil }
        return { Task { await editing.restore(id) } }
    }
}
#endif
