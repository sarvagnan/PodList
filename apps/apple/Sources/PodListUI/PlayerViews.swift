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
                    FailureFeedback(message: error, onGlass: true, retryTitle: "Retry Playback") { controller.play() }.macContentFont(.caption).padding(.bottom, 8)
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
            Text(value.title).macContentFont(.headline).lineLimit(textScale > 1 ? 2 : 1).help(Presentation.tooltip(value.title)).frame(maxWidth: .infinity)
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
            }.help(controller.wantsPlayback ? "Pause (Space in Library)" : "Play (Space in Library)")
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
                                .help(Presentation.tooltip(chapter.title))
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
    var menuBar = false
    var body: some SwiftUI.View {
        Menu(menuBar ? "Playback Speed" : "Speed \((controller?.display?.speed ?? 1).formatted())×") {
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
    var menuBar = false
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
        Menu(menuBar ? "Sleep Timer" : label) {
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
            .closesOnEscape(done)
            .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [.done: done]))
            .focusedSceneValue(\.podListNowPlayingEpisode, controller.display.map { NowPlayingEpisodeContext(id: detailID ?? $0.episodeID, library: app.library ?? library, presentation: presentation) })
            .focusedSceneValue(\.podListEpisodeDetails, controller.display.map { value in { detailID = value.episodeID } })
            .focusedSceneValue(\.podListPlayerActions, MenuActionContext(actions: [
                .backToNowPlaying: detailID != nil ? { detailID = nil } : nil,
                .retryPlayback: controller.error != nil ? { controller.play() } : nil
            ].compactMapValues { $0 }))
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
            HStack { Text("Now Playing").macContentFont(.title2).bold(); Spacer() }
                .padding(.horizontal, 28).padding(.top, 20)
            if let detailID, let current = app.library {
                ScrollView {
                    VStack(spacing: 12) {
                        Button("Back to Now Playing", systemImage: "chevron.left") { self.detailID = nil }
                        EpisodeInspector(row: current.row(detailID), library: current, app: app, playlistPresentation: presentation,
                                         startedPlayback: { self.detailID = nil }, scrolls: false)
                    }.frame(maxWidth: .infinity)
                }
            } else if let value = controller.display {
                // These controls determine the window's minimum content height.
                // Only the optional chapter list and Episode details may scroll.
                playbackControls(value)
                    .fixedSize(horizontal: false, vertical: true)
                if !value.chapters.isEmpty {
                    ScrollView { chapters(value).padding(.horizontal, 28) }
                        .scrollBounceBehavior(.basedOnSize)
                } else { Spacer(minLength: 0) }
            } else {
                PodListEmptyState("No Current Entry", systemImage: "music.note")
            }
        }
    }
    private func playbackControls(_ value: PlaybackDisplay) -> some SwiftUI.View {
        VStack(spacing: 20) {
            ArtworkView(url: value.artwork, title: value.podcast, size: 160)
            Text(value.title).macContentFont(.title).multilineTextAlignment(.center).textSelection(.enabled)
            Text(value.podcast).macContentFont(.headline).foregroundStyle(.primary)
                .multilineTextAlignment(.center)
            if let chapter = value.chapter { Text(chapter.title).macContentFont(.headline) }
            PlayerSeek(controller: controller)
            TransportControls(controller: controller).controlSize(.large)
                .padding(12).macGlassSurface()
            HStack { SpeedMenu(controller: controller); SleepMenu(controller: controller) }
            if let error = controller.error { FailureFeedback(message: error, retryTitle: "Retry Playback") { controller.play() } }
            Button("Episode Details", systemImage: "info.circle") { detailID = value.episodeID }
            Button("Open Active Playlist", systemImage: "music.note.list", action: openPlaylist)
            if !value.chapters.isEmpty {
                HStack {
                    Button("Previous Chapter", systemImage: "backward.end") { controller.chapter(-1) }
                    Button("Next Chapter", systemImage: "forward.end") { controller.chapter(1) }
                }
            }
        }.padding(28)
    }
    private func chapters(_ value: PlaybackDisplay) -> some SwiftUI.View {
        VStack {
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
    }
}
/// Each playback window owns its seek dialog; the focused menu never opens a
/// sheet in another Library window.
struct PlaybackSeekHost: ViewModifier {
    let app: ApplicationModel
    @State private var presented = false
    func body(content: Content) -> some SwiftUI.View {
        content
            .focusedSceneValue(\.podListSeek, app.playback?.display?.duration.map { $0 > 0 } == true ? { presented = true } : nil)
            .sheet(isPresented: $presented) {
                if let controller = app.playback { PlaybackSeekSheet(controller: controller) }
            }
    }
}
private struct PlaybackSeekSheet: SwiftUI.View {
    @Bindable var controller: PlaybackController
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var locale
    @State private var seconds = ""
    @State private var episodeID: String?
    @State private var validation = FormValidationVisibility()
    private var position: Double? {
        guard episodeID == controller.display?.episodeID else { return nil }
        return FormNumbers.seekPosition(seconds, duration: controller.display?.duration, locale: locale)
    }
    var body: some SwiftUI.View {
        PodListSheet(title: "Go to Time", width: 420, actionTitle: "Go", actionEnabled: position != nil,
                     cancel: { dismiss() }, action: go) {
            VStack(alignment: .leading, spacing: 16) {
                LabeledContent("Position (seconds)") {
                    VStack(alignment: .leading, spacing: 4) {
                        TextField("Position in seconds", text: Binding(get: { seconds }, set: { text in
                            validation.edited(from: seconds, to: text); seconds = text
                        })).labelsHidden().onSubmit { go() }
                        if let message = validation.message(FormNumbers.seekProblem(seconds, duration: controller.display?.duration, locale: locale)) {
                            Text(message).macContentFont(.caption).foregroundStyle(Color.podListError)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
        }
        .onAppear { episodeID = controller.display?.episodeID }
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .cancel: { dismiss() }, .go: position == nil ? nil : { go() }
        ].compactMapValues { $0 }))
    }
    private func go() { guard let position else { return }; controller.seek(position); dismiss() }
}
#endif
