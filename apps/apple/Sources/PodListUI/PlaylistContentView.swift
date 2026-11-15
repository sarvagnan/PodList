#if os(macOS)
import SwiftUI
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
    @State private var rewindTarget: TimelineEvent?

    var body: some SwiftUI.View {
        VStack(spacing: 0) {
            HStack {
                Picker("Playlist section", selection: $presentation.playlistTab) { ForEach(PlaylistTab.allCases, id: \.self) { Text($0.rawValue).tag($0) } }
                    .pickerStyle(.segmented).tint(nil).frame(maxWidth: 480)
                Spacer()
                Button("Play This Playlist", systemImage: "play.fill") {
                    Task { await editing.playFromHere(playlistID: playlist.id, episodeID: playlist.cursor ?? playlist.entries.first?.episodeId) }
                }.disabled(editing.busy)
            }.padding(12)
            Group {
                switch presentation.playlistTab {
                case .entries: entries
                case .history: history
                case .timeline: timeline
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .focusedSceneValue(\.podListPlaylist, PlaylistCommandContext(playlist: playlist, presentation: presentation))
        .focusedSceneValue(\.podListRewind, rewindAction)
        .sheet(item: $rewindTarget) { event in
            RewindSheet(playlistID: playlist.id, target: event.moment, library: library, editing: editing) {
                rewindTarget = nil; presentation.playlistTab = .entries
            }
        }
        .onChange(of: playlist.id) { _, _ in presentation.playlistTab = .entries; rewindTarget = nil; window.timelineSelection = nil }
        .onChange(of: presentation.playlistTab) { _, _ in window.selection = []; window.timelineSelection = nil }
    }
    private var rows: [EpisodeRow] { window.rows(in: library) }
    private var entries: some SwiftUI.View {
        VStack(spacing: 0) {
            if PlaylistRules.hasNoCurrentEntry(playlist) {
                HStack {
                    Text(playlist.entries.isEmpty ? "This Playlist has no Entries." : "No current Entry. This Playlist is past its end.").foregroundStyle(.primary)
                    if playlist.entries.isEmpty { Button("Find Episodes") { window.navigate(to: .search) } }
                    Spacer()
                }.padding(12)
            }
            Group {
                if textScale > 1 {
                    List(selection: $window.selection) {
                        ForEach(rows) { row in
                            MacReadingRow { entryTitle(row) } metadata: {
                                "Position \(Presentation.time(row.position ?? 0)) · Length \(row.durationText) · \(row.stateText)"
                            }
                            .tag(row.id).draggable(dragPayload(row.id))
                        }
                        .dropDestination(for: EpisodeTransfer.self) { values, index in
                            _ = drop(values, at: index)
                        }
                    }
                } else {
                    Table(of: EpisodeRow.self, selection: $window.selection) {
                        TableColumn("Entry") { (row: EpisodeRow) in entryTitle(row) }
                        TableColumn("Position") { row in Text(Presentation.time(row.position ?? 0)).monospacedDigit() }.width(min: 70, ideal: 90, max: 110)
                        TableColumn("Length") { row in Text(row.durationText).monospacedDigit() }.width(min: 60, ideal: 70, max: 100)
                        TableColumn("State") { row in Text(row.stateText) }.width(min: 80, ideal: 110, max: 150)
                    } rows: {
                        ForEach(rows) { row in TableRow(row).draggable(dragPayload(row.id)) }
                            .dropDestination(for: EpisodeTransfer.self) { index, values in
                                _ = drop(values, at: index)
                            }
                    }
                    .tableStyle(.inset)
                }
            }
            .alternatingRowBackgrounds(.disabled)
            .contextMenu(forSelectionType: String.self) { selection in
                entryActions(ordered(selection))
            } primaryAction: { selection in
                window.selection = selection; openEpisode()
            }
            .onCopyCommand(perform: window.selection.isEmpty ? nil : {
                EpisodeCopyContent.providers(ids: ordered(window.selection), library: library)
            })
            .onDeleteCommand(perform: window.selection.isEmpty || editing.busy ? nil : {
                let ids = ordered(window.selection)
                Task { await editing.remove(ids, playlistID: playlist.id) }
            })
            .accessibilityLabel("Playlist Entries in order; drag to reorder or use Move Up and Move Down in the Episode menu")

        }
    }
    private func entryTitle(_ row: EpisodeRow) -> some SwiftUI.View {
        HStack(spacing: 8) {
            if let ordinal = row.ordinal { Text(ordinal, format: .number).monospacedDigit().foregroundStyle(.primary) }
            if row.isCursor { Image(systemName: "play.circle.fill").foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Current Entry") }
            VStack(alignment: .leading, spacing: 3) {
                if row.isCursor { Text("Current Entry").macContentFont(.caption).foregroundStyle(MacRowAccentStyle()) }
                Text(row.title).lineLimit(textScale > 1 ? nil : 2).fixedSize(horizontal: false, vertical: true)
                Text(row.podcast).macContentFont(.caption).foregroundStyle(.primary)
            }
            Spacer(minLength: 4)
            Button { Task { await editing.playFromHere(playlistID: playlist.id, episodeID: row.id) } } label: {
                MacIconLabel(title: "Play from Here", systemImage: "play.fill")
            }
                .labelStyle(.iconOnly).buttonStyle(.borderless).foregroundStyle(MacRowAccentStyle()).help("Play from here: \(row.title)").accessibilityLabel("Play from here: \(row.title)")
        }.padding(.vertical, 5).accessibilityElement(children: .contain)
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
        drop(values, before: rows.indices.contains(index) ? rows[index].id : nil)
    }
    private func drop(_ values: [EpisodeTransfer], before id: String?) -> Bool {
        guard !editing.busy, let ids = EpisodeDrop.reorderIDs(values, in: playlist) else { return false }
        let boundary = id.flatMap { id in playlist.entries.firstIndex { $0.episodeId == id } } ?? playlist.entries.count
        Task { await editing.move(ids, playlistID: playlist.id, to: boundary) }
        return true
    }
    private var historyIDs: [String] {
        var seen = Set<String>()
        return playlist.history.reversed().map(\.episodeId).filter { seen.insert($0).inserted }
    }
    private var history: some SwiftUI.View {
        Group {
            if playlist.history.isEmpty {
                ContentUnavailableView("No History", systemImage: "clock", description: Text("Entries finished through this Playlist’s playback appear here. Manual Played marks do not create History."))
            } else {
                List(Array(playlist.history.enumerated().reversed()), id: \.offset, selection: $window.selection) { _, item in
                    let row = library.row(item.episodeId)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(row.title).macContentFont(.headline)
                        Text("\(row.podcast) · Finished \(date(item.finishedAt))").foregroundStyle(.primary)
                    }.tag(item.episodeId)
                        .contextMenu {
                            EpisodeActionItems(ids: window.selection.contains(item.episodeId) ? historyIDs.filter { window.selection.contains($0) } : [item.episodeId], library: library, editing: editing, presentation: presentation, app: app)
                                .disabled(editing.busy)
                        }
                }.accessibilityLabel("Playlist History")
            }
        }
    }
    private var timeline: some SwiftUI.View {
        let events = TimelinePresentation.events(playlist)
        return Group {
            if events.isEmpty {
                ContentUnavailableView("No Listening Timeline", systemImage: "clock.arrow.circlepath", description: Text("Listening and deliberate edits are kept here for 30 days. Play an Entry to begin."))
            } else {
                List(events, selection: $window.timelineSelection) { event in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(library.row(event.episodeID).title).macContentFont(.headline)
                            Text(date(event.at)).foregroundStyle(.primary)
                            Text(eventLabel(event)).macContentFont(.subheadline).foregroundStyle(.primary)
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
                }.accessibilityLabel("Listening Timeline")
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

struct RewindSheet: SwiftUI.View {
    let playlistID: String
    let target: Int64
    let library: LibraryModel
    let editing: PlaylistEditingModel
    let done: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var problem: String?
    var body: some SwiftUI.View {
        ContentSizedPanel(width: 520) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Rewind Playlist").macContentFont(.title2).bold().accessibilityAddTraits(.isHeader)
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
                    if let problem { Text(problem).foregroundStyle(Color.podListError) }
                    HStack {
                        Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                        Spacer()
                        Button("Rewind") {
                            Task {
                                if await editing.rewind(playlistID, to: target) { done() }
                                else { problem = editing.error ?? "Could not rewind. Try again." }
                            }
                        }
                            .keyboardShortcut(.defaultAction).disabled(editing.busy)
                    }
                } else { Text("This moment is no longer available."); Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction) }
            }.padding(24)
        }.interactiveDismissDisabled(editing.busy)
    }
    private func titles(_ ids: [String]) -> String { ids.isEmpty ? "None" : ids.map { library.row($0).title }.joined(separator: "\n") }
}
#endif
