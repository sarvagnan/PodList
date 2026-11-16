#if os(macOS)
import SwiftUI
import AppKit
import PodListDomain

struct PlaylistContentView: SwiftUI.View {
    let playlist: Playlist
    let library: LibraryModel
    @Bindable var window: WindowModel
    let app: ApplicationModel
    let editing: PlaylistEditingModel
    @Bindable var presentation: PlaylistPresentation
    let openEpisode: () -> Void
    @Environment(\.macTextScale) private var textScale
    @State private var optionCopy = false
    @State private var rewindTarget: TimelineEvent?

    var body: some SwiftUI.View {
        VStack(spacing: 0) {
            GeometryReader { geometry in
                Group {
                    switch presentation.playlistTab {
                    case .entries: entries
                    case .history: history
                    case .timeline: timeline
                    }
                }
                .frame(width: geometry.size.width, height: geometry.size.height)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .toolbar {
            ToolbarItem(placement: .principal) {
                PlaylistToolbar(selection: $presentation.playlistTab)
            }
        }
        .focusedSceneValue(\.podListPlaylist, PlaylistCommandContext(playlist: playlist, presentation: presentation))
        .focusedSceneValue(\.podListRewind, rewindAction)
        .sheet(item: $rewindTarget) { event in
            RewindSheet(playlistID: playlist.id, target: event.moment, library: library, editing: editing) {
                rewindTarget = nil; presentation.playlistTab = .entries
            }
        }
        .onChange(of: playlist.id) { _, _ in presentation.playlistTab = .entries; rewindTarget = nil; window.timelineSelection = nil }
        .onChange(of: presentation.playlistTab) { _, tab in
            // Undo can switch from History to Entries with an explicit reveal.
            if tab != .entries || window.historyRevealPlaylistID != playlist.id {
                window.selection = []; window.scrollAnchor = nil
            }
            window.historyRevealPlaylistID = nil; window.timelineSelection = nil
            if tab == .entries { window.revealDrop(in: playlist.id) }
        }
    }
    private var rows: [EpisodeRow] { window.rows(in: library) }
    private var displayedRows: [PlaylistDropRow] {
        PlaylistDropRow.rows(rows, batches: app.libraryEditing?.pendingEpisodeDrops ?? [], playlistID: playlist.id)
    }
    private var entrySelection: Binding<Set<String>> {
        Binding(get: { window.selection }, set: { window.selection = $0.intersection(Set(rows.map(\.id) + failedDropIDs)) })
    }
    private var entries: some SwiftUI.View {
        VStack(spacing: 0) {
            Group {
                if textScale > 1 {
                    List(selection: entrySelection) {
                        ForEach(displayedRows) { item in
                            if let row = item.entry {
                                MacReadingRow(isSelected: window.selection.contains(row.id)) { entryTitle(row) } metadata: {
                                    "Position \(Presentation.time(row.position ?? 0)) · Length \(row.durationText) · \(row.stateText)"
                                }
                                .tag(item.id).draggable(dragPayload(row.id))
                            } else if let slot = item.placeholder {
                                placeholder(slot).tag(item.id).selectionDisabled(slot.failure == nil)
                            }
                        }
                        .dropDestination(for: EpisodeTransfer.self) { values, index in
                            _ = drop(values, at: index)
                        }
                    }
                } else {
                    Table(of: PlaylistDropRow.self, selection: entrySelection) {
                        TableColumn("Entry") { (item: PlaylistDropRow) in
                            if let row = item.entry { entryTitle(row) }
                            else if let slot = item.placeholder { placeholder(slot) }
                        }
                        TableColumn("Position") { item in Text(item.entry.map { Presentation.time($0.position ?? 0) } ?? "—").monospacedDigit() }.width(min: 70, ideal: 90, max: 110)
                        TableColumn("Length") { item in Text(item.entry?.durationText ?? "—").monospacedDigit() }.width(min: 60, ideal: 70, max: 100)
                        TableColumn("State") { item in
                            Text(item.entry?.stateText ?? "").fixedSize(horizontal: false, vertical: true)
                        }.width(min: 140, ideal: 150, max: 200)
                    } rows: {
                        ForEach(displayedRows) { item in
                            if let row = item.entry { TableRow(item).draggable(dragPayload(row.id)) }
                            else { TableRow(item) }
                        }
                            .dropDestination(for: EpisodeTransfer.self) { index, values in
                                _ = drop(values, at: index)
                            }
                    }
                    .tableStyle(.inset)
                }
            }
            .overlay {
                if displayedRows.isEmpty {
                    VStack(spacing: 8) {
                        Text("This Playlist has no Entries.").foregroundStyle(MacReadableSecondaryStyle())
                        Button("Find Episodes") { window.navigate(to: .search) }
                    }
                }
            }
            .onAppear { window.revealDrop(in: playlist.id) }
            .onChange(of: failedDropIDs) { previous, current in
                window.selection.subtract(Set(previous).subtracting(current))
            }
            .typeSelectingRows(rows.map { TypeSelectionRow(id: $0.id, title: $0.title) }, physicalIDs: displayedRows.map { $0.entry?.id }, selection: $window.selection, anchor: $window.scrollAnchor)
            .dragConfiguration(DragConfiguration(allowMove: true))
            .onDragSessionUpdated { session in
                switch session.phase {
                case .initial, .active: PlaylistDragSession.sourceID = playlist.id
                case .ended, .dataTransferCompleted: PlaylistDragSession.sourceID = nil
                @unknown default: break
                }
            }
            .onDropSessionUpdated { session in
                // Keep the last drag modifier through asynchronous payload decoding.
                if session.phase == .entering || session.phase == .active {
                    optionCopy = NSEvent.modifierFlags.contains(.option)
                }
            }
            .modifier(PlaylistEpisodeDropTarget(destination: .playlist(playlist.id), editor: app.libraryEditing, window: window, allowsReorder: true))
            .alternatingRowBackgrounds(.disabled)
            .contextMenu(forSelectionType: String.self) { selection in
                entryActions(ordered(selection))
            } primaryAction: { selection in
                window.selection = selection; openEpisode()
            }
            .onCopyCommand(perform: window.selection.isEmpty ? nil : {
                EpisodeCopyContent.providers(ids: ordered(window.selection), library: library)
            })
            .onDeleteCommand(perform: removeSelection)
            .focusedSceneValue(\.podListRemovePlaylistSelection, removeSelection)
            .accessibilityLabel("Playlist Entries in order; drag to reorder or use Move Up and Move Down in the Episode menu")

        }
    }
    private var failedDropIDs: [String] {
        app.libraryEditing.map { EpisodeDrop.failedIDs(editor: $0, playlistID: playlist.id) } ?? []
    }
    private var removeSelection: (() -> Void)? {
        let entries = ordered(window.selection)
        let failures = failedDropIDs.filter { window.selection.contains($0) }
        guard !editing.busy, app.libraryEditing?.busy != true, app.libraryEditing?.episodeDrop == nil,
              !entries.isEmpty || !failures.isEmpty else { return nil }
        return {
            if let editor = app.libraryEditing {
                for id in failures { EpisodeDrop.remove(id, editor: editor) }
            }
            window.selection.subtract(failures)
            if !entries.isEmpty { Task { await editing.remove(entries, playlistID: playlist.id) } }
        }
    }
    private func placeholder(_ slot: EpisodeDropSlot) -> some SwiftUI.View {
        HStack(spacing: 8) {
            if slot.failure == nil { ProgressView().controlSize(.small).accessibilityHidden(true) }
            Text(slot.accessibleName).lineLimit(textScale > 1 ? nil : 2)
                .help(Presentation.tooltip(slot.failure ?? slot.accessibleName))
            Spacer(minLength: 4)
            if slot.failure != nil, let editor = app.libraryEditing {
                Button("Retry") { Task { await EpisodeDrop.retry(slot.id, editor: editor) } }
                    .accessibilityLabel("Retry adding \(slot.title)")
                    .help("Retry adding this Episode")
                Button("Remove") { EpisodeDrop.remove(slot.id, editor: editor) }
                    .accessibilityLabel("Remove failed drop for \(slot.title)")
                    .help("Remove this failed Episode drop")
            }
        }
        .buttonStyle(.borderless).padding(.vertical, 5)
        .disabled(app.libraryEditing?.episodeDrop != nil && slot.failure != nil)
        .accessibilityElement(children: .contain)
    }
    private func entryTitle(_ row: EpisodeRow) -> some SwiftUI.View {
        HStack(spacing: 8) {
            if let ordinal = row.ordinal { Text(ordinal, format: .number).monospacedDigit().foregroundStyle(MacReadableSecondaryStyle(isSelected: window.selection.contains(row.id))) }
            if row.isCursor { Image(systemName: "play.circle.fill").foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Current Entry") }
            VStack(alignment: .leading, spacing: 3) {
                if row.isCursor { Text("Current Entry").macContentFont(.caption).foregroundStyle(MacRowAccentStyle()) }
                Text(row.title).lineLimit(textScale > 1 ? nil : 2).fixedSize(horizontal: false, vertical: true)
                Text(row.podcast).macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle(isSelected: window.selection.contains(row.id)))
            }
            Spacer(minLength: 4)
            Button { Task { await editing.playFromHere(playlistID: playlist.id, episodeID: row.id) } } label: {
                MacIconLabel(title: "Play from Here", systemImage: "play.fill")
            }
                .labelStyle(.iconOnly).buttonStyle(.borderless).foregroundStyle(MacRowActionStyle()).help("Play from Here").accessibilityLabel("Play from here: \(row.title)")
        }.padding(.vertical, 5).macRowActions(isSelected: window.selection.contains(row.id)).accessibilityElement(children: .contain)
    }
    @ViewBuilder private func entryActions(_ ids: [String]) -> some SwiftUI.View {
        if !ids.isEmpty {
            EpisodeActionItems(ids: ids, library: library, editing: editing, presentation: presentation, app: app)
            Divider()
            Button("Play from Here") { Task { await editing.playFromHere(playlistID: playlist.id, episodeID: ids.first) } }
            Button("Move Up") { Task { await editing.move(Set(ids), playlistID: playlist.id, down: false) } }
            Button("Move Down") { Task { await editing.move(Set(ids), playlistID: playlist.id, down: true) } }
            Button("Remove from Playlist") { Task { await editing.remove(ids, playlistID: playlist.id) } }
        }
    }
    private func ordered(_ selection: Set<String>) -> [String] { rows.map(\.id).filter { selection.contains($0) } }
    private func dragPayload(_ id: String) -> EpisodeTransfer {
        EpisodeTransfer.local(id, selection: ordered(window.selection), sourcePlaylistID: playlist.id, library: library)
    }
    private func drop(_ values: [EpisodeTransfer], at index: Int) -> Bool {
        drop(values, before: displayedRows.dropFirst(min(max(0, index), displayedRows.count)).compactMap { $0.entry?.id }.first)
    }
    private func drop(_ values: [EpisodeTransfer], before id: String?) -> Bool {
        guard !editing.busy, app.libraryEditing?.busy != true, app.libraryEditing?.episodeDrop == nil else { return false }
        guard let ids = EpisodeDrop.reorderIDs(values, in: playlist) else {
            guard let editor = app.libraryEditing, EpisodeDrop.references(values) != nil else { return false }
            Task { await EpisodeDrop.add(values, to: playlist.id, before: id, editor: editor) { window.didDrop($0, into: playlist.id, scroll: false) } }
            return true
        }
        let boundary = id.flatMap { id in playlist.entries.firstIndex { $0.episodeId == id } } ?? playlist.entries.count
        // An Episode can occur only once in a Playlist. Option-copying its
        // existing Entry therefore keeps it in place and selects it.
        if optionCopy {
            window.selection = ids
            if let first = rows.first(where: { ids.contains($0.id) }) { window.scrollAnchor = RowAnchor(id: first.id, index: 0) }
        } else {
            Task { await editing.move(ids, playlistID: playlist.id, to: boundary) }
        }
        return true
    }
    private var historyIDs: [String] {
        var seen = Set<String>()
        return playlist.history.reversed().map(\.episodeId).filter { seen.insert($0).inserted }
    }
    private var history: some SwiftUI.View {
        Group {
            if playlist.history.isEmpty {
                ScrollableEmptyState("No History", systemImage: "clock", description: "Entries finished through this Playlist’s playback appear here. Manual Played marks do not create History.")
            } else {
                List(Array(playlist.history.enumerated().reversed()), id: \.offset, selection: $window.selection) { _, item in
                    let row = library.row(item.episodeId)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(row.title).macContentFont(.headline)
                        Text("\(row.podcast) · Finished \(date(item.finishedAt))").foregroundStyle(MacReadableSecondaryStyle(isSelected: window.selection.contains(item.episodeId)))
                    }.tag(item.episodeId)
                        .contextMenu {
                            EpisodeActionItems(ids: window.selection.contains(item.episodeId) ? historyIDs.filter { window.selection.contains($0) } : [item.episodeId], library: library, editing: editing, presentation: presentation, app: app)
                                .disabled(editing.busy)
                        }
                }.typeSelectingRows(playlist.history.reversed().map { TypeSelectionRow(id: $0.episodeId, title: library.row($0.episodeId).title) },
                    selection: $window.selection, anchor: $window.scrollAnchor)
                    .accessibilityLabel("Playlist History")
            }
        }
    }
    private var timeline: some SwiftUI.View {
        let events = TimelinePresentation.events(playlist)
        return Group {
            if events.isEmpty {
                ScrollableEmptyState("No Listening Timeline", systemImage: "clock.arrow.circlepath", description: "Listening and deliberate edits are kept here for 30 days. Play an Entry to begin.")
            } else {
                List(events, selection: $window.timelineSelection) { event in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(library.row(event.episodeID).title).macContentFont(.headline)
                            Text(date(event.at)).foregroundStyle(MacReadableSecondaryStyle(isSelected: window.timelineSelection == event.id))
                            Text(eventLabel(event)).macContentFont(.subheadline).foregroundStyle(MacReadableSecondaryStyle(isSelected: window.timelineSelection == event.id))
                        }
                        Spacer()
                        if TimelineRules.pointAt(playlist, to: event.moment) != nil {
                            Button("Rewind to Here") { rewindTarget = event }.accessibilityLabel("Rewind to \(date(event.moment))")
                        }
                    }.padding(.vertical, 4)
                    .accessibilityElement(children: .contain)
                    .accessibilityActions {
                        if TimelineRules.pointAt(playlist, to: event.moment) != nil {
                            Button("Rewind to Here") { rewindTarget = event }
                        }
                    }
                    .contextMenu {
                        if TimelineRules.pointAt(playlist, to: event.moment) != nil {
                            Button("Rewind to Here") { rewindTarget = event }
                        }
                    }
                    .tag(event.id)
                }.typeSelectingRows(events.map { TypeSelectionRow(id: $0.id, title: library.row($0.episodeID).title) },
                    selection: $window.timelineSelection, anchor: $window.scrollAnchor)
                    .accessibilityLabel("Listening Timeline")
            }
        }
    }
    private var rewindAction: (() -> Void)? {
        guard presentation.playlistTab == .timeline, !editing.busy,
              let event = TimelinePresentation.events(playlist).first(where: { $0.id == window.timelineSelection }),
              TimelineRules.pointAt(playlist, to: event.moment) != nil else { return nil }
        return { rewindTarget = event }
    }
    private func eventLabel(_ event: TimelineEvent) -> String {
        switch event.kind {
        case "listened":
            let from = Presentation.time(event.from), to = Presentation.time(event.to)
            return "Listened at \(from == to ? from : "\(from)–\(to)")\(event.end != event.at ? " · Until \(date(event.end))" : "")"
        case "finished": return "Finished"
        case "added": return "Added to Playlist"
        case "removed": return "Removed from Playlist"
        case "moved": return "Moved in Playlist"
        default: return "Marked Played"
        }
    }
    private func date(_ at: Int64) -> String { Date(timeIntervalSince1970: Double(at) / 1000).formatted(date: .abbreviated, time: .shortened) }
}

/// A single, intrinsically sized centre item, independent of the current section.
struct PlaylistToolbar: SwiftUI.View {
    @Binding var selection: PlaylistTab

    var body: some SwiftUI.View {
        PlaylistSectionPicker(selection: $selection).fixedSize()
    }
}

/// AppKit's fitted distribution keeps the long Timeline title readable without
/// assigning that same width to Entries and History, leaving room for Search.
private struct PlaylistSectionPicker: NSViewRepresentable {
    @Binding var selection: PlaylistTab
    func makeCoordinator() -> Coordinator { Coordinator(selection: $selection) }
    func makeNSView(context: Context) -> NSSegmentedControl {
        let control = NSSegmentedControl(labels: PlaylistTab.allCases.map(\.rawValue), trackingMode: .selectOne,
            target: context.coordinator, action: #selector(Coordinator.changed(_:)))
        control.segmentDistribution = .fit
        control.setAccessibilityLabel("Playlist section")
        control.setAccessibilityIdentifier("playlist.section")
        return control
    }
    func updateNSView(_ control: NSSegmentedControl, context: Context) {
        context.coordinator.selection = $selection
        control.selectedSegment = PlaylistTab.allCases.firstIndex(of: selection) ?? 0
    }
    final class Coordinator: NSObject {
        var selection: Binding<PlaylistTab>
        init(selection: Binding<PlaylistTab>) { self.selection = selection }
        @objc func changed(_ control: NSSegmentedControl) {
            guard PlaylistTab.allCases.indices.contains(control.selectedSegment) else { return }
            selection.wrappedValue = PlaylistTab.allCases[control.selectedSegment]
        }
    }
}

struct RewindSheet: SwiftUI.View {
    let playlistID: String
    let target: Int64
    let library: LibraryModel
    let editing: PlaylistEditingModel
    let done: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var problem: String?
    var body: some SwiftUI.View {
        PodListSheet(title: "Rewind Playlist", width: 520, actionTitle: "Rewind",
                     actionEnabled: !editing.busy && previewAvailable, cancel: { dismiss() }, action: rewind) {
            Text(Date(timeIntervalSince1970: Double(target) / 1000), format: .dateTime.day().month().hour().minute())
            if let preview = TimelinePresentation.preview(library.state, playlistID: playlistID, to: target, at: Int64(Date().timeIntervalSince1970 * 1000)) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Goes back to").macContentFont(.headline)
                    Text("\(preview.cursor.map { library.row($0).title } ?? "No Current Entry") · \(Presentation.time(preview.position))")
                    Text("Unplayed again").macContentFont(.headline)
                    Text(titles(preview.unplayed))
                    Text("Back in the Playlist").macContentFont(.headline)
                    Text(titles(preview.restored))
                    Text("Kept").macContentFont(.headline)
                    Text("Later adds, reorders and manual Played marks stay. Positions gained since this moment are reset. The permanent Listening log is kept. Rewind can be undone.")
                }.frame(maxWidth: .infinity, alignment: .leading)
            } else { Text("This moment is no longer available.") }
        } status: {
            if let problem { FailureFeedback(message: problem, announcements: editing.announcements, retryTitle: "Retry Rewinding Playlist", retry: rewind) }
        }.interactiveDismissDisabled(editing.busy)
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .cancel: { dismiss() },
            .rewind: !editing.busy && TimelinePresentation.preview(library.state, playlistID: playlistID, to: target, at: Int64(Date().timeIntervalSince1970 * 1000)) != nil ? { rewind() } : nil
        ].compactMapValues { $0 }))
    }
    private var previewAvailable: Bool { TimelinePresentation.preview(library.state, playlistID: playlistID, to: target, at: Int64(Date().timeIntervalSince1970 * 1000)) != nil }
    private func rewind() {
        guard !editing.busy, previewAvailable else { return }
        Task {
            if await editing.rewind(playlistID, to: target) { done() }
            else { problem = editing.error ?? "Could not rewind. Try again." }
        }
    }
    private func titles(_ ids: [String]) -> String { ids.isEmpty ? "None" : ids.map { library.row($0).title }.joined(separator: "\n") }
}
#endif
