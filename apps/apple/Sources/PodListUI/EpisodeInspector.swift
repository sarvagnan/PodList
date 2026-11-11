#if os(macOS)
import SwiftUI

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
    let selectedIDs: [String]
    let playlistPresentation: PlaylistPresentation
    var body: some SwiftUI.View {
        if let row {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ArtworkView(url: row.artworkURL, title: row.podcast, size: 180)
                        .frame(maxWidth: .infinity)
                    Text(row.title).font(.title2).bold().fixedSize(horizontal: false, vertical: true)
                    Text(row.podcast).font(.headline).foregroundStyle(.secondary)
                    if let episode = row.episode {
                        VStack(alignment: .leading, spacing: 8) {
                            LabeledContent("Published", value: row.publishedDate.formatted(date: .abbreviated, time: .omitted))
                            LabeledContent("Length", value: row.durationText)
                            LabeledContent("State", value: row.stateText)
                            DownloadActions(id: row.id, app: app)
                            if let editing = app.editing {
                                let ids = selectedIDs.isEmpty ? [row.id] : selectedIDs
                                if ids.count > 1 { Text("Actions apply to \(ids.count) selected Episodes").font(.caption) }
                                Button("Play Now", systemImage: "play.fill") { Task { await editing.add(ids, placement: .now) } }.buttonStyle(.borderedProminent)
                                Button("Add to a Playlist…", systemImage: "plus") { playlistPresentation.sheet = .add(ids, false) }
                                let starred = ids.allSatisfy { library.state.episodeStates[$0]?.starred == true }
                                Button(starred ? "Unstar" : "Star", systemImage: starred ? "star.fill" : "star") { Task { await editing.setStar(ids, starred: !starred) } }
                                let played = ids.allSatisfy { library.state.episodeStates[$0]?.played != nil }
                                Button(played ? "Mark Unplayed" : "Mark Played", systemImage: "checkmark") { Task { await editing.markPlayed(ids, played: !played) } }
                            }
                            if let position = row.position { LabeledContent("Position", value: Presentation.time(position)) }
                        }.font(.subheadline).disabled(app.editing?.busy == true)
                        Divider()
                        Text("In your Playlists").font(.headline)
                        let memberships = library.memberships(row.id)
                        if memberships.isEmpty { Text("No Playlists").foregroundStyle(.secondary) }
                        ForEach(Array(memberships.enumerated()), id: \.offset) { _, membership in
                            LabeledContent(membership.name, value: Presentation.time(membership.position))
                        }
                        Divider()
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
        } else {
            ContentUnavailableView("Select an Episode", systemImage: "info.circle", description: Text("Its details and Playlists appear here."))
        }
    }
}

#endif
