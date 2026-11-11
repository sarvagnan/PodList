#if os(macOS)
import SwiftUI
import PodListDomain

struct PlayerBar: SwiftUI.View {
    @Bindable var controller: PlaybackController
    let library: LibraryModel
    let openPlaylist: () -> Void
    let openNowPlaying: () -> Void
    var body: some SwiftUI.View {
        if let value = controller.display {
            VStack(spacing: 0) {
                Divider()
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 18) { transport(value); middle(value).frame(minWidth: 220, maxWidth: .infinity); extras }
                    VStack(spacing: 10) {
                        HStack(spacing: 14) { transport(value); middle(value) }
                        extras.frame(maxWidth: .infinity, alignment: .trailing)
                    }
                }.padding(.horizontal, 18).padding(.vertical, 14).frame(minHeight: 92)
                if let error = controller.error {
                    HStack { Text(error); Button("Retry") { controller.play() } }.font(.caption).padding(.bottom, 8)
                }
            }.background(.bar).accessibilityLabel("Player")
        }
    }
    private func transport(_ value: PlaybackDisplay) -> some SwiftUI.View {
        HStack(spacing: 10) {
            Button(action: openNowPlaying) { ArtworkView(url: value.artwork, title: value.podcast, size: 48) }
                .buttonStyle(.plain).help("Open Now Playing").accessibilityLabel("Open Now Playing")
            TransportControls(controller: controller)
        }
    }
    private func middle(_ value: PlaybackDisplay) -> some SwiftUI.View {
        VStack(alignment: .center, spacing: 5) {
            Text(value.title).font(.headline).lineLimit(1).help(value.title).frame(maxWidth: .infinity)
            Text(value.podcast).font(.caption).foregroundStyle(.secondary).lineLimit(1).frame(maxWidth: .infinity)
            PlayerSeek(controller: controller)
        }.multilineTextAlignment(.center)
    }
    private var extras: some SwiftUI.View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) { SpeedMenu(controller: controller); SleepMenu(controller: controller) }.font(.caption)
            Button(action: openPlaylist) {
                VStack(alignment: .leading, spacing: 4) {
                    Label(library.player?.playlistName ?? "Active Playlist", systemImage: "music.note.list").lineLimit(1)
                    Text("\(library.player?.entriesAfter ?? 0) after current").font(.caption).foregroundStyle(.secondary)
                }.frame(maxWidth: 170, alignment: .leading)
            }.buttonStyle(.plain).accessibilityLabel("Open Active Playlist")
        }
    }
}
struct TransportControls: SwiftUI.View {
    @Bindable var controller: PlaybackController
    var body: some SwiftUI.View {
        HStack(spacing: 14) {
            Button("Back 15 seconds", systemImage: "gobackward.15") { controller.skip(-15) }
            Button(controller.wantsPlayback ? "Pause" : "Play", systemImage: controller.wantsPlayback ? "pause.fill" : "play.fill") { controller.toggle() }
            Button("Forward 30 seconds", systemImage: "goforward.30") { controller.skip(30) }
        }.labelStyle(.iconOnly).buttonStyle(.borderless).font(.title3)
    }
}
struct PlayerSeek: SwiftUI.View {
    @Bindable var controller: PlaybackController
    @State private var scrubbing = false
    @State private var draft = 0.0
    var body: some SwiftUI.View {
        if let value = controller.display {
            let duration = max(1, value.duration ?? 1)
            HStack(spacing: 10) {
                Text(Presentation.time(scrubbing ? draft : value.position)).accessibilityHidden(true)
                VStack(spacing: 0) {
                    Slider(value: Binding(get: { scrubbing ? draft : min(duration, value.position) }, set: { draft = $0; scrubbing = true }), in: 0...duration) { editing in
                        if editing { draft = value.position; scrubbing = true }
                        else { controller.seek(draft); scrubbing = false }
                    }.controlSize(.mini).disabled(value.duration == nil)
                    .accessibilityLabel("Position").accessibilityValue(Presentation.time(value.position))
                    GeometryReader { geometry in
                        ForEach(Array(value.chapters.enumerated()), id: \.offset) { _, chapter in
                            Rectangle().fill(.secondary).frame(width: 1, height: 4)
                                .offset(x: min(geometry.size.width, max(0, geometry.size.width * chapter.start / duration)))
                                .help(chapter.title)
                        }
                    }.frame(height: value.chapters.isEmpty ? 0 : 4).accessibilityHidden(true)
                }
                Text(value.duration.map { "−" + Presentation.time(max(0, $0 - (scrubbing ? draft : value.position))) } ?? "—").accessibilityHidden(true)
            }.font(.caption2).foregroundStyle(.secondary).monospacedDigit()
        }
    }
}
struct SpeedMenu: SwiftUI.View {
    @Bindable var controller: PlaybackController
    var body: some SwiftUI.View {
        Menu("Speed \((controller.display?.speed ?? 1).formatted())×") {
            ForEach([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4], id: \.self) { speed in
                Button("\(speed.formatted())×") { controller.setSpeed(speed) }
            }
        }.menuStyle(.borderlessButton).fixedSize()
    }
}
struct SleepMenu: SwiftUI.View {
    @Bindable var controller: PlaybackController
    private var label: String {
        switch controller.display?.sleep {
        case .until: "Sleep · Timer"
        case .chapterEnd: "Sleep · End of Chapter"
        case .episodeEnd: "Sleep · End of Episode"
        case nil: "Sleep Off"
        }
    }
    var body: some SwiftUI.View {
        Menu(label) {
            ForEach([5, 10, 15, 30, 45, 60, 90, 120], id: \.self) { minutes in
                Button("\(minutes) minutes") { controller.sleepAfter(minutes: Double(minutes)) }
            }
            if controller.display?.chapters.isEmpty == false { Button("End of Chapter") { controller.sleepAtChapterEnd() } }
            Button("End of Episode") { controller.setSleep(.episodeEnd) }
            Button("Cancel Sleep") { controller.setSleep(nil) }.disabled(controller.display?.sleep == nil)
        }.menuStyle(.borderlessButton).fixedSize()
    }
}
struct NowPlayingView: SwiftUI.View {
    @Bindable var controller: PlaybackController
    let library: LibraryModel
    let openPlaylist: () -> Void
    @Environment(\.dismiss) private var dismiss
    var body: some SwiftUI.View {
        ScrollView {
            VStack(spacing: 20) {
                HStack { Text("Now Playing").font(.title2).bold(); Spacer(); Button("Done") { dismiss() }.keyboardShortcut(.cancelAction) }
                if let value = controller.display {
                    ArtworkView(url: value.artwork, title: value.podcast, size: 230)
                    Text(value.title).font(.title).multilineTextAlignment(.center).textSelection(.enabled)
                    Text(value.podcast).font(.headline).foregroundStyle(.secondary)
                    if let chapter = value.chapter { Text(chapter.title).font(.headline) }
                    PlayerSeek(controller: controller)
                    TransportControls(controller: controller).controlSize(.large)
                    HStack { SpeedMenu(controller: controller); SleepMenu(controller: controller) }
                    if let error = controller.error { Text(error); Button("Retry") { controller.play() } }
                    Button("Open Active Playlist", systemImage: "music.note.list", action: openPlaylist)
                    if !value.chapters.isEmpty {
                        HStack {
                            Button("Previous Chapter", systemImage: "backward.end") { controller.chapter(-1) }
                            Button("Next Chapter", systemImage: "forward.end") { controller.chapter(1) }
                        }
                        Divider()
                        ForEach(Array(value.chapters.enumerated()), id: \.offset) { index, chapter in
                            Button { controller.seek(chapter.start) } label: {
                                HStack {
                                    if value.chapterIndex == index { Image(systemName: "speaker.wave.2.fill") }
                                    Text(chapter.title.isEmpty ? "Chapter \(index + 1)" : chapter.title)
                                    Spacer(); Text(Presentation.time(chapter.start)).monospacedDigit()
                                }.frame(maxWidth: .infinity)
                            }.buttonStyle(.plain).padding(.vertical, 5)
                        }
                    }
                } else { ContentUnavailableView("No current Entry", systemImage: "music.note") }
            }.padding(28)
        }.frame(width: 560, height: 700)
    }
}
#endif
