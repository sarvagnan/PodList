#if os(macOS)
import SwiftUI
import PodListDomain

struct NewPlaylistSheet: SwiftUI.View {
    let app: ApplicationModel
    let editing: PlaylistEditingModel
    let created: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focused: Bool
    private var name: Binding<String> { Binding(get: { editing.drafts["new/name"] }, set: { editing.drafts["new/name"] = $0 }) }
    var body: some SwiftUI.View {
        ContentSizedPanel(width: 420) {
            VStack(alignment: .leading, spacing: 16) {
                Text("New Playlist").macContentFont(.title2).bold().accessibilityAddTraits(.isHeader)
                LabeledContent("Name") {
                    TextField("Playlist name", text: name).disabled(editing.busy).focused($focused).onSubmit { submit() }
                }
                if let problem { Text(problem).foregroundStyle(.red).macContentFont(.caption) }
                EditingFeedback(editing: editing)
                HStack {
                    Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction).disabled(editing.busy)
                    Spacer()
                    Button("Create Playlist") { submit() }.keyboardShortcut(.defaultAction).disabled(problem != nil || editing.busy)
                }
            }.padding(24)
        }.interactiveDismissDisabled(editing.busy).task { focused = true }
    }
    private var problem: String? { PlaylistNames.problem(name.wrappedValue, playlists: app.library?.state.playlists ?? []) }
    private func submit() {
        guard problem == nil, !editing.busy else { return }
        Task { if let id = await editing.create(name: name.wrappedValue) { editing.drafts.remove("new/name"); created(id) } }
    }
}

struct AddPlaylistSheet: SwiftUI.View {
    let ids: [String]
    let preferNew: Bool
    let app: ApplicationModel
    let editing: PlaylistEditingModel
    var inline = false
    var cancelled: (() -> Void)? = nil
    let done: () -> Void
    @State private var target = ""
    @Environment(\.dismiss) private var dismiss
    private var prefix: String { "add/" + ((try? JSONEncoder().encode(ids))?.base64EncodedString() ?? "") }
    private var name: Binding<String> { Binding(get: { editing.drafts[prefix + "/name"] }, set: { editing.drafts[prefix + "/name"] = $0; editing.drafts[prefix + "/open"] = "true" }) }
    private var playlists: [Playlist] { app.library?.state.playlists ?? [] }
    private var problem: String? {
        target == "new" ? PlaylistNames.problem(name.wrappedValue, playlists: playlists) : playlists.contains(where: { $0.id == target }) ? nil : "Choose a Playlist."
    }
    var body: some SwiftUI.View {
        Group {
            if inline { fields }
            else { ContentSizedPanel(width: 540) { fields } }
        }
        .interactiveDismissDisabled(editing.busy)
        .onAppear {
            target = editing.drafts.addTarget(prefix: prefix, active: app.library?.state.activePlaylistId ?? "", playlists: playlists, preferNew: preferNew)
        }
    }
    private var fields: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Add \(CountText.format(ids.count, .episode)) to a Playlist").macContentFont(.title2).bold().accessibilityAddTraits(.isHeader)
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
                if let problem { Text(problem).macContentFont(.caption).foregroundStyle(.red) }
            }
            EditingFeedback(editing: editing)
            HStack {
                Button("Cancel") { if let cancelled { cancelled() } else { dismiss() } }.keyboardShortcut(.cancelAction).disabled(editing.busy)
                Spacer()
                Button("Play Now") { submit(.now) }.disabled(problem != nil || editing.busy)
                Button("Play Next") { submit(.next) }.disabled(problem != nil || editing.busy).keyboardShortcut(.defaultAction)
                Button("Play Last") { submit(.last) }.disabled(problem != nil || editing.busy)
            }
        }.padding(24)
    }
    private func submit(_ placement: Placement) {
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
    private var playlist: Playlist? { app.library?.state.playlists.first { $0.id == id } }
    private var renaming: Bool { editing.drafts["rename-open/\(id)"] == "true" }
    private var name: Binding<String> { Binding(get: { editing.drafts["rename/\(id)"] }, set: { editing.drafts["rename/\(id)"] = $0 }) }
    var body: some SwiftUI.View {
        ContentSizedPanel(width: 450) {
            VStack(alignment: .leading, spacing: 20) {
                Text("Playlist Settings").macContentFont(.title2).bold().accessibilityAddTraits(.isHeader)
                if let playlist {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Name").foregroundStyle(.secondary)
                        if renaming && !playlist.isDefault {
                            TextField("Playlist name", text: name).disabled(editing.busy).focused($focused).onSubmit { save() }
                            if let problem { Text(problem).macContentFont(.caption).foregroundStyle(.red) }
                            HStack {
                                Button("Cancel Rename") { editing.drafts.remove("rename/\(id)"); editing.drafts.remove("rename-open/\(id)") }
                                Button("Save") { save() }.disabled(problem != nil || name.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines) == playlist.name || editing.busy)
                            }
                        } else {
                            Text(playlist.name).macContentFont(.headline).fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
                            if !playlist.isDefault {
                                Button("Rename…") { if PlaylistRenameAction.prepare(playlist, editing: editing) { focused = true } }
                            } else { Text("The Default Playlist cannot be renamed or deleted.").macContentFont(.caption).foregroundStyle(.secondary) }
                        }
                    }
                    Toggle("Clear on Played", isOn: Binding(get: { self.playlist?.clearOnPlayed ?? false }, set: { value in
                        Task { await editing.edit([.setClearOnPlayed(playlistId: id, clearOnPlayed: value)], name: "Clear on Played") }
                    })).disabled(editing.busy)
                    Text("When Clear on Played is on, Entries leave this Playlist when their Episode next becomes Played. Turning it on does not remove Entries whose Episodes are already Played.").macContentFont(.caption).foregroundStyle(.secondary)
                    if !playlist.isDefault {
                        Button("Delete Playlist", role: .destructive) { Task { if await editing.delete(playlist) { done() } } }.disabled(editing.busy)
                        Text("Deleted Playlists can be restored from Trash for \(CountText.format(app.library?.state.trashDays ?? 30, .day)).").macContentFont(.caption).foregroundStyle(.secondary)
                    }
                } else { Text("Playlist unavailable.") }
                EditingFeedback(editing: editing)
                HStack { Spacer(); Button("Done", action: done).keyboardShortcut(.cancelAction) }
            }.padding(24)
        }.interactiveDismissDisabled(editing.busy)
            .onAppear { focused = renaming }
    }
    private var problem: String? { PlaylistNames.problem(name.wrappedValue, playlists: app.library?.state.playlists ?? [], excluding: id) }
    private func save() {
        guard renaming, problem == nil, name.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines) != playlist?.name, !editing.busy else { return }
        Task { _ = await editing.rename(id, name: name.wrappedValue) }
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
                .macContentFont(.subheadline).foregroundStyle(.secondary).padding(12)
            if library.trash.isEmpty {
                ScrollableEmptyState("Trash Is Empty", systemImage: "trash", description: "Deleted Playlists can be restored here.")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(library.trash.filter { search.isEmpty || $0.playlist.name.localizedStandardContains(search) }, id: \.playlist.id, selection: $selection) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.playlist.name).macContentFont(.headline)
                            Text("\(CountText.format(item.playlist.entries.count, .entry)) · Deleted \(Date(timeIntervalSince1970: Double(item.deletedAt) / 1000).formatted(date: .abbreviated, time: .omitted))").foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Restore") { Task { await editing.restore(item.playlist.id) } }
                            .accessibilityLabel("Restore Playlist \(item.playlist.name)").disabled(editing.busy)
                    }.padding(.vertical, 4).tag(item.playlist.id)
                    .contextMenu {
                        Button("Restore") { Task { await editing.restore(item.playlist.id) } }.disabled(editing.busy)
                        Button("Delete Permanently…", role: .destructive) { deleting = item.playlist }.disabled(editing.busy)
                    }
                }
                .restoringRows(library.trash.filter { search.isEmpty || $0.playlist.name.localizedStandardContains(search) }.map { Optional($0.playlist.id) }, anchor: $scrollAnchor)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .focusedSceneValue(\.podListRestore, restoreAction)
        .confirmationDialog("Delete “\(deleting?.name ?? "Playlist")” Permanently?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), titleVisibility: .visible) {
            Button("Delete Permanently", role: .destructive) {
                if let id = deleting?.id { Task { await editing.deletePermanently(id) } }
                deleting = nil
            }
            Button("Cancel", role: .cancel) { deleting = nil }
        } message: {
            Text("This removes the Playlist, its History and Listening Timeline from Trash. This cannot be undone. Episodes and the permanent Listening log are kept.")
        }
    }
    private var restoreAction: (() -> Void)? {
        guard !editing.busy, let id = selection,
              library.trash.contains(where: { $0.playlist.id == id && (search.isEmpty || $0.playlist.name.localizedStandardContains(search)) }) else { return nil }
        return { Task { await editing.restore(id) } }
    }
}
#endif
