#if os(macOS)
import SwiftUI

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
    var body: some SwiftUI.View {
        if let row {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ArtworkView(url: row.artworkURL, title: row.title, size: 180)
                        .frame(maxWidth: .infinity)
                    Text(row.title).font(.title2).bold().fixedSize(horizontal: false, vertical: true)
                    Text(row.podcast).font(.headline).foregroundStyle(.secondary)
                    if let episode = row.episode {
                        VStack(alignment: .leading, spacing: 8) {
                            LabeledContent("Published", value: row.publishedDate.formatted(date: .abbreviated, time: .omitted))
                            LabeledContent("Length", value: row.durationText)
                            LabeledContent("State", value: row.stateText)
                            DownloadActions(id: row.id, app: app)
                            Button("Play Now", systemImage: "play.fill") { app.playback?.playNow(row.id) }.buttonStyle(.borderedProminent)
                            if let position = row.position { LabeledContent("Position", value: Presentation.time(position)) }
                        }.font(.subheadline)
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
