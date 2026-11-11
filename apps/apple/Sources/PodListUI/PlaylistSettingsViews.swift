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
        VStack(alignment: .leading, spacing: 16) {
            Text("New Playlist").font(.title2).accessibilityAddTraits(.isHeader)
            TextField("Playlist name", text: name).disabled(editing.busy).focused($focused).onSubmit { submit() }
            if let problem { Text(problem).foregroundStyle(.secondary).font(.caption) }
            EditingFeedback(editing: editing)
            HStack {
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction).disabled(editing.busy)
                Spacer()
                Button("Create Playlist") { submit() }.keyboardShortcut(.defaultAction).disabled(problem != nil || editing.busy)
            }
        }.padding(24).frame(width: 420).interactiveDismissDisabled(editing.busy).task { focused = true }
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
        VStack(alignment: .leading, spacing: 16) {
            Text("Add \(ids.count == 1 ? "Episode" : "\(ids.count) Episodes") to a Playlist").font(.title2).accessibilityAddTraits(.isHeader)
            Picker("Playlist", selection: Binding(get: { target }, set: { target = $0; editing.drafts[prefix + "/target"] = $0; editing.drafts[prefix + "/open"] = "true" })) {
                ForEach(playlists, id: \.id) { playlist in
                    Text(playlist.name + (playlist.id == app.library?.state.activePlaylistId ? " (Active)" : "")).tag(playlist.id)
                }
                Divider()
                Text("New Playlist…").tag("new")
            }
            if target == "new" {
                TextField("Playlist name", text: name).disabled(editing.busy).onSubmit { submit(.next) }
                if let problem { Text(problem).font(.caption).foregroundStyle(.secondary) }
            }
            EditingFeedback(editing: editing)
            HStack {
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction).disabled(editing.busy)
                Spacer()
                Button("Play Now") { submit(.now) }.disabled(problem != nil || editing.busy)
                Button("Play Next") { submit(.next) }.disabled(problem != nil || editing.busy).keyboardShortcut(.defaultAction)
                Button("Play Last") { submit(.last) }.disabled(problem != nil || editing.busy)
            }
        }.padding(24).frame(width: 540).interactiveDismissDisabled(editing.busy)
            .onAppear {
                target = editing.drafts.addTarget(prefix: prefix, active: app.library?.state.activePlaylistId ?? "", playlists: playlists, preferNew: preferNew)
            }
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
        VStack(alignment: .leading, spacing: 20) {
            Text("Playlist Settings").font(.title2).accessibilityAddTraits(.isHeader)
            if let playlist {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Name").foregroundStyle(.secondary)
                    if renaming && !playlist.isDefault {
                        TextField("Playlist name", text: name).disabled(editing.busy).focused($focused).onSubmit { save() }
                        if let problem { Text(problem).font(.caption).foregroundStyle(.secondary) }
                        HStack {
                            Button("Cancel Rename") { editing.drafts.remove("rename/\(id)"); editing.drafts.remove("rename-open/\(id)") }
                            Button("Save") { save() }.disabled(problem != nil || name.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines) == playlist.name || editing.busy)
                        }
                    } else {
                        Text(playlist.name).font(.headline).fixedSize(horizontal: false, vertical: true).textSelection(.enabled)
                        if !playlist.isDefault {
                            Button("Rename") { editing.drafts["rename/\(id)"] = playlist.name; editing.drafts["rename-open/\(id)"] = "true"; focused = true }
                        } else { Text("The Default Playlist cannot be renamed or deleted.").font(.caption).foregroundStyle(.secondary) }
                    }
                }
                Toggle("Clear on Played", isOn: Binding(get: { self.playlist?.clearOnPlayed ?? false }, set: { value in
                    Task { await editing.edit([.setClearOnPlayed(playlistId: id, clearOnPlayed: value)], name: "Clear on Played") }
                })).disabled(editing.busy)
                Text("Entries leave this Playlist when their Episode becomes Played. Enabling this keeps Entries that are already Played.").font(.caption).foregroundStyle(.secondary)
                if !playlist.isDefault {
                    Button("Delete Playlist", role: .destructive) { Task { if await editing.delete(playlist) { done() } } }.disabled(editing.busy)
                    Text("Deleted Playlists can be restored from Trash for \(app.library?.state.trashDays ?? 30) days.").font(.caption).foregroundStyle(.secondary)
                }
            } else { Text("Playlist unavailable.") }
            EditingFeedback(editing: editing)
            HStack { Spacer(); Button("Done", action: done).keyboardShortcut(.cancelAction) }
        }.padding(24).frame(width: 450).interactiveDismissDisabled(editing.busy)
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
    var body: some SwiftUI.View {
        VStack(alignment: .leading) {
            Text("Deleted Playlists are kept for \(library.state.trashDays ?? 30) days, together with their History and Listening Timeline.")
                .font(.subheadline).foregroundStyle(.secondary).padding(12)
            if library.trash.isEmpty {
                ContentUnavailableView("Trash is empty", systemImage: "trash", description: Text("Deleted Playlists can be restored here."))
            } else {
                List(library.trash.filter { search.isEmpty || $0.playlist.name.localizedStandardContains(search) }, id: \.playlist.id) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.playlist.name).font(.headline)
                            Text("\(item.playlist.entries.count) Entries · Deleted \(Date(timeIntervalSince1970: Double(item.deletedAt) / 1000).formatted(date: .abbreviated, time: .omitted))").foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Restore") { Task { await editing.restore(item.playlist.id) } }
                            .accessibilityLabel("Restore Playlist \(item.playlist.name)").disabled(editing.busy)
                    }.padding(.vertical, 4)
                }
            }
        }
    }
}
#endif
