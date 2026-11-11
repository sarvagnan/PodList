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
                Text(String(title.prefix(1)).uppercased()).font(.system(size: size * 0.4, weight: .medium)).foregroundStyle(Color.podListAccent)
            }
        }
        .frame(width: size, height: size).clipShape(RoundedRectangle(cornerRadius: min(12, size / 8)))
        .accessibilityLabel("Artwork for \(title)")
    }
}

struct EpisodeInspector: SwiftUI.View {
    let row: EpisodeRow?
    let library: LibraryModel
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
                            LabeledContent("Download", value: "Not downloaded on this Device")
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

struct PlayerBar: SwiftUI.View {
    let player: PlayerPresentation
    let openPlaylist: () -> Void
    var body: some SwiftUI.View {
        VStack(spacing: 0) {
            Divider()
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 18) {
                    transport
                    position.frame(minWidth: 220, maxWidth: .infinity)
                    extras
                }
                VStack(spacing: 10) {
                    HStack(spacing: 14) { transport; position }
                    extras.frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .padding(.horizontal, 18).padding(.vertical, 12)
        }
        .background(.bar)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Player, paused")
    }
    private var transport: some SwiftUI.View {
        HStack(spacing: 10) {
            ArtworkView(url: player.row.artworkURL, title: player.row.title, size: 48)
            playbackButton("Back 15 seconds", symbol: "gobackward.15")
            playbackButton("Play", symbol: "play.fill")
            playbackButton("Forward 30 seconds", symbol: "goforward.30")
        }
    }
    private func playbackButton(_ label: String, symbol: String) -> some SwiftUI.View {
        Button(label, systemImage: symbol) {}.labelStyle(.iconOnly)
            .buttonStyle(.borderless).font(.title3).frame(width: 30, height: 34)
            .disabled(true).help("Playback comes later").accessibilityLabel(label + ", playback comes later")
    }
    private var position: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 3) {
            Text(player.row.podcast).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            Text(player.row.title).font(.headline).lineLimit(1).help(player.row.title)
            Slider(value: .constant(player.fraction), in: 0...1)
                .disabled(true).controlSize(.mini).help("Playback comes later")
                .accessibilityLabel("Position").accessibilityValue("\(player.elapsed) elapsed, \(player.remaining) remaining")
            HStack {
                Text(player.elapsed)
                Spacer()
                Text(player.remaining)
            }.font(.caption2).foregroundStyle(.secondary).monospacedDigit()
        }
    }
    private var extras: some SwiftUI.View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Speed \(player.speed.formatted())×")
                Text("Sleep Off").foregroundStyle(.secondary)
            }.font(.caption).help("Playback comes later")
            Button(action: openPlaylist) {
                VStack(alignment: .leading, spacing: 4) {
                    Label(player.playlistName, systemImage: "music.note.list").lineLimit(1)
                    Text("\(player.entriesAfter) after current").font(.caption).foregroundStyle(.secondary)
                }.frame(maxWidth: 170, alignment: .leading)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open Active Playlist, " + player.queueText)
        }
    }
}
#endif
