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
        AsyncImage(url: url.flatMap { ["https", "http"].contains($0.scheme?.lowercased() ?? "") ? $0 : nil }) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            ZStack {
                Color.podListAccent.opacity(0.12)
                Text(Presentation.initials(title)).font(.system(size: size * 0.34, weight: .medium)).foregroundStyle(Color.podListAccent)
            }
        }
        .frame(width: size, height: size).clipShape(RoundedRectangle(cornerRadius: min(12, size / 8)))
        .accessibilityLabel("Artwork for \(title)")
    }
}

struct EpisodeInspector: SwiftUI.View {
    let row: EpisodeRow?
    let library: LibraryModel
    @Bindable var app: ApplicationModel
    let playlistPresentation: PlaylistPresentation
    var startedPlayback: () -> Void = {}
    var body: some SwiftUI.View {
        if let row {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ArtworkView(url: resolvedArtwork(row), title: row.podcast, size: 180)
                        .frame(maxWidth: .infinity)
                    Text(row.title).font(.title2).bold().fixedSize(horizontal: false, vertical: true)
                    Text(row.podcast).font(.headline).foregroundStyle(.secondary)
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
                        }.font(.subheadline).disabled(app.editing?.busy == true)
                        Divider()
                        Text("In your Playlists").font(.headline)
                        let memberships = library.memberships(row.id)
                        if memberships.isEmpty { Text("No Playlists").foregroundStyle(.secondary) }
                        ForEach(Array(memberships.enumerated()), id: \.offset) { _, membership in
                            HStack {
                                LabeledContent(membership.name, value: Presentation.time(membership.position))
                                Button {
                                    Task {
                                        await app.editing?.playFromHere(playlistID: membership.id, episodeID: row.id)
                                        if app.editing?.error == nil { startedPlayback() }
                                    }
                                } label: { Image(systemName: "play.circle").frame(width: 28, height: 28) }
                                .buttonStyle(.borderless).help("Resume in \(membership.name)")
                                .accessibilityLabel("Resume in \(membership.name) at \(Presentation.time(membership.position))")
                            }
                        }
                        Divider()
                        if !episode.chapters.isEmpty {
                            Text("Chapters").font(.headline)
                            ForEach(Array(episode.chapters.enumerated()), id: \.offset) { index, chapter in
                                HStack {
                                    ArtworkView(url: PlaybackPolicy.artwork(episode.chapters, position: chapter.start, episode: episode.artwork,
                                        podcast: library.snapshot.subscriptions.first { $0.id == episode.subscriptionId }?.artwork).flatMap { URL(string: $0.url) }, title: row.podcast, size: 40)
                                    VStack(alignment: .leading) {
                                        Text(chapter.title.isEmpty ? "Chapter \(index + 1)" : chapter.title)
                                        Text(Presentation.time(chapter.start)).font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Button {
                                        Task {
                                            guard await app.editing?.add([row.id], placement: .now) != nil else { return }
                                            app.playback?.seek(chapter.start); startedPlayback()
                                        }
                                    } label: { Image(systemName: "play.circle").frame(width: 28, height: 28) }
                                    .buttonStyle(.borderless).help("Play \(chapter.title)").accessibilityLabel("Play Chapter \(index + 1): \(chapter.title)")
                                }
                            }
                            Divider()
                        }
                        Text("Show notes").font(.headline)
                        let notes = Presentation.plainShowNotes(episode.description)
                        Text(notes.isEmpty ? "No show notes" : notes).textSelection(.enabled)
                    } else {
                        Text("Episode details will appear when Library sync catches up.").foregroundStyle(.secondary)
                    }
                }
                .padding(20).frame(maxWidth: .infinity, alignment: .leading)
            }
            .accessibilityLabel("Episode Inspector")
            .task(id: row.id) { await app.resolveEpisodeDetails(row.id) }
        } else {
            ContentUnavailableView("Select an Episode", systemImage: "info.circle", description: Text("Its details and Playlists appear here."))
        }
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
        VStack(spacing: 10) {
            Button {
                if playing { app.playback?.pause() }
                else { Task { if await editing.add([row.id], placement: .now) != nil { startedPlayback() } } }
            } label: {
                Image(systemName: playing ? "pause.fill" : "play.fill").font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(.white).frame(width: 44, height: 44).background(Color.podListAccent, in: Circle())
            }.buttonStyle(.plain).help(playing ? "Pause (playing)" : "Play Now (not playing)")
                .accessibilityLabel(playing ? "Pause \(row.title), playing" : "Play Now: \(row.title), not playing")
            HStack(spacing: 8) {
                icon("Add to a Playlist", symbol: "plus") { presentation.sheet = .add([row.id], false) }
                icon(starred ? "Unstar" : "Star", state: starred ? "Starred" : "Not starred", symbol: starred ? "star.fill" : "star") { Task { await editing.setStar([row.id], starred: !starred) } }
                icon(played ? "Mark Unplayed" : "Mark Played", state: played ? "Played" : "Unplayed", symbol: played ? "checkmark.circle.fill" : "checkmark.circle") { Task { await editing.markPlayed([row.id], played: !played) } }
                DownloadIcon(id: row.id, app: app)
                Menu {
                    if let url = library.episodeShareURL(row.id) {
                        ShareLink(item: url) { Text("Share Episode…") }
                        Button("Copy Link") { ShareLinks.copy(url) }
                    }
                } label: { Image(systemName: "square.and.arrow.up").frame(width: 28, height: 28) }
                .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
                .help("Share Episode or Copy Link").accessibilityLabel("Share Episode: \(row.title)")
                .disabled(library.episodeShareURL(row.id) == nil)
            }
        }.frame(maxWidth: .infinity).disabled(editing.busy)
    }
    private func icon(_ name: String, state: String? = nil, symbol: String, action: @escaping () -> Void) -> some SwiftUI.View {
        Button(action: action) { Image(systemName: symbol).frame(width: 28, height: 28) }
            .buttonStyle(.borderless).help(state.map { "\(name), \($0)" } ?? name).accessibilityLabel(state.map { "\(name), \($0)" } ?? name)
    }
}

#endif
