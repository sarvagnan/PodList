#if os(macOS)
import SwiftUI
import PodListDomain

/// Resolved artwork, or the podcast's initials when there is none. Callers pass the podcast title, since
/// Episode artwork falls back to the podcast's.
struct ArtworkView: SwiftUI.View {
    let url: URL?
    let title: String
    let size: CGFloat
    var body: some SwiftUI.View {
        Group {
            if let url, Self.canLoad(url) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                            .frame(width: size, height: size)
                            .clipShape(RoundedRectangle(cornerRadius: min(12, size / 8)))
                    } else {
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .accessibilityLabel("Artwork for \(title)")
    }

    static func canLoad(_ url: URL) -> Bool {
        ["https", "http"].contains(url.scheme?.lowercased() ?? "")
    }

    private var placeholder: some SwiftUI.View {
        ZStack {
            // Composite initials over an opaque base, including in selected rows.
            Color(nsColor: .windowBackgroundColor)
            Color.podListBrand.opacity(0.12)
            Text(Presentation.initials(title)).font(.system(size: size * 0.34, weight: .medium)).foregroundStyle(Color.podListBrand)
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: min(12, size / 8)))
    }
}

enum InspectorLayout {
    static let horizontalInset: CGFloat = 8
    static let notesFont = Font.body.width(.condensed)
}

struct EpisodeInspector: SwiftUI.View {
    @Environment(\.libraryEditOrigin) private var origin
    let row: EpisodeRow?
    let library: LibraryModel
    @Bindable var app: ApplicationModel
    let playlistPresentation: PlaylistPresentation
    var startedPlayback: () -> Void = {}
    var scrolls = true
    var selectedIDs: [String] = []
    var podcastPreview: PodcastEpisodePreview? = nil
    #if PODLIST_UI_TOUR
    var timingKey: String?
    #endif

    var body: some SwiftUI.View {
        if selectedIDs.count > 1 {
            selectionSummary
        } else if let row {
            Group {
                if scrolls {
                    ScrollView {
                        InspectorEpisodeDetail(row: row, library: library, app: app,
                            playlistPresentation: playlistPresentation, startedPlayback: startedPlayback,
                            deferDetails: true, timingKey: inspectorTimingKey)
                            .padding(.vertical, 20).padding(.horizontal, InspectorLayout.horizontalInset)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .id(row.id)
                    .playbackBarScrollClearance()
                } else {
                    InspectorEpisodeDetail(row: row, library: library, app: app,
                        playlistPresentation: playlistPresentation, startedPlayback: startedPlayback,
                        deferDetails: false)
                        .id(row.id).padding(20).frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .macContentFont(.body)
            // One labelled container. Without it, the unscrolled Inspector (inside Now Playing)
            // passed this label to every child, so all its buttons read "Episode Inspector".
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Episode Inspector")
        } else if let podcastPreview {
            let artworkSize: CGFloat = podcastPreview.artworkURL.map(ArtworkView.canLoad) == true ? 180 : 88
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    ArtworkView(url: podcastPreview.artworkURL, title: podcastPreview.podcast, size: artworkSize)
                        .frame(maxWidth: .infinity)
                    Text(podcastPreview.title).macContentFont(.title2).bold().fixedSize(horizontal: false, vertical: true)
                    Text(podcastPreview.podcast).macContentFont(.headline).foregroundStyle(MacReadableSecondaryStyle())
                    VStack(alignment: .leading, spacing: 8) {
                        LabeledContent("Published", value: podcastPreview.published.formatted(date: .abbreviated, time: .omitted))
                        LabeledContent("Length", value: podcastPreview.duration.map(Presentation.time) ?? "—")
                    }.macContentFont(.subheadline).labeledContentStyle(InspectorLabeledContentStyle())
                    Divider()
                    InspectorShowNotes(description: podcastPreview.notes).id(podcastPreview.title)
                }
                .padding(.vertical, 20).padding(.horizontal, InspectorLayout.horizontalInset).frame(maxWidth: .infinity, alignment: .leading)
            }
            .playbackBarScrollClearance()
            .macContentFont(.body)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Episode Inspector")
        } else {
            PodListEmptyState("Select an Episode", systemImage: "info.circle",
                              description: "Its details and Playlists appear here.")
        }
    }

    private var inspectorTimingKey: String? {
        #if PODLIST_UI_TOUR
        timingKey
        #else
        nil
        #endif
    }

    private var selectionSummary: some SwiftUI.View {
        let summary = EpisodeSelectionSummary(ids: selectedIDs, library: library)
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Label(summary.title, systemImage: "square.stack")
                    .macContentFont(.title2).bold()
                LabeledContent("Total length", value: summary.lengthText)
                    .labeledContentStyle(InspectorLabeledContentStyle())
                if let editing = app.editing, summary.allAvailable {
                    Button("Add to a Playlist…", systemImage: "text.line.last.and.arrowtriangle.forward") {
                        playlistPresentation.present(.add(summary.ids, false), from: origin)
                    }
                    let allStarred = summary.ids.allSatisfy { library.state.episodeStates[$0]?.starred == true }
                    Button(allStarred ? "Unstar" : "Star", systemImage: allStarred ? "star.fill" : "star") {
                        EditOrigin.start(origin) { await editing.setStar(summary.ids, starred: !allStarred) }
                    }
                    let allPlayed = summary.ids.allSatisfy { library.state.episodeStates[$0]?.played != nil }
                    Button(allPlayed ? "Mark Unplayed" : "Mark Played", systemImage: "checkmark.circle") {
                        EditOrigin.start(origin) { await editing.markPlayed(summary.ids, played: !allPlayed) }
                    }
                }
            }
            .disabled(app.editing?.busy == true)
            .padding(20).frame(maxWidth: .infinity, alignment: .leading)
        }
        .playbackBarScrollClearance()
        .macContentFont(.body)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Episode selection inspector")
        .accessibilityIdentifier("library.episodeSelectionInspector")
    }
}

private struct InspectorEpisodeDetail: SwiftUI.View {
    @Environment(\.libraryEditOrigin) private var origin
    let row: EpisodeRow
    let library: LibraryModel
    let app: ApplicationModel
    let playlistPresentation: PlaylistPresentation
    let startedPlayback: () -> Void
    let deferDetails: Bool
    var timingKey: String? = nil
    @State private var ready = false

    var body: some SwiftUI.View {
        #if PODLIST_UI_TOUR
        defer {
            if let timingKey { TourResponseTiming.inspectorBodyEvaluated(timingKey) }
        }
        #endif
        return Group {
            if deferDetails {
                LazyVStack(alignment: .leading, spacing: 16) { content }
            } else {
                VStack(alignment: .leading, spacing: 16) { content }
            }
        }
        .background {
            if deferDetails && !ready {
                // Leave one SwiftUI animation tick after the shell's initial layout.
                // Removing this schedule after the tick keeps the inspector idle.
                TimelineView(.animation(minimumInterval: 1.0 / 60)) { tick in
                    Color.clear.onChange(of: tick.date) { _, _ in ready = true }
                }.allowsHitTesting(false).accessibilityHidden(true)
            }
        }
        .task(id: ready) {
            guard !deferDetails || ready else { return }
            await app.resolveEpisodeDetails(row.id)
        }
    }

    @ViewBuilder private var content: some SwiftUI.View {
        InspectorArtwork(row: row, app: app, loadsArtwork: !deferDetails || ready)
            .frame(maxWidth: .infinity)
        Text(row.title).macContentFont(.title2).bold().fixedSize(horizontal: false, vertical: true)
            .accessibilityIdentifier("inspector.episodeTitle")
            #if PODLIST_UI_TOUR
            .tourInspectorResponse(key: timingKey)
            #endif
        Text(row.podcast).macContentFont(.headline).foregroundStyle(MacReadableSecondaryStyle())
        if !deferDetails || ready { details }
    }

    @ViewBuilder private var details: some SwiftUI.View {
        if let episode = row.episode {
            VStack(alignment: .leading, spacing: 8) {
                LabeledContent("Published", value: row.publishedDate.formatted(date: .abbreviated, time: .omitted))
                LabeledContent("Length", value: row.durationText)
                LabeledContent("State", value: row.stateText)
                if let editing = app.editing {
                    InspectorActions(row: row, library: library, app: app, editing: editing,
                                     presentation: playlistPresentation, startedPlayback: startedPlayback)
                }
                DownloadStatusText(id: row.id, app: app)
                if let position = row.position { LabeledContent("Position", value: Presentation.time(position)) }
            }.macContentFont(.subheadline).labeledContentStyle(InspectorLabeledContentStyle()).disabled(app.editing?.busy == true)
            Divider()
            Text("In Your Playlists").macContentFont(.headline)
            let memberships = library.memberships(row.id)
            if memberships.isEmpty { Text("No Playlists").foregroundStyle(MacReadableSecondaryStyle()) }
            ForEach(memberships, id: \.id) { membership in
                let position = Presentation.time(membership.position)
                HStack {
                    LabeledContent(membership.name, value: position)
                        .labeledContentStyle(InspectorLabeledContentStyle())
                    Button {
                        EditOrigin.start(origin) {
                            await EpisodePlaybackAction.resume(episodeID: row.id, playlistID: membership.id, app: app, started: startedPlayback)
                        }
                    } label: { MacIconLabel(title: "Play", systemImage: "play.circle") }
                    .buttonStyle(.borderless).help("Resume in this playlist")
                    .accessibilityLabel("Resume in \(membership.name) at \(position)")
                }
            }
            Divider()
            if !episode.chapters.isEmpty {
                Text("Chapters").macContentFont(.headline)
                ForEach(episode.chapters.enumerated(), id: \.element.start) { index, chapter in
                    HStack {
                        ArtworkView(url: chapter.artwork.flatMap { URL(string: $0.url) } ?? row.artworkURL,
                                    title: row.podcast, size: 40)
                        VStack(alignment: .leading) {
                            Text(chapter.title.isEmpty ? "Chapter \(index + 1)" : chapter.title)
                            Text(Presentation.time(chapter.start)).macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                        }
                        Spacer()
                        Button {
                            EditOrigin.start(origin) {
                                await EpisodePlaybackAction.chapter(chapter.start, episodeID: row.id, app: app, started: startedPlayback)
                            }
                        } label: { MacIconLabel(title: "Play", systemImage: "play.circle") }
                        .buttonStyle(.borderless).help("Play this chapter").accessibilityLabel("Play Chapter \(index + 1): \(chapter.title)")
                    }
                }
                Divider()
            }
            InspectorShowNotes(description: episode.description, font: deferDetails ? InspectorLayout.notesFont : .body)
        } else {
            Text("Episode details will appear when Library sync catches up.").foregroundStyle(MacReadableSecondaryStyle())
        }
    }
}

private struct InspectorArtwork: SwiftUI.View {
    let row: EpisodeRow
    let app: ApplicationModel
    let loadsArtwork: Bool
    @State private var size: CGFloat

    init(row: EpisodeRow, app: ApplicationModel, loadsArtwork: Bool) {
        self.row = row
        self.app = app
        self.loadsArtwork = loadsArtwork
        let canLoad = row.artworkURL.map(ArtworkView.canLoad) == true ||
            row.episode?.chapters.contains(where: { $0.artwork != nil }) == true
        _size = State(initialValue: canLoad ? 180 : 88)
    }

    var body: some SwiftUI.View {
        ArtworkView(url: loadsArtwork ? resolvedArtwork : nil, title: row.podcast, size: size)
    }

    private var resolvedArtwork: URL? {
        guard let chapters = row.episode?.chapters, !chapters.isEmpty else { return row.artworkURL }
        let playback = app.playback?.display
        let position = playback?.episodeID == row.id ? playback?.position ?? 0 : row.position ?? 0
        return PlaybackPolicy.chapterIndex(chapters, position: position)
            .flatMap { chapters[$0].artwork }.flatMap { URL(string: $0.url) } ?? row.artworkURL
    }
}

/// Keep scanning and stripping publisher descriptions off the main actor.
private struct InspectorShowNotes: SwiftUI.View {
    let description: String
    var font = InspectorLayout.notesFont
    @State private var prepared: (description: String, notes: String)?

    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Show Notes").macContentFont(.headline)
            if let prepared, prepared.description == description {
                Text(prepared.notes.isEmpty ? "No show notes" : prepared.notes)
                    .macContentFont(font).lineSpacing(3)
                    .textSelection(.enabled)
            } else {
                ProgressView().controlSize(.small).accessibilityLabel("Preparing Show Notes")
            }
        }
        .task(id: description) {
            let notes = await Self.prepare(description)
            if !Task.isCancelled { prepared = (description, notes) }
        }
    }

    @concurrent private static func prepare(_ description: String) async -> String {
        Presentation.plainShowNotes(description)
    }
}

struct InspectorActions: SwiftUI.View {
    let row: EpisodeRow
    let library: LibraryModel
    @Bindable var app: ApplicationModel
    let editing: PlaylistEditingModel
    let presentation: PlaylistPresentation
    let startedPlayback: () -> Void
    @Environment(\.libraryEditOrigin) private var origin
    private var starred: Bool { library.state.episodeStates[row.id]?.starred == true }
    private var played: Bool { library.state.episodeStates[row.id]?.played != nil }
    private var playing: Bool { app.playback?.display?.episodeID == row.id && app.playback?.wantsPlayback == true }
    var body: some SwiftUI.View {
        GlassEffectContainer(spacing: 8) {
            VStack(spacing: 10) {
                Button {
                    if playing { app.playback?.pause() }
                    else { EditOrigin.start(origin) { if await editing.add([row.id], placement: .now) != nil { startedPlayback() } } }
                } label: {
                    Image(systemName: playing ? "pause.fill" : "play.fill").macContentFont(.body.weight(.semibold))
                        .frame(minWidth: 32, minHeight: 32)
                }.buttonStyle(MacGlassButtonStyle()).buttonBorderShape(.circle).help(playing ? "Pause" : "Play now")
                    .accessibilityLabel(playing ? "Pause \(row.title), playing" : "Play Now: \(row.title), not playing")
                HStack(spacing: 8) {
                    icon("Add to a Playlist", help: "Add to a playlist", symbol: "text.line.last.and.arrowtriangle.forward") { presentation.present(.add([row.id], false), from: origin) }
                    icon(starred ? "Unstar" : "Star", state: starred ? "Starred" : "Not starred", symbol: starred ? "star.fill" : "star") { EditOrigin.start(origin) { await editing.setStar([row.id], starred: !starred) } }
                    icon(played ? "Mark Unplayed" : "Mark Played", help: played ? "Mark unplayed" : "Mark played", state: played ? "Played" : "Unplayed", symbol: played ? "checkmark.circle.fill" : "checkmark.circle") { EditOrigin.start(origin) { await editing.markPlayed([row.id], played: !played) } }
                    DownloadIcon(id: row.id, app: app)
                    if let url = library.episodeShareURL(row.id) {
                        ShareLink(item: url) {
                            MacIconLabel(title: "Share Episode", systemImage: "square.and.arrow.up")
                        }.buttonStyle(.borderless)
                            .help("Share this episode").accessibilityLabel("Share Episode: \(row.title)")
                    }
                }.padding(8).macGlassSurface()
            }.frame(maxWidth: .infinity).foregroundStyle(.primary).tint(.primary).disabled(editing.busy)
        }
    }
    private func icon(_ name: String, help: String? = nil, state: String? = nil, symbol: String, action: @escaping () -> Void) -> some SwiftUI.View {
        Button(action: action) { MacIconLabel(title: name, systemImage: symbol) }
            .buttonStyle(.borderless).help(help ?? name).accessibilityLabel(state.map { "\(name), \($0)" } ?? name)
    }
}

#endif
