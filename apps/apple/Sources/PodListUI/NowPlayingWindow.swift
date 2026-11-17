#if os(macOS)
import AppKit
import SwiftUI

/// Playback is app-wide. Library actions belong to the most recently used Library window.
@MainActor
final class NowPlayingLibraryNavigation {
    enum Request {
        case playlist(String)
        case link(PodListLink)
        case podcast(String)
        case add([String], preferNew: Bool)
    }
    private weak var window: WindowModel?
    private weak var presentation: PlaylistPresentation?
    private var activate: (() -> Bool)?
    private var pending: Request?
    private var openLink: ((PodListLink) -> Void)?
    private var openPodcast: ((String) -> Void)?

    func attach(window: WindowModel, presentation: PlaylistPresentation, activate: @escaping () -> Bool, openPodcast: ((String) -> Void)? = nil, openLink: ((PodListLink) -> Void)? = nil) {
        self.window = window; self.presentation = presentation; self.activate = activate; self.openPodcast = openPodcast; self.openLink = openLink
        if let pending {
            self.pending = nil
            _ = perform(pending)
        }
    }

    /// False asks the caller to reopen Library; the new window consumes the pending action.
    @discardableResult func perform(_ request: Request) -> Bool {
        guard let window, let presentation, activate?() == true else {
            pending = request
            return false
        }
        switch request {
        case let .link(link): openLink?(link)
        case let .playlist(id): window.navigate(to: .playlist(id))
        case let .podcast(feed): openPodcast?(feed)
        case let .add(ids, preferNew): presentation.sheet = .add(ids, preferNew)
        }
        return true
    }
}

/// Track Library focus without retaining a closed NSWindow or its browsing state.
struct NowPlayingLibraryHost: NSViewRepresentable {
    let navigation: NowPlayingLibraryNavigation
    let model: WindowModel
    let presentation: PlaylistPresentation
    var openPodcast: ((String) -> Void)? = nil
    var openLink: ((PodListLink) -> Void)? = nil

    func makeNSView(context: Context) -> HostView { HostView(host: self) }
    func updateNSView(_ view: HostView, context: Context) { view.host = self }

    final class HostView: NSView {
        var host: NowPlayingLibraryHost
        private var observer: NSObjectProtocol?
        init(host: NowPlayingLibraryHost) { self.host = host; super.init(frame: .zero) }
        required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            if let observer { NotificationCenter.default.removeObserver(observer) }
            guard let window else { return }
            observer = NotificationCenter.default.addObserver(forName: NSWindow.didBecomeKeyNotification, object: window, queue: .main) { [weak self] _ in
                Task { @MainActor in self?.attach() }
            }
            // SwiftUI can attach the view before ordering the window on screen.
            Task { @MainActor [weak self] in self?.attach() }
        }
        private func attach() {
            guard let window, window.isVisible else { return }
            host.navigation.attach(window: host.model, presentation: host.presentation, activate: { [weak window] in
                guard let window, window.isVisible else { return false }
                window.makeKeyAndOrderFront(nil)
                return true
            }, openPodcast: host.openPodcast, openLink: host.openLink)
        }
        isolated deinit { if let observer { NotificationCenter.default.removeObserver(observer) } }
    }
}

extension ApplicationModel {
    public func openLibraryLink(_ link: PodListLink, reopen: () -> Void) {
        if !nowPlayingNavigation.perform(.link(link)) { reopen() }
    }
}

public struct NowPlayingWindow: SwiftUI.View {
    @Bindable private var app: ApplicationModel
    @Environment(\.openWindow) private var openWindow
    @Environment(\.dismissWindow) private var dismissWindow

    public init(app: ApplicationModel) { self.app = app }

    public var body: some SwiftUI.View {
        Group {
            if let controller = app.playback, let library = app.library {
                NowPlayingView(controller: controller, library: library, app: app,
                               openPlaylist: { route(.playlist(library.state.activePlaylistId)) },
                               addToPlaylist: { ids, preferNew in route(.add(ids, preferNew: preferNew)) },
                               done: { dismissWindow(id: "now-playing") })
                    .environment(\.podListRecoveryIndexed, true)
            } else {
                ScrollableEmptyState("No Current Entry", systemImage: "music.note", description: "Choose an Episode in Library to begin.")
                    .frame(height: 360).closesOnEscape { dismissWindow(id: "now-playing") }
            }
        }
        .modifier(PlaybackSeekHost(app: app))
        .macContentFont(.body)
        .frame(width: 560)
        .focusedSceneValue(\.podListNowPlaying, { openWindow(id: "now-playing") })
        .focusedSceneValue(\.podListOpenPlaylist, {
            if let library = app.library { route(.playlist(library.state.activePlaylistId)) }
        })
    }

    private func route(_ request: NowPlayingLibraryNavigation.Request) {
        if !app.nowPlayingNavigation.perform(request) { openWindow(id: "library") }
    }
}
#endif
