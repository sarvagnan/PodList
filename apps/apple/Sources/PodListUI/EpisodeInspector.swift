#if os(macOS)
import SwiftUI
import PodListDomain

/// Resolved artwork, or the podcast's initials when there is none. Callers pass the podcast title, since
/// Episode artwork falls back to the podcast's.
struct ArtworkView: SwiftUI.View {
    let url: URL?
    let title: String
    let size: CGFloat
    var placeholderSize: CGFloat? = nil
    var body: some SwiftUI.View {
        AsyncImage(url: url.flatMap { ["https", "http"].contains($0.scheme?.lowercased() ?? "") ? $0 : nil }) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(RoundedRectangle(cornerRadius: min(12, size / 8)))
            } else {
                let side = placeholderSize ?? size
                ZStack {
                    // Composite initials over an opaque base, including in selected rows.
                    Color(nsColor: .windowBackgroundColor)
                    Color.podListBrand.opacity(0.12)
                    Text(Presentation.initials(title)).font(.system(size: side * 0.34, weight: .medium)).foregroundStyle(Color.podListBrand)
                }
                .frame(width: side, height: side)
                .clipShape(RoundedRectangle(cornerRadius: min(12, side / 8)))
            }
        }
        .accessibilityLabel("Artwork for \(title)")
    }
}

struct EpisodeInspector: SwiftUI.View {
    let row: EpisodeRow?
    let library: LibraryModel
    @Bindable var app: ApplicationModel
    let playlistPresentation: PlaylistPresentation
    var startedPlayback: () -> Void = {}
    var scrolls = true
    var selectedIDs: [String] = []
    var podcastPreview: PodcastEpisodePreview? = nil
    var body: some SwiftUI.View {
        if selectedIDs.count > 1 {
            selectionSummary
        } else if let row {
            Group {
                if scrolls { ScrollView { details(row) }.playbackBarScrollClearance() }
                else { details(row) }
            }
            .macContentFont(.body)
            // One labelled container. Without it, the unscrolled Inspector (inside Now Playing)
            // passed this label to every child, so all its buttons read "Episode Inspector".
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Episode Inspector")
            .task(id: row.id) { await app.resolveEpisodeDetails(row.id) }
        } else if let podcastPreview {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ArtworkView(url: podcastPreview.artworkURL, title: podcastPreview.podcast, size: 180, placeholderSize: 88)
                        .frame(maxWidth: .infinity)
                    Text(podcastPreview.title).macContentFont(.title2).bold().fixedSize(horizontal: false, vertical: true)
                    Text(podcastPreview.podcast).macContentFont(.headline).foregroundStyle(MacReadableSecondaryStyle())
                    VStack(alignment: .leading, spacing: 8) {
                        LabeledContent("Published", value: podcastPreview.published.formatted(date: .abbreviated, time: .omitted))
                        LabeledContent("Length", value: podcastPreview.duration.map(Presentation.time) ?? "—")
                    }.macContentFont(.subheadline).labeledContentStyle(InspectorLabeledContentStyle())
                    Divider()
                    showNotes(podcastPreview.notes)
                }
                .padding(20).frame(maxWidth: .infinity, alignment: .leading)
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
    private var selectionSummary: some SwiftUI.View {
        let summary = EpisodeSelectionSummary(ids: selectedIDs, library: library)
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Label(summary.title, systemImage: "square.stack")
                    .macContentFont(.title2).bold()
                LabeledContent("Total Length", value: summary.lengthText)
                    .labeledContentStyle(InspectorLabeledContentStyle())
                if let editing = app.editing, summary.allAvailable {
                    Button("Add to a Playlist…", systemImage: "text.line.last.and.arrowtriangle.forward") {
                        playlistPresentation.sheet = .add(summary.ids, false)
                    }
                    let allStarred = summary.ids.allSatisfy { library.state.episodeStates[$0]?.starred == true }
                    Button(allStarred ? "Unstar" : "Star", systemImage: allStarred ? "star.fill" : "star") {
                        Task { await editing.setStar(summary.ids, starred: !allStarred) }
                    }
                    let allPlayed = summary.ids.allSatisfy { library.state.episodeStates[$0]?.played != nil }
                    Button(allPlayed ? "Mark Unplayed" : "Mark Played", systemImage: "checkmark.circle") {
                        Task { await editing.markPlayed(summary.ids, played: !allPlayed) }
                    }
                }
            }
            .disabled(app.editing?.busy == true)
            .padding(20).frame(maxWidth: .infinity, alignment: .leading)
        }
        .playbackBarScrollClearance()
        .macContentFont(.body)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Episode selection Inspector")
    }
    private func details(_ row: EpisodeRow) -> some SwiftUI.View {
        VStack(alignment: .leading, spacing: 16) {
            ArtworkView(url: resolvedArtwork(row), title: row.podcast, size: 180, placeholderSize: 88)
                .frame(maxWidth: .infinity)
            Text(row.title).macContentFont(.title2).bold().fixedSize(horizontal: false, vertical: true)
            Text(row.podcast).macContentFont(.headline).foregroundStyle(MacReadableSecondaryStyle())
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
                Text("In your Playlists").macContentFont(.headline)
                let memberships = library.memberships(row.id)
                if memberships.isEmpty { Text("No Playlists").foregroundStyle(MacReadableSecondaryStyle()) }
                ForEach(memberships, id: \.id) { membership in
                    HStack {
                        LabeledContent(membership.name, value: Presentation.time(membership.position))
                            .labeledContentStyle(InspectorLabeledContentStyle())
                        Button {
                            Task {
                                await EpisodePlaybackAction.resume(episodeID: row.id, playlistID: membership.id, app: app, started: startedPlayback)
                            }
                        } label: { MacIconLabel(title: "Play", systemImage: "play.circle") }
                        .buttonStyle(.borderless).help("Resume in this Playlist")
                        .accessibilityLabel("Resume in \(membership.name) at \(Presentation.time(membership.position))")
                    }
                }
                Divider()
                if !episode.chapters.isEmpty {
                    Text("Chapters").macContentFont(.headline)
                    ForEach(episode.chapters.enumerated(), id: \.element.start) { index, chapter in
                        HStack {
                            ArtworkView(url: PlaybackPolicy.artwork(episode.chapters, position: chapter.start, episode: episode.artwork,
                                podcast: library.snapshot.subscriptions.first { $0.id == episode.subscriptionId }?.artwork).flatMap { URL(string: $0.url) }, title: row.podcast, size: 40)
                            VStack(alignment: .leading) {
                                Text(chapter.title.isEmpty ? "Chapter \(index + 1)" : chapter.title)
                                Text(Presentation.time(chapter.start)).macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                            }
                            Spacer()
                            Button {
                                Task {
                                    await EpisodePlaybackAction.chapter(chapter.start, episodeID: row.id, app: app, started: startedPlayback)
                                }
                            } label: { MacIconLabel(title: "Play", systemImage: "play.circle") }
                            .buttonStyle(.borderless).help("Play Chapter").accessibilityLabel("Play Chapter \(index + 1): \(chapter.title)")
                        }
                    }
                    Divider()
                }
                showNotes(episode.description)
            } else {
                Text("Episode details will appear when Library sync catches up.").foregroundStyle(MacReadableSecondaryStyle())
            }
        }
        .padding(20).frame(maxWidth: .infinity, alignment: .leading)
    }
    @ViewBuilder private func showNotes(_ description: String) -> some SwiftUI.View {
        Text("Show Notes").macContentFont(.headline)
        let notes = Presentation.plainShowNotes(description)
        Text(notes.isEmpty ? "No show notes" : notes).textSelection(.enabled)
    }
    private func resolvedArtwork(_ row: EpisodeRow) -> URL? {
        guard let episode = row.episode else { return row.artworkURL }
        let position = app.playback?.display?.episodeID == row.id ? app.playback?.display?.position ?? 0 : row.position ?? 0
        return PlaybackPolicy.artwork(episode.chapters, position: position, episode: episode.artwork,
            podcast: library.snapshot.subscriptions.first { $0.id == episode.subscriptionId }?.artwork).flatMap { URL(string: $0.url) }
    }
}

struct InspectorActions: SwiftUI.View {
    let row: EpisodeRow
    let library: LibraryModel
    @Bindable var app: ApplicationModel
    let editing: PlaylistEditingModel
    let presentation: PlaylistPresentation
    let startedPlayback: () -> Void
    private var starred: Bool { library.state.episodeStates[row.id]?.starred == true }
    private var played: Bool { library.state.episodeStates[row.id]?.played != nil }
    private var playing: Bool { app.playback?.display?.episodeID == row.id && app.playback?.wantsPlayback == true }
    var body: some SwiftUI.View {
        GlassEffectContainer(spacing: 8) {
            VStack(spacing: 10) {
                Button {
                    if playing { app.playback?.pause() }
                    else { Task { if await editing.add([row.id], placement: .now) != nil { startedPlayback() } } }
                } label: {
                    Image(systemName: playing ? "pause.fill" : "play.fill").macContentFont(.body.weight(.semibold))
                        .frame(minWidth: 32, minHeight: 32)
                }.buttonStyle(MacGlassButtonStyle()).buttonBorderShape(.circle).help(playing ? "Pause (playing)" : "Play now (not playing)")
                    .accessibilityLabel(playing ? "Pause \(row.title), playing" : "Play Now: \(row.title), not playing")
                HStack(spacing: 8) {
                    icon("Add to a Playlist", symbol: "text.line.last.and.arrowtriangle.forward") { presentation.sheet = .add([row.id], false) }
                    icon(starred ? "Unstar" : "Star", state: starred ? "Starred" : "Not starred", symbol: starred ? "star.fill" : "star") { Task { await editing.setStar([row.id], starred: !starred) } }
                    icon(played ? "Mark Unplayed" : "Mark Played", state: played ? "Played" : "Unplayed", symbol: played ? "checkmark.circle.fill" : "checkmark.circle") { Task { await editing.markPlayed([row.id], played: !played) } }
                    DownloadIcon(id: row.id, app: app)
                    if let url = library.episodeShareURL(row.id) {
                        ShareLink(item: url) {
                            MacIconLabel(title: "Share Episode", systemImage: "square.and.arrow.up")
                        }.buttonStyle(.borderless)
                            .help("Share Episode").accessibilityLabel("Share Episode: \(row.title)")
                    }
                }.padding(8).macGlassSurface()
            }.frame(maxWidth: .infinity).foregroundStyle(.primary).tint(.primary).disabled(editing.busy)
        }
    }
    private func icon(_ name: String, state: String? = nil, symbol: String, action: @escaping () -> Void) -> some SwiftUI.View {
        Button(action: action) { MacIconLabel(title: name, systemImage: symbol) }
            .buttonStyle(.borderless).help(state.map { "\(name), \($0)" } ?? name).accessibilityLabel(state.map { "\(name), \($0)" } ?? name)
    }
}

#endif
