#if os(macOS)
import SwiftUI
import PodListDomain

struct PlayerBar: SwiftUI.View {
    @Bindable var controller: PlaybackController
    let library: LibraryModel
    let openPlaylist: () -> Void
    let openNowPlaying: () -> Void
    var announcements: FeedbackAnnouncements? = nil
    @Environment(\.macTextScale) private var textScale
    var body: some SwiftUI.View {
        if let value = controller.metadata {
            VStack(spacing: 0) {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 18) { transport(value); middle(value).frame(minWidth: 220 * textScale, maxWidth: .infinity); extras }
                    VStack(spacing: 10) {
                        HStack(spacing: 14) { transport(value); middle(value) }
                        extras.frame(maxWidth: .infinity, alignment: .trailing)
                    }
                }.padding(.horizontal, 18).padding(.vertical, 14).frame(minHeight: 92)
                if let error = controller.error {
                    FailureFeedback(message: error, onGlass: true, announcements: announcements) { controller.play() }.macContentFont(.caption).padding(.bottom, 8)
                }
            }
            .macContentFont(.body)
            .macGlassSurface()
            .padding(8)
            .accessibilityElement(children: .contain).accessibilityLabel("Player")
        }
    }
    private func transport(_ value: PlaybackDisplay.Metadata) -> some SwiftUI.View {
        HStack(spacing: 10) {
            Button(action: openNowPlaying) { ArtworkView(url: value.artwork, title: value.podcast, size: 48) }
                .buttonStyle(.plain).help("Open Now Playing").accessibilityLabel("Open Now Playing")
            TransportControls(controller: controller)
        }
    }
    private func middle(_ value: PlaybackDisplay.Metadata) -> some SwiftUI.View {
        VStack(alignment: .center, spacing: 5) {
            Text(value.title).macContentFont(.headline).lineLimit(textScale > 1 ? 2 : 1).help(value.title).frame(maxWidth: .infinity)
            Text(value.podcast).macContentFont(.caption).foregroundStyle(.primary).lineLimit(textScale > 1 ? 2 : 1).frame(maxWidth: .infinity)
            PlayerSeek(controller: controller)
        }.multilineTextAlignment(.center)
    }
    private var extras: some SwiftUI.View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) { SpeedMenu(controller: controller); SleepMenu(controller: controller) }.macContentFont(.caption)
            Button(action: openPlaylist) {
                VStack(alignment: .leading, spacing: 4) {
                    Label(library.player?.playlistName ?? "Active Playlist", systemImage: "music.note.list").lineLimit(1)
                    Text("\(library.player?.entriesAfter ?? 0) after current").macContentFont(.caption).foregroundStyle(.primary)
                }.frame(maxWidth: 170 * textScale, alignment: .leading)
            }.buttonStyle(.plain).accessibilityLabel("Open Active Playlist").help("Open Active Playlist")
        }
    }
}
struct TransportControls: SwiftUI.View {
    @Bindable var controller: PlaybackController
    var body: some SwiftUI.View {
        HStack(spacing: 14) {
            Button { controller.skip(-15) } label: {
                MacIconLabel(title: "Back 15 seconds", systemImage: "gobackward.15")
            }.help("Back 15 seconds")
            Button { controller.toggle() } label: {
                MacIconLabel(title: controller.wantsPlayback ? "Pause" : "Play", systemImage: controller.wantsPlayback ? "pause.fill" : "play.fill")
            }.help(controller.wantsPlayback ? "Pause" : "Play")
            Button { controller.skip(30) } label: {
                MacIconLabel(title: "Forward 30 seconds", systemImage: "goforward.30")
            }.help("Forward 30 seconds")
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
                        ForEach(value.chapters, id: \.start) { chapter in
                            Rectangle().fill(.secondary).frame(width: 1, height: 4)
                                .offset(x: min(geometry.size.width, max(0, geometry.size.width * chapter.start / duration)))
                                .help(chapter.title)
                        }
                    }.frame(height: value.chapters.isEmpty ? 0 : 4).accessibilityHidden(true)
                }
                Text(value.duration.map { "−" + Presentation.time(max(0, $0 - (scrubbing ? draft : value.position))) } ?? "—").accessibilityHidden(true)
            }.macContentFont(.caption2).foregroundStyle(.primary).monospacedDigit()
        }
    }
}
struct SpeedMenu: SwiftUI.View {
    let controller: PlaybackController?
    var body: some SwiftUI.View {
        Menu("Speed \((controller?.display?.speed ?? 1).formatted())×") {
            Picker("Speed", selection: Binding(get: { controller?.display?.speed ?? 1 }, set: { controller?.setSpeed($0) })) {
                ForEach([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4], id: \.self) { speed in
                    Text("\(speed.formatted())×").tag(speed)
                }
            }.pickerStyle(.inline)
        }.menuStyle(.borderlessButton).fixedSize()
    }
}
struct SleepMenu: SwiftUI.View {
    let controller: PlaybackController?
    private var label: String {
        switch controller?.display?.sleep {
        case .until: "Sleep · Timer"
        case .chapterEnd: "Sleep · End of Chapter"
        case .episodeEnd: "Sleep · End of Episode"
        case nil: "Sleep Off"
        }
    }
    private func choice(_ title: String, selected: Bool, action: @escaping () -> Void) -> some SwiftUI.View {
        Toggle(title, isOn: Binding(get: { selected }, set: { if $0 { action() } }))
    }
    var body: some SwiftUI.View {
        Menu(label) {
            ForEach([5, 10, 15, 30, 45, 60, 90, 120], id: \.self) { minutes in
                choice("\(minutes) minutes", selected: timerSelected(minutes)) { controller?.sleepAfter(minutes: Double(minutes)) }
            }
            choice("End of Chapter", selected: chapterSelected) { controller?.sleepAtChapterEnd() }
                .disabled(controller?.display?.chapters.isEmpty != false)
            choice("End of Episode", selected: controller?.display?.sleep == .episodeEnd) { controller?.setSleep(.episodeEnd) }
            choice("Sleep Off", selected: controller?.display?.sleep == nil) { controller?.setSleep(nil) }
        }.menuStyle(.borderlessButton).fixedSize()
    }
    private func timerSelected(_ minutes: Int) -> Bool {
        guard case .until = controller?.display?.sleep else { return false }
        return controller?.sleepMinutes == Double(minutes)
    }
    private var chapterSelected: Bool { if case .chapterEnd = controller?.display?.sleep { true } else { false } }
}
struct NowPlayingView: SwiftUI.View {
    @Bindable var controller: PlaybackController
    let library: LibraryModel
    let app: ApplicationModel
    let openPlaylist: () -> Void
    let addToPlaylist: ([String], Bool) -> Void
    let done: () -> Void
    @State private var detailID: String?
    @State private var presentation = PlaylistPresentation()
    var body: some SwiftUI.View {
        GlassEffectContainer(spacing: 12) { panel }
            .onChange(of: controller.userPlaybackRevision) { _, _ in detailID = nil }
            .onChange(of: presentation.sheet?.id) { _, _ in
                if case let .add(ids, preferNew) = presentation.sheet {
                    presentation.sheet = nil
                    addToPlaylist(ids, preferNew)
                }
            }
    }
    private var panel: some SwiftUI.View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 12) {
                    HStack { Text("Now Playing").macContentFont(.title2).bold(); Spacer() }
                        .padding(.horizontal, 28).padding(.top, 20)
                    if let detailID, let current = app.library {
                        Button("Back to Now Playing", systemImage: "chevron.left") { self.detailID = nil }
                        EpisodeInspector(row: current.row(detailID), library: current, app: app, playlistPresentation: presentation,
                                         startedPlayback: { self.detailID = nil }, scrolls: false)
                    } else {
                        VStack(spacing: 20) {
                            if let value = controller.display {
                                ArtworkView(url: value.artwork, title: value.podcast, size: 230)
                                Text(value.title).macContentFont(.title).multilineTextAlignment(.center).textSelection(.enabled)
                                Text(value.podcast).macContentFont(.headline).foregroundStyle(.primary)
                                if let chapter = value.chapter { Text(chapter.title).macContentFont(.headline) }
                                PlayerSeek(controller: controller)
                                TransportControls(controller: controller).controlSize(.large)
                                    .padding(12).macGlassSurface()
                                HStack { SpeedMenu(controller: controller); SleepMenu(controller: controller) }
                                if let error = controller.error { FailureFeedback(message: error, announcements: app.announcements) { controller.play() } }
                                Button("Episode Details", systemImage: "info.circle") { detailID = value.episodeID }
                                Button("Open Active Playlist", systemImage: "music.note.list", action: openPlaylist)
                                if !value.chapters.isEmpty {
                                    HStack {
                                        Button("Previous Chapter", systemImage: "backward.end") { controller.chapter(-1) }
                                        Button("Next Chapter", systemImage: "forward.end") { controller.chapter(1) }
                                    }
                                    Divider()
                                    ForEach(value.chapters.enumerated(), id: \.element.start) { index, chapter in
                                        Button { controller.seek(chapter.start) } label: {
                                            HStack {
                                                let current = app.library ?? library
                                                let episode = current.row(value.episodeID).episode
                                                let podcast = current.snapshot.subscriptions.first { $0.id == episode?.subscriptionId }
                                                ArtworkView(url: PlaybackPolicy.artwork(value.chapters, position: chapter.start, episode: episode?.artwork, podcast: podcast?.artwork).flatMap { URL(string: $0.url) }, title: value.podcast, size: 36)
                                                if value.chapterIndex == index { Image(systemName: "speaker.wave.2.fill") }
                                                Text(chapter.title.isEmpty ? "Chapter \(index + 1)" : chapter.title)
                                                Spacer(); Text(Presentation.time(chapter.start)).monospacedDigit()
                                            }.frame(maxWidth: .infinity)
                                        }.buttonStyle(.plain).padding(.vertical, 5)
                                    }
                                }
                            } else { ContentUnavailableView("No Current Entry", systemImage: "music.note") }
                        }.padding(28)
                    }
                }
                .frame(maxWidth: .infinity)
                .fixedSize(horizontal: false, vertical: true)
            }
            .scrollBounceBehavior(.basedOnSize)
            HStack { Spacer(); Button("Done", action: done).keyboardShortcut(.cancelAction) }
                .padding(20).macGlassSurface().padding([.horizontal, .bottom], 12)
        }
    }
}
#endif
